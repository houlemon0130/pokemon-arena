from pydantic import BaseModel


class MoveScore(BaseModel):
    move_index: int
    move_name: str
    score: float
    reason: str


class AgentDecision(BaseModel):
    pokemon_name: str
    chosen_move_index: int
    chosen_move_name: str
    confidence: float
    reasoning: str
    move_scores: list[MoveScore] = []
    obedience_status: str = "obeyed"


class AgentInternalState(BaseModel):
    """Pokemon psychological state updated each turn."""

    pokemon_id: str
    fear: float = 0.0
    battle_lust: float = 0.0
    obedience_last_turn: str | None = None
    obedience_streak: int = 0
    last_emotion: str = "neutral"


class ReflectionResult(BaseModel):
    agent_id: str
    turn: int
    decision_was_correct: bool
    alternative_would_be_better: str | None = None
    learned_insight: str
    confidence_adjustment: float
    narrative: str
