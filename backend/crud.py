from sqlalchemy.orm import Session

import models, schemas

def get_user_by_provider_details(db: Session, provider: str, provider_account_id: str):
    return db.query(models.User).filter(
        models.User.provider == provider,
        models.User.provider_account_id == provider_account_id
    ).first()

def create_user(db: Session, user_data: schemas.UserSync) -> models.User:
    db_user = models.User(
        email=user_data.email,
        name=user_data.name,
        provider=user_data.provider,
        provider_account_id=user_data.provider_account_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: models.User, user_data: schemas.UserSync) -> models.User:
    # Update fields if they have changed
    updated = False
    if user_data.name and db_user.name != user_data.name:
        db_user.name = user_data.name
        updated = True
    # Add other fields like profile picture if needed
    # if user_data.image and db_user.image != user_data.image:
    #     db_user.image = user_data.image
    #     updated = True

    if updated:
        db.commit()
        db.refresh(db_user)
    return db_user 