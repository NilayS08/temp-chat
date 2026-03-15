from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        # chat_id (str) -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, chat_id: str):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)

    def disconnect(self, websocket: WebSocket, chat_id: str):
        if chat_id in self.active_connections:
            try:
                self.active_connections[chat_id].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]

    async def broadcast(self, chat_id: str, message: dict, exclude: WebSocket = None):
        """Send a message to all connections in a chat room."""
        if chat_id not in self.active_connections:
            return
        dead = []
        for connection in self.active_connections[chat_id]:
            if connection is exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d, chat_id)

    async def send_personal(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    def get_user_count(self, chat_id: str) -> int:
        return len(self.active_connections.get(chat_id, []))

# Single shared instance
manager = ConnectionManager()