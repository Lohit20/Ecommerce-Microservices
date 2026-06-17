import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")

_client: AsyncIOMotorClient | None = None


def _db():
    return _client["assistant_db"]


def conversations() -> AsyncIOMotorCollection:
    return _db()["conversations"]


async def connect():
    global _client
    _client = AsyncIOMotorClient(MONGO_URI)
    await _db().command("ping")
    await conversations().create_index([("user_id", 1), ("updated_at", -1)])
    await conversations().create_index("session_id", unique=True)


async def close():
    global _client
    if _client:
        _client.close()
        _client = None
