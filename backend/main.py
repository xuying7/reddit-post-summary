from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from api.process_query import process_reddit_query
import json
from typing import List, Dict, Any

# Import the auth router (local module)
from routers import auth

app = FastAPI()

# Include the auth router
app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RedditQuery(BaseModel):
    subreddit: str
    keyword: str
    question: str
    limit: int = 10
    repeatHours: int = 0
    repeatMinutes: int = 0

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(self, websocket: WebSocket, message: str):
        await websocket.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/query")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        query_json = await websocket.receive_text()
        query_data = json.loads(query_json)
        
        # Convert to RedditQuery model
        query = RedditQuery(**query_data)
        
        # Send initial status
        await manager.send_message(
            websocket,
            json.dumps({"status": "Starting query..."})
        )
        
        # Define progress callback
        async def progress_callback(message: str):
            await manager.send_message(
                websocket,
                json.dumps({"status": message})
            )
        
        # Process the query
        results = await process_reddit_query(
            query.subreddit, 
            query.keyword, 
            query.question, 
            int(query.limit), 
            int(query.repeatHours), 
            int(query.repeatMinutes), 
            progress_callback
        )
        print(results)
        print("Results type:", type(results))
        print("Results keys:", results.keys() if isinstance(results, dict) else "Not a dict")
        print("Attempting to stringify results:", json.dumps({"test": "test"}))
        try:
            json_results = json.dumps({"status": "Query completed", "results": results})
            print("Successfully serialized results")
        except Exception as e:
            print(f"Error serializing results: {str(e)}")
            try:
                json_results = json.dumps({"status": "Query completed", "results": results}, default=str)
                print("Successfully serialized with default=str")
            except Exception as e:
                print(f"Still failed to serialize: {str(e)}")
        
        # Send final results
        await manager.send_message(
            websocket,
            json.dumps({"status": "Query completed", "results": results}, default=str)
        )
        print("fianl stucture", json.dumps({"status": "Query completed", "results": results}))
        
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        error_message = f"Error: {str(e)}"
        try:
            await manager.send_message(websocket, json.dumps({"error": error_message}))
        except:
            pass
        finally:
            manager.disconnect(websocket)

@app.get("/test")
async def test():
    return {"message": "Hello, World!"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)