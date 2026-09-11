from fastapi import WebSocket
from typing import List, Dict, Any
import json

class ConnectionManager:
    """Manages WebSocket connections and broadcasts events to all connected clients."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Send a JSON message to all connected clients."""
        message = json.dumps({"event": event_type, "data": data}, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

# Singleton instance
manager = ConnectionManager()
