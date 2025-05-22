from pymongo import MongoClient
from app.config import MONGO_URI


client = MongoClient(MONGO_URI)
db = client['ecommerce']
user_collection = db['users']