import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from websocket.manager import manager

router = APIRouter()


@router.websocket("/ws/{meeting_code}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_code: str, client_id: str):
    """
    WebSocket signaling endpoint for a meeting room.

    Expected inbound message shape:
      { "type": "<event>", "payload": { ... } }

    Supported client → server event types:
      join-room, leave-room, offer, answer, ice-candidate,
      toggle-audio, toggle-video, screen-share-started,
      screen-share-stopped, remove-participant, mute-participant
    """
    display_name = websocket.query_params.get("display_name", "Anonymous")
    await manager.connect(websocket, meeting_code, client_id, display_name)

    await manager.broadcast_to_room(
        {
            "type": "participant-joined",
            "payload": {
                "client_id": client_id,
                "display_name": display_name,
                "participants": manager.get_participants(meeting_code),
            },
        },
        meeting_code,
        exclude_client_id=client_id,
    )

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            event_type = data.get("type")
            payload = data.get("payload", {})

            if event_type in ("offer", "answer", "ice-candidate"):
                # Forward signaling messages directly to the target peer
                target_id = payload.get("target")
                if target_id:
                    await manager.send_personal_message(
                        {"type": event_type, "payload": {**payload, "from": client_id}},
                        meeting_code,
                        target_id,
                    )

            elif event_type == "toggle-audio":
                room = manager.rooms.get(meeting_code, {})
                if client_id in room:
                    room[client_id]["is_muted"] = payload.get("is_muted", False)
                await manager.broadcast_to_room(
                    {"type": "participant-audio-updated", "payload": {"client_id": client_id, **payload}},
                    meeting_code,
                )

            elif event_type == "toggle-video":
                room = manager.rooms.get(meeting_code, {})
                if client_id in room:
                    room[client_id]["is_video_on"] = payload.get("is_video_on", True)
                await manager.broadcast_to_room(
                    {"type": "participant-video-updated", "payload": {"client_id": client_id, **payload}},
                    meeting_code,
                )

            elif event_type == "screen-share-started":
                await manager.broadcast_to_room(
                    {"type": "screen-share-started", "payload": {"client_id": client_id}},
                    meeting_code,
                    exclude_client_id=client_id,
                )

            elif event_type == "screen-share-stopped":
                await manager.broadcast_to_room(
                    {"type": "screen-share-stopped", "payload": {"client_id": client_id}},
                    meeting_code,
                    exclude_client_id=client_id,
                )

            elif event_type == "mute-participant":
                target_id = payload.get("target")
                if target_id:
                    await manager.send_personal_message(
                        {"type": "host-muted-you", "payload": {}},
                        meeting_code,
                        target_id,
                    )

            elif event_type == "remove-participant":
                target_id = payload.get("target")
                if target_id:
                    await manager.send_personal_message(
                        {"type": "removed-from-meeting", "payload": {}},
                        meeting_code,
                        target_id,
                    )

            elif event_type == "leave-room":
                break

    except WebSocketDisconnect:
        pass

    finally:
        manager.disconnect(meeting_code, client_id)
        await manager.broadcast_to_room(
            {
                "type": "participant-left",
                "payload": {
                    "client_id": client_id,
                    "participants": manager.get_participants(meeting_code),
                },
            },
            meeting_code,
        )
