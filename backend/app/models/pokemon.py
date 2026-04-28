from pydantic import BaseModel


class Stats(BaseModel):
    hp: int
    attack: int
    defense: int
    sp_attack: int
    sp_defense: int
    speed: int


class MoveDef(BaseModel):
    id: str
    name: str
    type: str
    category: str
    power: int | None = None
    accuracy: int = 100
    pp: int
    priority: int = 0
    effect: str | None = None


class Personality(BaseModel):
    id: str
    name: str
    aggression: float
    risk_tolerance: float
    obedience_mult: float
    fear_mult: float
    battle_lust_base: float
    prompt_modifier: str
    narrative_voice: str


class PokemonDef(BaseModel):
    id: str
    name: str
    types: list[str]
    stats: Stats
    moves: list[str]
    personality: str
