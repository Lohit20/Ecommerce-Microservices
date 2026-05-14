from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os

from routers import cart, orders

app = FastAPI()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client["cart_db"]
cart_collection = db["carts"]
transaction_collection = db["transactions"]

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.244:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cart.router)
app.include_router(orders.router)
