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
        """Send a JSON message to all connected clients concurrently."""
        message = json.dumps({"event": event_type, "data": data}, default=str)
        import asyncio
        
        async def _send(connection):
            try:
                # Add timeout to prevent hanging connections from blocking
                async with asyncio.timeout(1.0):
                    await connection.send_text(message)
            except Exception:
                self.disconnect(connection)
                
        # Fire and forget all sends concurrently
        tasks = [_send(conn) for conn in self.active_connections]
        if tasks:
            async def _run_tasks():
                await asyncio.gather(*tasks, return_exceptions=True)
            asyncio.create_task(_run_tasks())

# Singleton instance
manager = ConnectionManager()
