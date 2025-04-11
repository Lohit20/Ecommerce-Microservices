from fastapi import FastAPI 
from app.routes import user


#Create FastAPI instance
app = FastAPI()


#Include the user route under the prefix
app.include_router(user.router, prefix="/api/auth", tags=["Auth"])



    