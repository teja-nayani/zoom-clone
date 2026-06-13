import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from websocket.manager import manager

router = APIRouter()


@router.websocket("/ws/{meeting_code}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_code: str, client_id: str):
    """
    WebSocket signaling endpoint for a meeting room.

    Connection handshake (in order):
      1. Snapshot existing participants BEFORE adding the new joiner.
      2. Accept & register the new joiner.
      3. Broadcast 'participant-joined' to every EXISTING client (they cache the name).
      4. Send 'existing-participants' directly to the NEW joiner so they can
         initiate WebRTC offers to everyone already in the room.

    This one-directional offer pattern (new joiner is always the OFFERER) eliminates
    the offer-collision problem that causes one-way video on refresh.

    Expected inbound message shape: { "type": "<event>", "payload": { ... } }
    """
    display_name = websocket.query_params.get("display_name", "Anonymous")
    is_host = websocket.query_params.get("is_host", "false").lower() == "true"

    # ── Step 1: snapshot BEFORE the new joiner is registered ─────────────────
    # get_participants() at this point returns only participants already in the room.
    existing = [
        p for p in manager.get_participants(meeting_code)
        if p["client_id"] != client_id   # defensive: exclude any ghost with the same id
    ]

    # ── Step 2: register the new joiner ──────────────────────────────────────
    await manager.connect(websocket, meeting_code, client_id, display_name, is_host=is_host)

    # ── Step 3: notify existing participants (they cache the name, no offer) ──
    await manager.broadcast_to_room(
        {
            "type": "participant-joined",
            "payload": {
                "client_id": client_id,
                "display_name": display_name,
                # Full room snapshot so existing clients keep their name map current
                "participants": manager.get_participants(meeting_code),
            },
        },
        meeting_code,
        exclude_client_id=client_id,
    )

    # ── Step 4: tell the new joiner who is already in the room ───────────────
    # The new joiner will create one RTCPeerConnection + offer per existing peer.
    if existing:
        await manager.send_personal_message(
            {
                "type": "existing-participants",
                "payload": {"participants": existing},
            },
            meeting_code,
            client_id,
        )

    # ── Message loop ──────────────────────────────────────────────────────────
    try:
        while True:
            try:
                raw = await websocket.receive_text()
            except (WebSocketDisconnect, RuntimeError):
                break

            data = json.loads(raw)
            event_type = data.get("type")
            payload = data.get("payload", {})

            if event_type in ("offer", "answer", "ice-candidate"):
                # Route peer-to-peer signaling directly to the target client
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
                if not manager.is_host(meeting_code, client_id):
                    continue
                target_id = payload.get("target")
                if target_id:
                    room = manager.rooms.get(meeting_code, {})
                    if target_id in room:
                        room[target_id]["is_muted"] = True
                    await manager.send_personal_message(
                        {"type": "host-muted-you", "payload": {}},
                        meeting_code,
                        target_id,
                    )
                    await manager.broadcast_to_room(
                        {
                            "type": "participant-audio-updated",
                            "payload": {"client_id": target_id, "is_muted": True},
                        },
                        meeting_code,
                    )

            elif event_type == "remove-participant":
                if not manager.is_host(meeting_code, client_id):
                    continue
                target_id = payload.get("target")
                if target_id:
                    await manager.send_personal_message(
                        {"type": "removed-from-meeting", "payload": {}},
                        meeting_code,
                        target_id,
                    )

            elif event_type == "chat-message":
                text = str(payload.get("text", "")).strip()
                if text:
                    await manager.broadcast_to_room(
                        {
                            "type": "chat-message",
                            "payload": {
                                "client_id": client_id,
                                "display_name": display_name,
                                # Server-side length cap to prevent abuse
                                "text": text[:1000],
                            },
                        },
                        meeting_code,
                        # No exclude_client_id: sender receives their own message
                        # as an echo so the ChatPanel only needs one code path.
                    )

            elif event_type == "leave-room":
                break

            elif event_type == "sync-room":
                # Client requests a fresh snapshot (e.g. after media is ready or reconnect)
                existing = [
                    p for p in manager.get_participants(meeting_code)
                    if p["client_id"] != client_id
                ]
                if existing:
                    await manager.send_personal_message(
                        {
                            "type": "existing-participants",
                            "payload": {"participants": existing},
                        },
                        meeting_code,
                        client_id,
                    )

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
