from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_KEY'))

def analyze_post(post_content: str) -> str | None:
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that analyzes Reddit posts and provides a summary of the post."},
                {"role": "user", "content": post_content}
            ],
            max_tokens=100,
            temperature=0.5
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error analyzing post: {e}")
        return None

if __name__ == "__main__":
    post_content = "This is a test post."
    summary = analyze_post(post_content)
    print(summary)