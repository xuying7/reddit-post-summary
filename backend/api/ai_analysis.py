import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_KEY"))

def analyze_reddit_content(question, posts_with_comments):
    """
    Analyzes Reddit posts and comments using OpenAI to answer a specific question.
    
    Args:
        question: The user's question (e.g., "What are bird courses at UofT?")
        posts_with_comments: List of post dictionaries, each containing post data and comments
        
    Returns:
        Analysis results from OpenAI or None if analysis fails
    """
    if not client.api_key:
        print("Error: OPENAI_API_KEY not found in environment variables.")
        return None
        
    try:
        # Prepare the content for analysis
        formatted_content = format_reddit_content(posts_with_comments)
        
        # Create the prompt
        prompt = create_analysis_prompt(question, formatted_content)
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-16k",  # Using a model with higher context length
            messages=[
                {"role": "system", "content": "You are a helpful assistant that analyzes Reddit discussions and provides concise, accurate summaries of community recommendations and opinions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=800
        )
        
        # Extract and return the analysis
        analysis = response.choices[0].message.content.strip()
        return analysis
        
    except Exception as e:
        print(f"Error during OpenAI analysis: {e}")
        return None

def format_reddit_content(posts_with_comments):
    """
    Formats posts and comments into a structured string for the OpenAI prompt.
    
    Args:
        posts_with_comments: List of post dictionaries with their comments
        
    Returns:
        Formatted string containing post and comment content
    """
    formatted_content = ""
    
    for post_idx, post in enumerate(posts_with_comments, 1):
        formatted_content += f"\n--- POST {post_idx}: {post['title']} ---\n"
        formatted_content += f"Post content: {post['selftext'][:500]}...\n" if len(post.get('selftext', '')) > 500 else f"Post content: {post.get('selftext', '')}\n"
        
        formatted_content += f"\nTop comments ({len(post['comments'])} total):\n"
        
        # Add up to 5 top comments for each post
        for comment_idx, comment in enumerate(post['comments'][:5], 1):
            formatted_content += f"Comment {comment_idx}: {comment['body'][:300]}...\n" if len(comment['body']) > 300 else f"Comment {comment_idx}: {comment['body']}\n"
            
        formatted_content += "\n"
        
    return formatted_content

def create_analysis_prompt(question, formatted_content):
    """
    Creates a structured prompt for the OpenAI analysis.
    
    Args:
        question: The user's specific question
        formatted_content: Formatted Reddit content
        
    Returns:
        Complete prompt string
    """
    return f"""
I need you to analyze Reddit discussions about the following question:
"{question}"

Below are relevant Reddit posts and comments that discuss this topic:

{formatted_content}

Based on these Reddit discussions, please provide:
1. A concise summary of the most recommended options
2. For each recommendation, include brief reasons mentioned in the discussions
3. Any important considerations or warnings mentioned by Redditors
4. A brief conclusion with the most popular recommendations

Format your response in clear sections with bullet points for recommendations.
"""