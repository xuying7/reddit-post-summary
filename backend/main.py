from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from typing import List, Dict, Any, Optional
import uuid
import logging # Add logging

# Import the auth router and the get_current_active_user dependency
from routers import auth
# Assuming get_current_active_user is now in routers.auth
# If it were in, say, dependencies.py, you'd import from there.

import crud
import models # models.py
import schemas # schemas.py
from database import get_db, SessionLocal # Import SessionLocal for manual session management if needed
import security # Make sure this is imported

app = FastAPI()

# Include the auth router (for /sync-user, /users/me etc.)
app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Adjust for your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model for incoming WebSocket query, adjust as needed
class WebSocketMessage(BaseModel):
    type: str # e.g., "new_analysis", "follow_up"
    chat_id: Optional[str] = None # session_uuid for follow-ups
    data: Dict[str, Any] # Contains parameters for new_analysis or query for follow_up

# Example: query_data for process_reddit_query, if still used directly
class RedditQuery(BaseModel):
    subreddit: str
    keyword: str
    question: str
    limit: int = 10
    # repeatHours: int = 0 # Not used by process_reddit_query based on its call signature
    # repeatMinutes: int = 0 # Not used by process_reddit_query
    sort_order: str = "hot"
    # Ensure this matches what process_reddit_query expects, current call uses:
    # subreddit, keyword, question, limit, (removed repeatHours, repeatMinutes), progress_callback, sort_order

# --- Helper for WebSocket Authentication ---
async def get_websocket_user(token: Optional[str], db: SessionLocal) -> Optional[models.User]:
    if not token:
        logging.warning("WebSocket Auth: No token provided.")
        return None
    credentials_exception = HTTPException( # Not directly raised, but for verify_token
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Could not validate credentials"
    )
    user: Optional[models.User] = None # Define user before try block
    try:
        logging.info(f"WebSocket Auth: Verifying token: {token[:10]}...") # Log part of token
        token_data = security.verify_token(token, credentials_exception)
        logging.info(f"WebSocket Auth: Token verified. User ID from token: {token_data.user_id}")
        if token_data.user_id is None:
            logging.warning("WebSocket Auth: Token valid but user_id is None.")
            return None
        
        # --- Query the database ---
        user_id_from_token = token_data.user_id
        logging.info(f"WebSocket Auth: Querying DB for user_id: {user_id_from_token}")
        user = db.query(models.User).filter(models.User.id == user_id_from_token).first()
        # --- END Query ---
        
        # --- ADD LOGGING HERE ---
        if user:
            logging.info(f"WebSocket Auth: DB Query SUCCESS - Found user: id={user.id}, email={user.email}")
        else:
            logging.warning(f"WebSocket Auth: DB Query FAILED - User not found for user_id: {user_id_from_token}")
        # --- END LOGGING ---
        
        return user # Return the user object (or None if not found)

    except Exception as e:
        logging.error(f"WebSocket Auth: Exception during token verification or DB query: {str(e)}")
        return None

# --- WebSocket Connection Manager (existing) ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # Store user_id with websocket to identify user for broadcasting if needed
        self.connection_details: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.connection_details[websocket] = user_id

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_details:
            del self.connection_details[websocket]

    async def send_message(self, websocket: WebSocket, message: str):
        await websocket.send_text(message)
    
    # async def broadcast_to_user(self, user_id: int, message: str):
    #     for ws, uid in self.connection_details.items():
    #         if uid == user_id:
    #             await ws.send_text(message)

manager = ConnectionManager()

# --- WebSocket Endpoint ---
@app.websocket("/ws/query")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    db: SessionLocal = next(get_db())
    current_user: Optional[models.User] = None
    try:
        current_user = await get_websocket_user(token, db)
        if not current_user:
            await websocket.accept() # Accept before sending close reason
            await websocket.send_text(json.dumps({"error": "Authentication failed"}))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(websocket, current_user.id)
        
        while True: # Keep connection open for multiple messages
            raw_data = await websocket.receive_text()
            try:
                ws_message_data = json.loads(raw_data)
                message_type = ws_message_data.get("type")
                client_chat_id = ws_message_data.get("chat_id") # This is the session_uuid
                payload_data = ws_message_data.get("data", {})

            except json.JSONDecodeError:
                await manager.send_message(websocket, json.dumps({"error": "Invalid JSON format"}))
                continue
            except Exception as e: # Catch other potential errors from message parsing
                await manager.send_message(websocket, json.dumps({"error": f"Invalid message structure: {str(e)}"}))
                continue

            if message_type == "new_analysis":
                try:
                    query_params = RedditQuery(**payload_data) # Validate/parse parameters
                    title = f"r/{query_params.subreddit} - {query_params.keyword}"
                    # Store parameters with user_id and generated title
                    ph_create_schema = schemas.ParameterHistoryCreate(parameters=json.dumps(payload_data), title=title)
                    param_history = crud.create_parameter_history(db, user_id=current_user.id, history_data=ph_create_schema)
                    session_uuid = param_history.session_uuid # This is our chat_id for the frontend

                    # Acknowledge session start with chat_id
                    await manager.send_message(websocket, json.dumps({"chat_id": session_uuid, "status": "Analysis session started"}))

                    # Define progress callback, now including chat_id in its messages
                    async def progress_callback(data_to_send: Any):
                        payload_str = ""
                        if isinstance(data_to_send, str):
                            payload_str = json.dumps({"status": data_to_send, "chat_id": session_uuid})
                        elif isinstance(data_to_send, dict):
                            data_to_send["chat_id"] = session_uuid # Add chat_id
                            payload_str = json.dumps(data_to_send)
                        else:
                            payload_str = json.dumps({"error": "Unexpected data format from backend processing.", "chat_id": session_uuid})
                        if payload_str:
                            await manager.send_message(websocket, payload_str)
                    
                    # Ensure process_reddit_query is imported correctly
                    from api.process_query import process_reddit_query 
                    results = await process_reddit_query(
                        query_params.subreddit, 
                        query_params.keyword, 
                        query_params.question, 
                        query_params.limit,
                        0, # repeatHours - not provided by frontend
                        0, # repeatMinutes - not provided by frontend
                        progress_callback, # Correct position
                        query_params.sort_order # Correct position
                    )
                    
                    # Store final results in ChatHistory, linked to ParameterHistory
                    crud.create_chat_history(
                        db, 
                        user_id=current_user.id, 
                        message=f"Initial analysis: {title}", 
                        response=json.dumps(results, default=str), 
                        parameter_history_id=param_history.id
                    )
                    # Send final completion message
                    await manager.send_message(websocket, json.dumps({"status": "Query completed", "results": results, "chat_id": session_uuid}, default=str))

                except Exception as e:
                    # Error specific to new analysis processing
                    await manager.send_message(websocket, json.dumps({"error": f"Error processing new analysis: {str(e)}", "chat_id": locals().get('session_uuid')})) # locals().get in case session_uuid was set

            elif message_type == "follow_up" and client_chat_id:
                param_history = crud.get_parameter_history_by_session_uuid(db, session_uuid=client_chat_id)
                if not param_history or param_history.user_id != current_user.id:
                    await manager.send_message(websocket, json.dumps({"error": "Invalid or unauthorized chat session ID", "chat_id": client_chat_id}))
                    continue # Wait for next message
                
                follow_up_query = payload_data.get("query", "")
                # Placeholder: Actual follow-up processing logic would go here
                follow_up_response = {"answer": f"Follow-up response to: '{follow_up_query}' for session {client_chat_id}"}
                
                # Store follow-up Q&A in ChatHistory
                crud.create_chat_history(
                    db,
                    user_id=current_user.id,
                    message=follow_up_query,
                    response=json.dumps(follow_up_response),
                    parameter_history_id=param_history.id
                )
                # Send response back to client
                await manager.send_message(websocket, json.dumps({"results": follow_up_response, "chat_id": client_chat_id}))
            
            # Handle unknown message types
            else:
                await manager.send_message(websocket, json.dumps({"error": "Invalid message type or missing chat_id for follow_up"}))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # print(f"Client {websocket.client} disconnected") # Optional: log disconnect
    except Exception as e:
        # Catch-all for other errors during WebSocket lifecycle
        error_message = f"WebSocket Endpoint Error: {str(e)}"
        print(error_message) # Log this on the server
        # Try to inform client if possible, then ensure disconnect
        try:
            if websocket.client_state == WebSocketState.CONNECTED: # Check if ws is still connected
                await websocket.send_text(json.dumps({"error": "An unexpected server error occurred. Please try reconnecting."}))
        except Exception as e_send:
            print(f"Error sending WebSocket error message to client: {str(e_send)}")
        # No matter what, ensure disconnection from manager
        manager.disconnect(websocket)
    finally:
        if db: # Ensure db session is closed
            db.close()

# --- HTTP API Endpoints for History (ensure get_current_active_user is correctly imported/defined) ---
from routers.auth import get_current_active_user # This should be okay if auth.py has it

@app.get("/api/history", response_model=List[schemas.ParameterHistoryListItem])
async def get_analysis_history(
    db: SessionLocal = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    histories = crud.get_parameter_histories_by_user(db, user_id=current_user.id)
    return histories

# Define a combined response model for session details + chat log
class SessionDetailResponse(schemas.ParameterHistoryOut):
    chat_log: List[schemas.ChatHistoryOut]

@app.get("/api/history/{session_uuid}", response_model=SessionDetailResponse)
async def get_specific_analysis_session(
    session_uuid: str,
    db: SessionLocal = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    param_history = crud.get_parameter_history_by_session_uuid(db, session_uuid=session_uuid)
    if not param_history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis session not found")
    if param_history.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this session")
    
    chat_entries = crud.get_chat_history_for_session(db, parameter_session_uuid=session_uuid)
    
    # Use the Pydantic model ParameterHistoryOut to serialize param_history
    session_details_dict = schemas.ParameterHistoryOut.from_orm(param_history).dict()
    # Combine with chat_log for the final response
    return SessionDetailResponse(**session_details_dict, chat_log=chat_entries)

@app.get("/test")
async def test():
    return {"message": "Hello, World!"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    # Ensure security module is imported as it's used by get_websocket_user
    # import security # Already imported at the top
    uvicorn.run(app, host="0.0.0.0", port=8000)