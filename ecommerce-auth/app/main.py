from fastapi import FastAPI 
from app.routes import user
from fastapi.middleware.cors import CORSMiddleware



#Create FastAPI instance
app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] for all origins (not safe in prod)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#Include the user route under the prefix
app.include_router(user.router, prefix="/api/auth", tags=["Auth"])



    