import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """
    In-memory WebSocket room manager.

    rooms structure:
    {
        "<meeting_code>": {
            "<client_id>": {
                "websocket": WebSocket,
                "display_name": str,
                "is_muted": bool,
                "is_video_on": bool,
            }
        }
    }
    """

    def __init__(self):
        self.rooms: dict[str, dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, meeting_code: str, client_id: str, display_name: str):
        await websocket.accept()
        if meeting_code not in self.rooms:
            self.rooms[meeting_code] = {}
        self.rooms[meeting_code][client_id] = {
            "websocket": websocket,
            "display_name": display_name,
            "is_muted": False,
            "is_video_on": True,
        }

    def disconnect(self, meeting_code: str, client_id: str):
        if meeting_code in self.rooms:
            self.rooms[meeting_code].pop(client_id, None)
            if not self.rooms[meeting_code]:
                del self.rooms[meeting_code]

    def get_participants(self, meeting_code: str) -> list[dict]:
        room = self.rooms.get(meeting_code, {})
        return [
            {
                "client_id": cid,
                "display_name": info["display_name"],
                "is_muted": info["is_muted"],
                "is_video_on": info["is_video_on"],
            }
            for cid, info in room.items()
        ]

    async def send_personal_message(self, message: dict, meeting_code: str, client_id: str):
        room = self.rooms.get(meeting_code, {})
        participant = room.get(client_id)
        if participant:
            await participant["websocket"].send_text(json.dumps(message))

    async def broadcast_to_room(self, message: dict, meeting_code: str, exclude_client_id: str | None = None):
        room = self.rooms.get(meeting_code, {})
        for cid, info in room.items():
            if cid != exclude_client_id:
                await info["websocket"].send_text(json.dumps(message))


manager = ConnectionManager()
