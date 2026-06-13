import json
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect


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

    async def connect(
        self,
        websocket: WebSocket,
        meeting_code: str,
        client_id: str,
        display_name: str,
        is_host: bool = False,
    ):
        await websocket.accept()
        if meeting_code not in self.rooms:
            self.rooms[meeting_code] = {}
        room = self.rooms[meeting_code]
        # Only one host per room — first eligible joiner wins
        has_host = any(info.get("is_host") for info in room.values())
        actual_is_host = is_host and not has_host
        room[client_id] = {
            "websocket": websocket,
            "display_name": display_name,
            "is_muted": False,
            "is_video_on": True,
            "is_host": actual_is_host,
        }

    def is_host(self, meeting_code: str, client_id: str) -> bool:
        room = self.rooms.get(meeting_code, {})
        return bool(room.get(client_id, {}).get("is_host", False))

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
                "is_host": info.get("is_host", False),
            }
            for cid, info in room.items()
        ]

    async def _safe_send(
        self,
        websocket: WebSocket,
        meeting_code: str,
        client_id: str,
        message: dict,
    ) -> bool:
        """Send to one client; remove them from the room if the socket is gone."""
        try:
            await websocket.send_text(json.dumps(message))
            return True
        except (WebSocketDisconnect, RuntimeError):
            self.disconnect(meeting_code, client_id)
            return False

    async def send_personal_message(self, message: dict, meeting_code: str, client_id: str) -> bool:
        room = self.rooms.get(meeting_code, {})
        participant = room.get(client_id)
        if not participant:
            return False
        return await self._safe_send(
            participant["websocket"], meeting_code, client_id, message
        )

    async def broadcast_to_room(self, message: dict, meeting_code: str, exclude_client_id: str | None = None):
        room = self.rooms.get(meeting_code, {})
        for cid, info in list(room.items()):
            if cid != exclude_client_id:
                await self._safe_send(info["websocket"], meeting_code, cid, message)


manager = ConnectionManager()
