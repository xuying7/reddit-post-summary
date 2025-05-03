from pydantic import BaseModel

class User(BaseModel):
    username: str
    password: str


class ActiveSession(BaseModel):
    username: str
    access_token: str
    