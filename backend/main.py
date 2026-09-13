from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from backend.database import init_db
from backend.websocket_manager import manager
from backend.routes import incidents, buses, traffic, auth
from backend.seed import router as seed_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    init_db()
    # Ensure snapshots directory exists
    snapshots_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "snapshots")
    os.makedirs(snapshots_dir, exist_ok=True)
    yield
    # Shutdown

app = FastAPI(title="City Scout", version="1.0.0", lifespan=lifespan)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving incident snapshots
data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(os.path.join(data_dir, "snapshots"), exist_ok=True)
app.mount("/static", StaticFiles(directory=data_dir), name="static")

# Include routers
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(buses.router)
app.include_router(traffic.router)
app.include_router(seed_router)

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, receive any client messages (ignored)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Health check
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "City Scout"}
