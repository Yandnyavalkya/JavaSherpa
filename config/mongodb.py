from mongoengine import connect
import os
from dotenv import load_dotenv

load_dotenv()

def init_db():
    try:
        mongodb_url = os.getenv("MONGODB_URL")
        db_name = os.getenv("DB")
        
        if not mongodb_url:
            raise ValueError("MONGODB_URL environment variable is not set")
        if not db_name:
            raise ValueError("DB environment variable is not set")
            
        client = connect(host=mongodb_url, db=db_name)
        print(f"Successfully connected to MongoDB database: {db_name}")
        return client
    except Exception as e:
        print(f"Error connecting to MongoDB: {str(e)}")
        raise

    