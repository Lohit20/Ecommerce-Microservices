from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from app.routes import user


#Create FastAPI instance
app = FastAPI()

origins = [
    "http://localhost:3000",   # React/Frontend dev server
    "http://127.0.0.1:3000",   # Alternate localhost
    "http:/192.168.1.244:3000"  # Production frontend domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"],               # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],               # Allow all headers
)

#Include the user route under the prefix
app.include_router(user.router, prefix="/api/auth", tags=["Auth"])



    