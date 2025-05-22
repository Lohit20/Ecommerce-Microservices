from dotenv import load_dotenv
import os 


#Load values from .env file
load_dotenv()


#MongoDB connection URI
# MONGO_URI = os.getenv("MONGO_URI")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

#JWT token configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))