from fastapi import APIRouter, Depends, HTTPException, status, WebSocket
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
import logging # Add logging import

import crud, schemas, security, models
from database import get_db, engine

# Create database tables if they don't exist
# In a production app, you might use Alembic for migrations
models.Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["auth"],
)

# For HTTP routes, defines how the token is extracted (from Authorization header)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/sync-user") # Point to your token-issuing endpoint

async def get_current_active_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token_data = security.verify_token(token, credentials_exception)
        if token_data.user_id is None:
            raise credentials_exception
    except security.JWTError: # Catch JWTError from security.verify_token
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    # Add any other checks like user.is_active if you have such a field
    return user

@router.post("/sync-user", response_model=schemas.Token)
def sync_user_from_provider(
    user_data: schemas.UserSync,
    db: Session = Depends(get_db)
):
    """
    Receives user info from next-auth callback after successful OAuth login.
    Finds or creates the user in the backend database.
    Returns a backend-specific JWT.
    """
    db_user = crud.get_user_by_provider_details(
        db,
        provider=user_data.provider,
        provider_account_id=user_data.provider_account_id
    )

    if db_user:
        # User exists, update if necessary (e.g., name change)
        db_user = crud.update_user(db=db, db_user=db_user, user_data=user_data)
    else:
        # User does not exist, create new user
        # Optional: Check if email exists with a different provider and handle accordingly
        # existing_email_user = db.query(models.User).filter(models.User.email == user_data.email).first()
        # if existing_email_user:
        #     # Handle account linking or error based on your logic
        #     raise HTTPException(status_code=409, detail="Email already registered with a different provider")
        db_user = crud.create_user(db=db, user_data=user_data)

    if not db_user:
        # Should not happen ideally, but handle potential errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create or update user",
        )

    # --- ADD LOGGING HERE ---
    logging.warning(f"Generating token for user with db_user.id = {db_user.id} (type: {type(db_user.id)}), email: {db_user.email}")
    # --- END LOGGING ---

    # Generate backend-specific JWT
    # Store user's internal DB ID in the token subject ('sub')
    access_token = security.create_access_token(
        data={"sub": str(db_user.id)}
    )

    return {"access_token": access_token, "token_type": "bearer"}

# This is a placeholder for a real GET /me or similar protected route
@router.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

# The placeholder history route - this should be moved to main.py or a dedicated history router
# For now, commenting out as it will be implemented with proper auth and functionality later
# @router.get("/history", response_model=List[schemas.ChatHistoryOut])
# async def get_user_history(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
#     # Corrected to use get_current_active_user and proper CRUD
#     # This is just an example; actual history fetching logic will be more complex
#     # and likely involve ParameterHistory, not ChatHistoryOut directly for listing sessions
#     # return crud.get_chat_histories_by_user(db=db, user_id=current_user.id)
#     return [] 