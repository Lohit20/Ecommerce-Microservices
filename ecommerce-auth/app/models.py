##Create User Model and Database Logic/Schema

from pydantic import BaseModel, EmailStr
from typing import Optional

#Pydantic model for user registration request

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str 

    
    class Config:
        orm_mode = True


#Pydantic model for login request

class UserLogin(BaseModel):
    email: EmailStr
    password: str


    class Config:
        orm_mode = True


#Optional JWT token data (used in auth later)
class TokenData(BaseModel):
    email: Optional[str] = None


#This is the database model (MongoDB document structure)
# class UserDB:
    # def __init__(self, id: str, email: str, username: str, password: str):
        # self.id = id
        # self.email = email
        # self.username = username
        # self.password = password