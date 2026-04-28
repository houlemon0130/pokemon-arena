import json
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.battles import BATTLES
from app.pipeline.orchestrator import TurnOrchestrator

router = APIRouter()

SUPPORTED_MESSAGE_TYPES = {
    "start_battle",
    "player_move",
    "player_switch",
    "encourage_pokemon",
    "rematch",
    "leave",
}


class BattleWebSocketBroadcaster:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket

    async def broadcast(self, message: dict):
        await self.websocket.send_json(message)


def _data_path(filename: str) -> Path:
    return Path(__file__).resolve().parents[1] / "data" / filename


def _load_data(filename: str) -> dict:
    with _data_path(filename).open() as f:
        return json.load(f)


def _build_runtime_pokemon(pokemon_id: str) -> dict:
    pokemon_defs = _load_data("pokemon.json")
    move_defs = _load_data("moves.json")
    personality_defs = _load_data("personalities.json")
    pokemon = pokemon_defs[pokemon_id]
    personality = personality_defs[pokemon["personality"]]

    return {
        "def_id": pokemon["id"],
        "name": pokemon["name"],
        "types": pokemon["types"],
        "stats": pokemon["stats"],
        "moves": [move_defs[move_id] for move_id in pokemon["moves"]],
        "personality": personality,
        "current_hp": pokemon["stats"]["hp"],
        "max_hp": pokemon["stats"]["hp"],
        "status": None,
        "status_turns": 0,
        "battle_lust": personality["battle_lust_base"],
    }


def _build_teams(battle: dict) -> tuple[dict, dict]:
    player_team = {
        "active": _build_runtime_pokemon(battle["player_active_id"]),
        "bench": [_build_runtime_pokemon(pokemon_id) for pokemon_id in battle["player_bench_ids"]],
    }
    opponent_ids = battle["opponent_team_ids"]
    opponent_team = {
        "active": _build_runtime_pokemon(opponent_ids[0]),
        "bench": [_build_runtime_pokemon(pokemon_id) for pokemon_id in opponent_ids[1:]],
    }
    return opponent_team, player_team


def _serialize_turn_result(result) -> dict:
    if hasattr(result, "model_dump"):
        return result.model_dump()
    if hasattr(result, "dict"):
        return result.dict()
    if isinstance(result, dict):
        return result
    return vars(result)


def _public_battle(battle: dict, orchestrator: TurnOrchestrator | None = None) -> dict:
    data = {key: value for key, value in battle.items() if not key.startswith("_")}
    if orchestrator is not None and hasattr(orchestrator, "player_team") and hasattr(orchestrator, "opponent_team"):
        data["player_team"] = orchestrator.player_team
        data["opponent_team"] = orchestrator.opponent_team
    return data


def _get_orchestrator(battle: dict, websocket: WebSocket):
    broadcaster = BattleWebSocketBroadcaster(websocket)
    if "_orchestrator" not in battle:
        opponent_team, player_team = _build_teams(battle)
        battle["_orchestrator"] = TurnOrchestrator(
            opponent_team,
            player_team,
            broadcaster,
        )
    else:
        battle["_orchestrator"].ws = broadcaster
    return battle["_orchestrator"]


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
                orchestrator = _get_orchestrator(battle, websocket)
                await websocket.send_json(
                    {"type": "battle_started", "battle_id": battle_id, "data": _public_battle(battle, orchestrator)}
                )
            elif message_type == "player_move":
                if battle.get("phase") == "unknown":
                    await websocket.send_json({"type": "error", "message": "battle_not_found"})
                    continue
                move_index = message.get("move_index")
                if not isinstance(move_index, int):
                    await websocket.send_json({"type": "error", "message": "invalid_move_index"})
                    continue
                try:
                    result = await _get_orchestrator(battle, websocket).execute_turn(move_index)
                except ValueError as exc:
                    if str(exc) == "invalid_player_move_index":
                        await websocket.send_json({"type": "error", "message": "invalid_move_index"})
                        continue
                    raise
                await websocket.send_json(
                    {
                        "type": "turn_result",
                        "battle_id": battle_id,
                        "data": _serialize_turn_result(result),
                    }
                )
            else:
                await websocket.send_json({"type": "ack", "message_type": message_type, "battle_id": battle_id})
    except WebSocketDisconnect:
        return
