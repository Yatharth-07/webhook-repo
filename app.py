from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timezone
import dateutil.parser
import os

app = Flask(__name__)
CORS(app)

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client.github_webhooks
events_collection = db.events

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/events', methods=['GET'])
def get_events():
    try:
        # Fetch the latest events, sorted by timestamp descending
        events = list(events_collection.find({}, {'_id': 0}).sort('timestamp', -1).limit(50))
        return jsonify(events)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    event_type = request.headers.get('X-GitHub-Event')
    payload = request.json
    
    if not payload:
        return jsonify({"message": "No payload provided"}), 400

    new_event = None

    if event_type == "push":
        # Process Push Event
        request_id = payload.get("after") # The commit hash we're pushing to
        
        # Author can be in nested sender object, or commits
        sender = payload.get("sender", {})
        author = sender.get("login", "Unknown")
        
        ref = payload.get("ref", "")
        to_branch = ref.split("/")[-1] if "/" in ref else ref
        
        # Get timestamp from the head commit if available, else current time
        head_commit = payload.get("head_commit", {})
        timestamp_str = head_commit.get("timestamp")
        
        if timestamp_str:
            timestamp = dateutil.parser.isoparse(timestamp_str)
        else:
            timestamp = datetime.now(timezone.utc)

        new_event = {
            "request_id": request_id,
            "author": author,
            "action": "PUSH",
            "from_branch": "", # Push doesn't typically have a from_branch in this context
            "to_branch": to_branch,
            "timestamp": timestamp.isoformat()
        }

    elif event_type == "pull_request":
        # Process Pull Request Event
        action = payload.get("action")
        pr_data = payload.get("pull_request", {})
        
        request_id = str(pr_data.get("id"))
        
        sender = payload.get("sender", {})
        author = sender.get("login", "Unknown")
        
        from_branch = pr_data.get("head", {}).get("ref", "")
        to_branch = pr_data.get("base", {}).get("ref", "")
        
        # Determine if it's an open, close, or merge
        # A merge is a 'closed' action where 'merged' is true
        is_merged = pr_data.get("merged", False)
        
        if action == "closed" and is_merged:
            event_action = "MERGE"
            timestamp_str = pr_data.get("merged_at")
        elif action in ["opened", "reopened", "synchronize"]:
            event_action = "PULL_REQUEST"
            timestamp_str = pr_data.get("created_at")
        else:
            # We ignore other pull request actions (e.g., closed but not merged, labeled, etc)
            return jsonify({"message": f"Ignored PR action: {action}"}), 200

        if timestamp_str:
            timestamp = dateutil.parser.isoparse(timestamp_str)
        else:
            timestamp = datetime.now(timezone.utc)
            
        new_event = {
            "request_id": request_id,
            "author": author,
            "action": event_action,
            "from_branch": from_branch,
            "to_branch": to_branch,
            "timestamp": timestamp.isoformat()
        }
        
    else:
        # We only care about push and pull_request
        return jsonify({"message": f"Event {event_type} received but ignored"}), 200

    if new_event:
        try:
            events_collection.insert_one(new_event.copy())
            return jsonify({"message": "Event recorded successfully"}), 201
        except Exception as e:
            print(f"Error inserting to MongoDB: {e}")
            return jsonify({"error": "Database insertion failed"}), 500
            
    return jsonify({"message": "Payload processed, but no event to record"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
