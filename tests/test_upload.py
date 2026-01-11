import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Mock settings to avoid creating real folders or DBs if possible, 
# but for now we rely on the dev env being writable.
# We also need to handle the sharp imports potentially failing if dependencies are missing.
# But let's try importing main.

try:
    from src.main import app
except ImportError as e:
    print(f"ImportError: {e}")
    # Try to setup path for sharp if needed? 
    # The code in sharp_service adds it to path, so it should be fine if we can import sharp_service.
    sys.exit(1)

client = TestClient(app)

def test_upload_ply():
    # Create a dummy ply file content
    ply_content = b"ply\nformat ascii 1.0\nend_header\n"
    
    files = {
        "file": ("test.ply", ply_content, "application/octet-stream")
    }
    
    response = client.post("/api/upload/", files=files)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code != 200:
        print(f"Error detail: {response.text}")
    
    assert response.status_code == 200
    assert response.json()["status"] == "completed"

if __name__ == "__main__":
    try:
        test_upload_ply()
        print("Test passed!")
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
