import pytest

from app.models.agent import (
    AgentDecision,
    AgentInternalState,
    MoveScore,
    ReflectionResult,
)
from app.models.battle import BattlePokemon, BattleStateV2, TurnResult
from app.models.pokemon import MoveDef, Personality, PokemonDef, Stats
from app.models.team import ChatMessage, TeamState, ToolCall


def test_stats_model():
    s = Stats(hp=120, attack=95, defense=78, sp_attack=109, sp_defense=85, speed=100)
    assert s.hp == 120


def test_move_def_model():
    m = MoveDef(id="火花", name="火花", type="fire", category="special", power=40, accuracy=100, pp=25)
    assert m.id == "火花"
    assert m.effect is None


def test_personality_model_has_behavior_params():
    p = Personality(
        id="brave",
        name="Brave",
        aggression=0.8,
        risk_tolerance=0.7,
        obedience_mult=0.6,
        fear_mult=0.3,
        battle_lust_base=0.5,
        prompt_modifier="喜欢进攻",
        narrative_voice="大胆自信",
    )
    assert p.fear_mult == 0.3
    assert p.obedience_mult == 0.6


def test_battle_pokemon_model():
    bp = BattlePokemon(
        def_id="charmander",
        name="Charmander",
        types=["fire"],
        stats=Stats(hp=120, attack=95, defense=78, sp_attack=109, sp_defense=85, speed=100),
        moves=[],
        personality=None,
        current_hp=120,
        max_hp=120,
    )
    assert bp.current_hp == 120


def test_agent_internal_state_model():
    state = AgentInternalState(pokemon_id="charmander", fear=0.2, battle_lust=0.5)
    assert state.fear == 0.2


def test_reflection_result_model():
    r = ReflectionResult(
        agent_id="gengar",
        turn=1,
        decision_was_correct=True,
        learned_insight="攻击是对的",
        confidence_adjustment=0.05,
        narrative="不后悔",
    )
    assert r.confidence_adjustment == 0.05


def test_team_state_model():
    ts = TeamState(
        team_id="team_1",
        trainer_style="balanced",
        active_pokemon_id="charmander",
        bench_pokemon_ids=["bulbasaur", "squirtle"],
        social_graph={},
        internal_states={},
    )
    assert len(ts.bench_pokemon_ids) == 2


def test_chat_message_model():
    msg = ChatMessage(
        turn=1,
        from_agent="pikachu",
        to_agent="trainer",
        channel="plea",
        content="让我上！",
        emotion="excited",
    )
    assert msg.channel == "plea"


def test_tool_call_model():
    tc = ToolCall(
        turn=1,
        agent_id="gengar",
        tool_name="check_type_effectiveness",
        input_params={"move_type": "ghost", "defender_types": ["fire"]},
        output_result={"multiplier": 1.0, "effect_text": "普通"},
        agent_comment="伤害正常",
    )
    assert tc.tool_name == "check_type_effectiveness"
