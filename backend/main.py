from api.reddit_fetch import search_subreddit, get_post_content, get_access_token
from api.ai_analysis import analyze_reddit_content

def process_reddit_query(subreddit, keyword, question):
    """
    Main function that orchestrates the workflow:
    1. Fetch relevant Reddit posts
    2. Get comments for those posts
    3. Analyze the content with OpenAI
    
    Args:
        subreddit: The subreddit to search (e.g., "UofT")
        keyword: The search keyword (e.g., "bird course")
        question: The specific question to analyze (e.g., "What are the easiest bird courses at UofT?")
        
    Returns:
        Analysis results or error message
    """
    # Step 1: Search for relevant posts
    print(f"Searching r/{subreddit} for posts about '{keyword}'...")
    token = get_access_token()
    posts = search_subreddit(token, subreddit, keyword, limit=20)
    
    if posts is None:
        return {"error": "Failed to fetch posts from Reddit API"}
    
    if len(posts) == 0:
        return {"error": f"No posts found in r/{subreddit} related to '{keyword}'"}
    
    print(f"Found {len(posts)} relevant posts")
    
    # Step 2: Get comments for each post
    posts_with_comments = []
    for i, post in enumerate(posts):
        print(f"Fetching comments for post {i+1}/{len(posts)}: {post['title'][:50]}...")
        comments = get_post_content(token, post['id'], subreddit)
        
        if comments is not None:
            # Add comments to the post dictionary
            post_with_comments = post.copy()
            post_with_comments['comments'] = comments
            posts_with_comments.append(post_with_comments)
            print(f"Added {len(comments)} comments")
    
    if len(posts_with_comments) == 0:
        return {"error": "Failed to fetch comments for any posts"}
    
    # Step 3: Analyze the content with OpenAI
    print(f"Analyzing {len(posts_with_comments)} posts with comments...")
    analysis_result = analyze_reddit_content(question, posts_with_comments)
    
    if analysis_result is None:
        return {"error": "Failed to analyze content with OpenAI"}
    
    # Return the results
    return {
        "question": question,
        "subreddit": subreddit,
        "keyword": keyword,
        "num_posts_analyzed": len(posts_with_comments),
        "total_comments": sum(len(post.get('comments', [])) for post in posts_with_comments),
        "analysis": analysis_result
    }

# Example usage
if __name__ == "__main__":
    # Example query
    subreddit = "UofT"
    keyword = "bird course"
    question = "What are the easiest bird courses at UofT according to students?"
    
    # Process the query
    results = process_reddit_query(subreddit, keyword, question)
    
    # Display results
    if "error" in results:
        print(f"Error: {results['error']}")
    else:
        print(f"\n=== Analysis Results ===")
        print(f"Question: {results['question']}")
        print(f"Analyzed {results['num_posts_analyzed']} posts with {results['total_comments']} comments")
        print("\nRecommendations:")
        print(results['analysis'])