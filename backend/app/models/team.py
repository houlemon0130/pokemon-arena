from pydantic import BaseModel


class TeamState(BaseModel):
    team_id: str
    trainer_style: str
    active_pokemon_id: str
    bench_pokemon_ids: list[str]
    social_graph: dict[str, dict[str, float]]
    internal_states: dict[str, dict]


class ChatMessage(BaseModel):
    turn: int
    from_agent: str
    to_agent: str
    channel: str
    content: str
    emotion: str


class ToolCall(BaseModel):
    turn: int
    agent_id: str
    tool_name: str
    input_params: dict
    output_result: dict
    agent_comment: str
