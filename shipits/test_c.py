from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
import sys

# Replace this with your actual MongoDB connection string
MONGODB_URI = "mongodb+srv://shipits_user:gappir-vabzo3-cawBof@shipitsv0.qwh6arp.mongodb.net/shipits-forum?retryWrites=true&w=majority&appName=ShipItsV0"

def test_connection(uri):
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Attempt to retrieve server info to verify the connection
        info = client.server_info()
        print("✅ Successfully connected to MongoDB server.")
        print("Server info:", info.get("version"))
    except ConnectionFailure as e:
        print("❌ Connection failed:", e)
        sys.exit(1)
    except ConfigurationError as e:
        print("❌ Configuration error:", e)
        sys.exit(1)

if __name__ == "__main__":
    test_connection(MONGODB_URI)
