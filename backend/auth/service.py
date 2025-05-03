from repositories.UserRepository import UserRepository
from auth.schema import User
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import Depends

class UserService:
    def __init__(self):
        self.userRepository = UserRepository()

    def register(self, user: User):
        return self.userRepository.register(user)

    def get_access_token(self, form_data: OAuth2PasswordRequestForm = Depends()):
        if not self.userRepository.is_password_correct(form_data): return {"access_token": None, type: "bearer"}
        if not self.is_session_active(form_data.username):
            access_token = self.userRepository.get_access_token(form_data)

            if access_token is not None:
                self.register_token_in_session(access_token)
            return {"access_token": access_token, "token_type": "bearer"}
        else:
            active_access_token = self.userRepository.get_access_token_from_active_session(form_data.username)
            return {"access_token": active_access_token, "token_type": "bearer"}

    def authenticate(self, token: str):
        return self.userRepository.authenticate(token)

    def register_token_in_session(self, token: str):
        self.userRepository.register_token_in_session(token)

    def logout(self, token: str):
        self.userRepository.logout(token)

    def is_session_active(self, username: str):
        return self.userRepository.is_session_active(username)