import requests

API_URL = "http://localhost:8000/api"

def main():
    print("Uploading a test file...")
    with open("test.txt", "w") as f:
        f.write("This is a test document containing secret information about project X. Project X involves migrating the main database.")
    
    with open("test.txt", "rb") as f:
        res = requests.post(f"{API_URL}/admin/documents/", files={"file": f})
    
    print("Upload response:", res.status_code, res.json())
    
    print("\nQuerying...")
    res = requests.post(f"{API_URL}/chat/query", json={"query": "What is project X?"})
    print("Query response:", res.status_code, res.json())

if __name__ == "__main__":
    main()
