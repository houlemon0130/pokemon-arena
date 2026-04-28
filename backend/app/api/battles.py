from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/battles", tags=["battles"])

BATTLES: dict[str, dict] = {}


class CreateBattleRequest(BaseModel):
    player_active_id: str
    player_bench_ids: list[str]
    opponent_team_ids: list[str]


@router.post("")
async def create_battle(request: CreateBattleRequest):
    battle_id = str(uuid4())
    BATTLES[battle_id] = {
        "battle_id": battle_id,
        "player_active_id": request.player_active_id,
        "player_bench_ids": request.player_bench_ids,
        "opponent_team_ids": request.opponent_team_ids,
        "current_turn": 0,
        "phase": "created",
        "winner": None,
        "history": [],
    }
    return {"battle_id": battle_id, "ws_url": f"/ws/battles/{battle_id}"}
