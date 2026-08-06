from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import asyncio
import json

from app.services.prediction_service import prediction_service

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for live load updates.
    The frontend subscribes here.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Receive any message (e.g., ping)
            data = await websocket.receive_text()
            # We don't really process incoming, this is mostly a push socket
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def broadcast_live_updates():
    """
    A background task that runs to simulate pushing live updates.
    In prod, this is triggered by Redis pub/sub or Kafka.
    """
    while True:
        await asyncio.sleep(5)  # Push every 5 seconds
        if manager.active_connections:
            # Simulate a live reading for national grid
            peak = await prediction_service.get_peak("national")
            update = {
                "type": "live_reading",
                "region": "national",
                "current_load_mw": peak["peak_load_mw"] * 0.9 + (hash(str(asyncio.get_event_loop().time())) % 1000),
                "timestamp": peak["peak_time"]
            }
            await manager.broadcast(json.dumps(update))
