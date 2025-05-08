from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Schema for receiving data from next-auth
class UserSync(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    provider: str
    provider_account_id: str

# Schema for representing user data (e.g., in responses)
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class User(UserBase):
    id: int
    provider: str
    provider_account_id: str

    class Config:
        from_attributes = True # Replaces orm_mode = True

# Schema for JWT token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

class ChatHistoryOut(BaseModel):
    id: int
    message: str
    response: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True 