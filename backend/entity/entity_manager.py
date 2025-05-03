import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from the .env file
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=dotenv_path)

# Get MongoDB credentials from environment variables
mongo_uri = os.environ.get("MONGO_URI")
db = os.environ.get("DATABASE")

# Create a MongoDB client
client = MongoClient(mongo_uri)

# Create the entity manager
class EntityManager:
    def __init__(self, client, database):
        self.client = client
        self.db = database

    def get_collection(self, collection_name):
        return self.client.get_database(self.db).get_collection(collection_name)

# Instantiate the entity manager
entity_manager = EntityManager(client, db)