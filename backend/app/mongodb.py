from pymongo import MongoClient

MONGO_URL = "mongodb://localhost:27017"

client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000
)

mongo_db = client["itbis_logs"]

activity_logs = mongo_db["activity_logs"]


def check_mongodb():
    client.admin.command("ping")
    return True