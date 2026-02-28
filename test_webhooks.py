import requests
import time
import uuid
import datetime

WEBHOOK_URL = "http://localhost:5000/webhook"

def send_push():
    headers = {"X-GitHub-Event": "push", "Content-Type": "application/json"}
    payload = {
        "after": uuid.uuid4().hex[:40],
        "ref": "refs/heads/staging",
        "sender": {"login": "Travis"},
        "head_commit": {
            "timestamp": "2021-04-01T21:30:00Z"
        }
    }
    print("Sending PUSH...")
    res = requests.post(WEBHOOK_URL, json=payload, headers=headers)
    print(res.status_code, res.json())

def send_pull_request():
    headers = {"X-GitHub-Event": "pull_request", "Content-Type": "application/json"}
    payload = {
        "action": "opened",
        "pull_request": {
            "id": 1234567,
            "head": {"ref": "staging"},
            "base": {"ref": "master"},
            "created_at": "2021-04-01T09:00:00Z",
            "merged": False
        },
        "sender": {"login": "Travis"}
    }
    print("Sending PULL REQUEST...")
    res = requests.post(WEBHOOK_URL, json=payload, headers=headers)
    print(res.status_code, res.json())

def send_merge():
    headers = {"X-GitHub-Event": "pull_request", "Content-Type": "application/json"}
    payload = {
        "action": "closed",
        "pull_request": {
            "id": 7654321,
            "head": {"ref": "dev"},
            "base": {"ref": "master"},
            "merged_at": "2021-04-02T12:00:00Z",
            "merged": True
        },
        "sender": {"login": "Travis"}
    }
    print("Sending MERGE...")
    res = requests.post(WEBHOOK_URL, json=payload, headers=headers)
    print(res.status_code, res.json())

if __name__ == "__main__":
    import db_clearer
    db_clearer.clear() # clear DB before insertion
    
    send_push()
    time.sleep(2)
    send_pull_request()
    time.sleep(2)
    send_merge()
    print("Sent all test events.")
