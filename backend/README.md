# Reddit Post Summary Backend

This backend provides WebSocket endpoints for processing Reddit queries and sending real-time debug information.

## Setup

1. Install dependencies:
```bash
pip install fastapi uvicorn websockets pydantic
```

2. Run the server:
```bash
cd backend
python main.py
```

The server will start at http://localhost:8000.

## WebSocket API

### Query Endpoint: `/ws/query`

This endpoint accepts a WebSocket connection and processes a Reddit query, providing real-time updates.

#### Request Format

Send a JSON object with the following structure:

```json
{
  "subreddit": "python",
  "keyword": "asyncio",
  "question": "What are the best practices for using asyncio in Python?",
  "limit": 5,
  "repeatHours": 0,
  "repeatMinutes": 0
}
```

- `subreddit`: The subreddit to search
- `keyword`: The keyword to search for
- `question`: The specific question to analyze
- `limit`: Maximum number of posts to fetch (default: 10)
- `repeatHours` and `repeatMinutes`: Time intervals for repeating the query (not recommended with WebSockets)

#### Response Format

The server will send multiple JSON messages through the WebSocket connection:

1. Status updates during processing:
```json
{
  "status": "Searching r/python for posts about 'asyncio'..."
}
```

2. Final results when completed:
```json
{
  "status": "Query completed",
  "results": {
    "question": "...",
    "subreddit": "...",
    "keyword": "...",
    "num_posts_analyzed": 5,
    "total_comments": 42,
    "analysis": "..."
  }
}
```

3. Error response if something goes wrong:
```json
{
  "error": "Error message details"
}
```

## Testing

You can test the WebSocket functionality using the included test script:

```bash
python test_websocket.py
```

## Frontend Integration

To connect to this WebSocket from a frontend application:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/query');

ws.onopen = () => {
  // Send query when connection opens
  ws.send(JSON.stringify({
    subreddit: 'python',
    keyword: 'asyncio',
    question: 'What are the best practices for using asyncio?',
    limit: 5
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.status) {
    console.log('Status:', data.status);
    
    // Check if results are included (query completed)
    if (data.results) {
      console.log('Results:', data.results);
    }
  } else if (data.error) {
    console.error('Error:', data.error);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket connection closed');
};
``` 