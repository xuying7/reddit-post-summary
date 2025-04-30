import asyncio
import websockets
import json

async def test_websocket():
    """Simple test script to verify the websocket functionality"""
    uri = "ws://localhost:8000/ws/query"
    
    print("Connecting to WebSocket server...")
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket server")
        
        # Create a test query
        test_query = {
            "subreddit": "python",
            "keyword": "asyncio",
            "question": "What are the best practices for using asyncio in Python?",
            "limit": 5,
            "repeatHours": 0,
            "repeatMinutes": 0
        }
        
        # Send the query to the server
        print(f"Sending query: {test_query}")
        await websocket.send(json.dumps(test_query))
        
        # Receive and print all messages until the connection is closed
        try:
            while True:
                response = await websocket.recv()
                data = json.loads(response)
                
                if "status" in data:
                    print(f"Status update: {data['status']}")
                    
                    # If we got final results, print them and exit
                    if "results" in data:
                        print("\nFinal results:")
                        print(json.dumps(data["results"], indent=2))
                        break
                        
                elif "error" in data:
                    print(f"Error: {data['error']}")
                    break
                    
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed")

if __name__ == "__main__":
    asyncio.run(test_websocket()) 