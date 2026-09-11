from fastapi import APIRouter, HTTPException
from backend.schemas import LoginRequest, LoginResponse
import base64
import json

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Mock users
MOCK_USERS = {
    "citizen": {"username": "citizen", "role": "citizen"},
    "authority": {"username": "authority", "role": "authority"},
    "admin": {"username": "admin", "role": "authority"},
}

def decode_role(token: str) -> str:
    """Decode role from mock token. Returns 'citizen' if invalid."""
    try:
        decoded = json.loads(base64.b64decode(token).decode())
        return decoded.get("role", "citizen")
    except Exception:
        return "citizen"

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    role = request.role if request.role in ["citizen", "authority"] else "citizen"
    token_data = {"username": request.username, "role": role}
    token = base64.b64encode(json.dumps(token_data).encode()).decode()
    return LoginResponse(token=token, role=role, username=request.username)
