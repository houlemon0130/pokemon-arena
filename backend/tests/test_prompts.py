from app.agents.prompts.bench import build_bench_system_prompt, build_bench_turn_message
from app.agents.prompts.chat import build_chat_prompt
from app.agents.prompts.pokemon import build_pokemon_system_prompt, build_pokemon_turn_message
from app.agents.prompts.trainer import build_trainer_system_prompt, build_trainer_turn_message
from app.models.battle import BattlePokemon
from app.models.pokemon import MoveDef, Personality, Stats


def _stats():
    return Stats(hp=120, attack=95, defense=78, sp_attack=109, sp_defense=85, speed=100)


def _personality(personality_id="clever", aggression=0.5):
    return Personality(
        id=personality_id,
        name="Clever",
        aggression=aggression,
        risk_tolerance=0.5,
        obedience_mult=1.0,
        fear_mult=0.6,
        battle_lust_base=0.3,
        prompt_modifier="优先分析属性克制。",
        narrative_voice="聪明而策略性",
    )


def _moves():
    return [
        MoveDef(id="ember", name="Ember", type="fire", category="special", power=40, accuracy=100, pp=25),
        MoveDef(id="scratch", name="Scratch", type="normal", category="physical", power=40, accuracy=100, pp=35),
        MoveDef(id="growl", name="Growl", type="normal", category="status", accuracy=100, pp=40),
        MoveDef(id="flamethrower", name="Flamethrower", type="fire", category="special", power=90, accuracy=100, pp=15),
    ]


def _pokemon(name="Charmander", types=None, personality=None):
    return BattlePokemon(
        def_id=name.lower(),
        name=name,
        types=types or ["fire"],
        stats=_stats(),
        moves=_moves(),
        personality=personality or _personality(),
        current_hp=100,
        max_hp=120,
    )


def test_trainer_prompt_contains_style_prediction_and_bench_focus():
    prompt = build_trainer_system_prompt("balanced")
    assert "balanced" in prompt
    assert "对手模型" in prompt
    assert "板凳" in prompt


def test_trainer_turn_message_contains_prediction_and_bench_opinions():
    msg = build_trainer_turn_message(
        _pokemon(),
        _pokemon("Squirtle", ["water"]),
        {"predicted_move_type": "attack", "confidence": 0.8},
        [{"pokemon_id": "pikachu", "battle_lust": 0.7, "message": "让我上场！"}],
        2,
        "上回合火系压制有效",
    )
    assert "attack" in msg
    assert "80%" in msg
    assert "pikachu" in msg
    assert "上回合火系压制有效" in msg


def test_active_pokemon_prompts_include_moves_state_and_tools():
    pokemon = _pokemon()
    system_prompt = build_pokemon_system_prompt(pokemon, ["check_type_effectiveness"])
    turn_msg = build_pokemon_turn_message(
        pokemon,
        _pokemon("Squirtle", ["water"]),
        {"suggested_move": "Ember", "strategy": "aggressive", "reasoning": "试探伤害"},
        fear_level=0.45,
        obedience_result="modified",
        turn=3,
    )
    assert "check_type_effectiveness" in system_prompt
    assert "优先分析属性克制" in system_prompt
    assert turn_msg.count("[") >= 4
    assert "恐惧:45%" in turn_msg
    assert "modified" in turn_msg
    assert "克制提示" in turn_msg


def test_bench_prompts_include_analysis_focus_and_battle_lust():
    bench = _pokemon("Pikachu", ["electric"], _personality("playful", aggression=0.7))
    system_prompt = build_bench_system_prompt(bench)
    turn_msg = build_bench_turn_message(bench, _pokemon(), _pokemon("Squirtle", ["water"]), 0.72, 4)
    assert "观战" in system_prompt
    assert "分析" in system_prompt
    assert "上场欲望:72%" in turn_msg
    assert "Squirtle" in turn_msg


def test_chat_prompt_contains_voice_and_goal():
    prompt = build_chat_prompt(_pokemon(), "opponent_active", "trash_talk")
    assert "聪明而策略性" in prompt
    assert "trash_talk" in prompt
    assert "opponent_active" in prompt
