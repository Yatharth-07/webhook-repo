from pymongo import MongoClient

def clear():
    client = MongoClient("mongodb://localhost:27017/")
    db = client.github_webhooks
    db.events.delete_many({})
    print("Cleared events collection")

if __name__ == '__main__':
    clear()
