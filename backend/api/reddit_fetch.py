import requests
import json
import os
from dotenv import load_dotenv # Import dotenv

# --- Load Environment Variables ---
load_dotenv() # Load variables from .env file in the current directory or parent directories

# --- Get Credentials from Environment Variables ---
CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USERNAME = os.getenv("REDDIT_USERNAME")
REDDIT_PASSWORD = os.getenv("REDDIT_PASSWORD") # Make sure key in .env is REDDIT_PASSWORD
USER_AGENT = os.getenv("REDDIT_USER_AGENT")


# --- User Input Variables ---
# These will eventually come front end
subreddit_name = "UofT"  # Example: Replace with user input
search_keyword = "exam"  # Example: Replace with user input

# --- API Configuration ---
AUTH_URL = "https://www.reddit.com/api/v1/access_token"
API_BASE_URL = "https://oauth.reddit.com" # Use oauth.reddit.com for authenticated requests

def get_access_token():
    """
    Authenticates with the Reddit API using script credentials
    to obtain an OAuth2 access token.
    """
    try:
        # Prepare authentication data
        # Reddit API expects Basic Auth for script type token requests
        auth = requests.auth.HTTPBasicAuth(CLIENT_ID, CLIENT_SECRET)

        # Prepare the data payload for the POST request
        data = {
            'grant_type': 'password',
            'username': REDDIT_USERNAME,
            'password': REDDIT_PASSWORD # Use the variable loaded from .env
        }

        # Set the custom User-Agent header
        headers = {'User-Agent': USER_AGENT} # Use the variable loaded from .env

        # Make the POST request to get the token
        response = requests.post(AUTH_URL, auth=auth, data=data, headers=headers)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        # Parse the JSON response
        token_data = response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            print("Error: Could not retrieve access token from response.")
            print("Response:", token_data)
            return None

        print("Access token obtained successfully.")
        return access_token

    except requests.exceptions.RequestException as e:
        print(f"Error during authentication request: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status code: {e.response.status_code}")
            try:
                # Try to print JSON error details if available
                error_details = e.response.json()
                print(f"Response content: {json.dumps(error_details, indent=4)}")
            except json.JSONDecodeError:
                 # Otherwise print raw text
                print(f"Response content: {e.response.text}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during authentication: {e}")
        return None

def search_subreddit(token, subreddit, keyword, limit, sort_order="hot"):
    
    if not token:
        print("Error: No access token provided for search.")
        return None

    print(f"\nSearching r/{subreddit} for keyword '{keyword}', sorting by '{sort_order}'...")
    try:
        # Construct the API endpoint URL
        search_url = f"{API_BASE_URL}/r/{subreddit}/search.json"

        # Prepare headers with the access token and User-Agent
        headers = {
            'Authorization': f"bearer {token}",
            'User-Agent': USER_AGENT # Use the variable loaded from .env
        }

        # Prepare query parameters
        params = {
            'q': keyword,
            'restrict_sr': 'true', # Restrict search to the specified subreddit
            'sort': sort_order,    # Use the sort_order parameter
            'limit': limit
            # 't': 'week' # Optional: time filter for 'top' or 'controversial' sort (e.g., 'hour', 'day', 'week', 'month', 'year', 'all')
        }

        # Make the GET request
        response = requests.get(search_url, headers=headers, params=params)
        response.raise_for_status() # Raise an exception for bad status codes

        # Parse the JSON response
        search_results = response.json()

        # Extract the actual post data
        posts = search_results.get('data', {}).get('children', [])

        if not posts:
            print("No posts found matching the criteria.")
            return []

        print(f"Found {len(posts)} posts.")
        post_list = []
        for post in posts:
            post_data = post.get('data', {})
            post_list.append({
                'id': post_data.get('id'),
                'title': post_data.get('title'),
                'author': post_data.get('author'),
                'selftext': post_data.get('selftext'),
                'score': post_data.get('score'),
                'num_comments': post_data.get('num_comments'),
                'permalink': post_data.get('permalink'),
                'created_utc': post_data.get('created_utc')
            })
            
        return post_list

    except requests.exceptions.RequestException as e:
        print(f"Error during search request: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status code: {e.response.status_code}")
            try:
                # Try to print JSON error details if available
                error_details = e.response.json()
                print(f"Response content: {json.dumps(error_details, indent=4)}")
            except json.JSONDecodeError:
                # Otherwise print raw text
                print(f"Response content: {e.response.text}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during search: {e}")
        return None

def get_post_content(token, post_id, subreddit, limit=100):
    
    if not token:
        print("Error: No access token provided for post content retrieval.")
        return None

    comments_url = f"{API_BASE_URL}/r/{subreddit}/comments/{post_id}.json"
    headers = {
        'Authorization': f"bearer {token}",
        'User-Agent': USER_AGENT
    }

    params = {
        'limit': limit
    }
    
    response = requests.get(comments_url, headers=headers, params=params)
    response.raise_for_status()
    # Reddit returns an array with 2 elements: [0] = post data, [1] = comments
    result = response.json()
    if len(result) < 2:
        return []
        
    # Extract comments from the second element
    comments_data = result[1].get('data', {}).get('children', [])
    
    # Process comments
    comments = []
    for comment in comments_data:
        if comment.get('kind') == 't1':  # t1 = comment
            comment_data = comment.get('data', {})
            # Skip deleted/removed comments
            if comment_data.get('body') in ['[deleted]', '[removed]']:
                continue
                
            comments.append({
                'author': comment_data.get('author'),
                'body': comment_data.get('body'),
                'score': comment_data.get('score'),
                'created_utc': comment_data.get('created_utc')
            })
            
    return comments
# --- Main Execution ---
if __name__ == "__main__":
    access_token = get_access_token()

    if access_token:
        posts_data = search_subreddit(
            token=access_token,
            subreddit=subreddit_name,
            keyword=search_keyword,
            limit=10,          # Get up to 10 posts
            sort_order="hot" # Example sort order for standalone execution
        )

        # 3. Process and print the results
        if posts_data is not None:
            print(f"\n--- Search Results for '{search_keyword}' in r/{subreddit_name} ---")
            if not posts_data:
                print("No matching posts found.")
            else:
                for i, post in enumerate(posts_data):
                    title = post.get('title', 'N/A')
                    author = post.get('author', 'N/A')
                    score = post.get('score', 0)
                    url = f"https://www.reddit.com{post.get('permalink', '')}"
                    num_comments = post.get('num_comments', 0)

                    print(f"\n{i+1}. Title: {title}")
                    print(f"   Author: u/{author}")
                    print(f"   Score: {score}")
                    print(f"   Comments: {num_comments}")
                    print(f"   URL: {url}")
        else:
            print("\nFailed to retrieve search results.")

