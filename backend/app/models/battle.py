from pydantic import BaseModel

from .pokemon import MoveDef, Personality, Stats


class BattlePokemon(BaseModel):
    """Runtime battle instance for a pokemon."""

    def_id: str
    name: str
    types: list[str]
    stats: Stats
    moves: list[MoveDef]
    personality: Personality | None = None
    current_hp: int
    max_hp: int
    status: str | None = None
    status_turns: int = 0


class TurnResult(BaseModel):
    turn: int
    player_move: str
    agent_move: str
    player_damage: int
    agent_damage: int
    events: list[str]
    hp_after: dict[str, int]


class BattleStateV2(BaseModel):
    battle_id: str
    player_team_id: str
    opponent_team_id: str
    current_turn: int
    phase: str = "player_select"
    winner: str | None = None
    history: list[TurnResult] = []
    chat_history: list = []
    tool_call_history: list = []
    reflection_history: list = []
