from api.reddit_fetch import get_access_token, search_subreddit, get_post_content
import time
import asyncio
import json
from api.ai_analysis import analyze_reddit_content


async def process_reddit_query(subreddit, keyword, question, limit, repeatHours, repeatMinutes, progress_callback=None):
    """
    Main function that orchestrates the workflow:
    1. Fetch relevant Reddit posts
    2. Get comments for those posts and send each comment as it's processed
    3. Analyze the content with OpenAI
    
    Args:
        subreddit: The subreddit to search (e.g., "UofT")
        keyword: The search keyword (e.g., "bird course")
        question: The specific question to analyze (e.g., "What are the easiest bird courses at UofT?")
        progress_callback: An async function to call with status updates and comments
        
    Returns:
        Analysis results or error message
    """
    # Step 1: Search for relevant posts
    async def send_progress_message(message):
        print(message)  # Always print to console for debugging
        if progress_callback:
            await progress_callback(message)
            
    async def send_comment_data(post_info, comment_data):
        """Send a single comment to the frontend as it's processed"""
        if progress_callback:
            data = {
                "type": "comment",
                "post": {
                    "id": post_info.get('id'),
                    "title": post_info.get('title'),
                    "author": post_info.get('author')
                },
                "comment": comment_data
            }
            await progress_callback(json.dumps(data))

    await send_progress_message(f"Searching r/{subreddit} for posts about '{keyword}'...")
    token = get_access_token()
    posts = search_subreddit(token, subreddit, keyword, limit)
    
    if posts is None:
        return {"error": "Failed to fetch posts from Reddit API"}
    
    if len(posts) == 0:
        return {"error": f"No posts found in r/{subreddit} related to '{keyword}'"}
    
    await send_progress_message(f"Found {len(posts)} relevant posts")
    
    # Step 2: Get comments for each post
    posts_with_comments = []
    comment_count = 0
    
    for i, post in enumerate(posts):
        await send_progress_message(f"Fetching comments for post {i+1}/{len(posts)}: {post['title'][:50]}...")
        
        # Get the comments for this post
        raw_comments = get_post_content(token, post['id'], subreddit)
        
        if raw_comments is not None:
            # Create a copy of the post to add comments to
            post_with_comments = post.copy()
            post_with_comments['comments'] = []
            
            # Process each comment individually and send it to the frontend
            for comment in raw_comments:
                # Send each comment as it's processed
                await send_comment_data(post, comment)
                
                # Add comment to the post_with_comments
                post_with_comments['comments'].append(comment)
                comment_count += 1
                
                # Small delay to avoid overwhelming the frontend
                await asyncio.sleep(0.05)
            
            # Add the post with all comments to our list
            posts_with_comments.append(post_with_comments)
            await send_progress_message(f"Added {len(post_with_comments['comments'])} comments for post {i+1}/{len(posts)}")
    
    if len(posts_with_comments) == 0:
        return {"error": "Failed to fetch comments for any posts"}
    
    # Step 3: Analyze the content with OpenAI
    await send_progress_message(f"Analyzing {len(posts_with_comments)} posts with {comment_count} comments...")
    analysis_result = analyze_reddit_content(question, posts_with_comments)
    
    if analysis_result is None:
        return {"error": "Failed to analyze content with OpenAI"}
    
    await send_progress_message(f"Analysis complete")
    
    # Step 4: Repeat the process after the specified time
    if repeatHours > 0 or repeatMinutes > 0:
        await send_progress_message(f"Scheduling next run in {repeatHours}h {repeatMinutes}m")
        # For this implementation, we don't actually schedule the next run here
        # as it would block the websocket. Instead, the frontend should reconnect.
    
    # Return the results
    return {
        "question": question,
        "subreddit": subreddit,
        "keyword": keyword,
        "num_posts_analyzed": len(posts_with_comments),
        "total_comments": comment_count,
        "analysis": analysis_result
    }

# This synchronous version is kept for backward compatibility
def process_reddit_query_sync(subreddit, keyword, question, limit, repeatHours, repeatMinutes, progress_callback=None):
    """Synchronous version of process_reddit_query"""
    def sync_callback(message):
        print(message)
        if progress_callback:
            progress_callback(message)
    
    # Step 1: Search for relevant posts
    sync_callback(f"Searching r/{subreddit} for posts about '{keyword}'...")
    token = get_access_token()
    posts = search_subreddit(token, subreddit, keyword, limit)
    
    if posts is None:
        return {"error": "Failed to fetch posts from Reddit API"}
    
    if len(posts) == 0:
        return {"error": f"No posts found in r/{subreddit} related to '{keyword}'"}
    
    sync_callback(f"Found {len(posts)} relevant posts")
    
    # Step 2: Get comments for each post
    posts_with_comments = []
    comment_count = 0
    
    for i, post in enumerate(posts):
        sync_callback(f"Fetching comments for post {i+1}/{len(posts)}: {post['title'][:50]}...")
        raw_comments = get_post_content(token, post['id'], subreddit)
        
        if raw_comments is not None:
            # Create a copy of the post to add comments to
            post_with_comments = post.copy()
            post_with_comments['comments'] = []
            
            # Process each comment individually
            for comment in raw_comments:
                # In the sync version, we can't send individual comments in real-time
                post_with_comments['comments'].append(comment)
                comment_count += 1
            
            # Add the post with all comments to our list
            posts_with_comments.append(post_with_comments)
            sync_callback(f"Added {len(post_with_comments['comments'])} comments for post {i+1}/{len(posts)}")
    
    if len(posts_with_comments) == 0:
        return {"error": "Failed to fetch comments for any posts"}
    
    # Step 3: Analyze the content with OpenAI
    sync_callback(f"Analyzing {len(posts_with_comments)} posts with {comment_count} comments...")
    analysis_result = analyze_reddit_content(question, posts_with_comments)
    
    if analysis_result is None:
        return {"error": "Failed to analyze content with OpenAI"}
    
    sync_callback(f"Analysis complete")
    
    # Step 4: Repeat the process after the specified time
    if repeatHours > 0 or repeatMinutes > 0:
        time.sleep(repeatHours * 3600 + repeatMinutes * 60)
        return process_reddit_query_sync(subreddit, keyword, question, limit, repeatHours, repeatMinutes, progress_callback)
    
    # Return the results
    return {
        "question": question,
        "subreddit": subreddit,
        "keyword": keyword,
        "num_posts_analyzed": len(posts_with_comments),
        "total_comments": comment_count,
        "analysis": analysis_result
    }

