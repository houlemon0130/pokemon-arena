from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.battles import BATTLES

router = APIRouter()

SUPPORTED_MESSAGE_TYPES = {
    "start_battle",
    "player_move",
    "player_switch",
    "encourage_pokemon",
    "rematch",
    "leave",
}


@router.websocket("/ws/battles/{battle_id}")
async def battle_websocket(websocket: WebSocket, battle_id: str):
    await websocket.accept()
    battle = BATTLES.get(battle_id, {"battle_id": battle_id, "phase": "unknown"})

    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")
            if message_type == "leave":
                await websocket.send_json({"type": "left", "battle_id": battle_id})
                break
            if message_type not in SUPPORTED_MESSAGE_TYPES:
                await websocket.send_json({"type": "error", "message": "unsupported_message_type"})
                continue
            if message_type == "start_battle":
                battle["phase"] = "started"
                await websocket.send_json({"type": "battle_started", "battle_id": battle_id, "data": battle})
            else:
                await websocket.send_json({"type": "ack", "message_type": message_type, "battle_id": battle_id})
    except WebSocketDisconnect:
        return
