##Create User Model and Database Logic/Schema

from pydantic import BaseModel, EmailStr, Field
from typing import Optional



#Pydantic model for user registration request

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str 
    address: str = Field(..., example="123 Main St, London")
    phone_number: str = Field(..., example="+44 7911 123456")

    


#Pydantic model for login request

class UserLogin(BaseModel):
    email: EmailStr
    password: str




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