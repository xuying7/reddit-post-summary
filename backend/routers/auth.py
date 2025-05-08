from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import crud, schemas, security, models
from database import get_db, engine

# Create database tables if they don't exist
# In a production app, you might use Alembic for migrations
models.Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["auth"],
)

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

    # Generate backend-specific JWT
    # Store user's internal DB ID in the token subject ('sub')
    access_token = security.create_access_token(
        data={"sub": str(db_user.id)}
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/history", response_model=List[schemas.ChatHistoryOut])
async def get_user_history(current_user: models.User = Depends(get_db)):
    # Placeholder - to implement once authentication dependency setup
    return [] 