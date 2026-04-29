import asyncio
import time
from types import SimpleNamespace

import pytest

from app.agents.reflection import run_reflection
from app.pipeline.orchestrator import TurnOrchestrator


class _WsRecorder:
    def __init__(self):
        self.events = []

    async def broadcast(self, event):
        self.events.append(event)


def _team():
    return {
        "active": {
            "def_id": "charmander",
            "name": "Charmander",
            "types": ["fire"],
            "moves": [{"id": "ember", "name": "Ember", "type": "fire", "category": "special", "power": 40, "accuracy": 100, "pp": 25}],
            "stats": {"hp": 120, "attack": 52, "defense": 43, "sp_attack": 60, "sp_defense": 50, "speed": 65},
            "current_hp": 100,
            "max_hp": 120,
            "status": None,
            "personality": _personality("勇敢", "大胆而自信", "偏爱进攻。"),
        },
        "bench": [
            {"def_id": "pikachu", "name": "Pikachu", "types": ["electric"], "battle_lust": 0.3, "stats": {"hp": 90, "attack": 55, "defense": 40, "sp_attack": 50, "sp_defense": 50, "speed": 90}},
            {"def_id": "gengar", "name": "Gengar", "types": ["ghost"], "battle_lust": 0.3, "stats": {"hp": 90, "attack": 65, "defense": 60, "sp_attack": 130, "sp_defense": 75, "speed": 110}},
        ],
    }


def _personality(name="顽皮", voice="顽皮而好动", modifier="喜欢主动请战。"):
    return {
        "id": "playful",
        "name": name,
        "aggression": 0.7,
        "risk_tolerance": 0.8,
        "obedience_mult": 0.8,
        "fear_mult": 0.7,
        "battle_lust_base": 0.6,
        "prompt_modifier": modifier,
        "narrative_voice": voice,
    }


async def _async_noop(*args, **kwargs):
    """空操作异步函数，用于 mock 新方法."""


@pytest.mark.asyncio
async def test_run_reflection_returns_valid_structure(monkeypatch):
    async def fake_call_llm(*args, **kwargs):
        return {
            "decision_was_correct": True,
            "alternative_would_be_better": None,
            "learned_insight": "火系压制有效",
            "narrative": "我判断得不错。",
        }

    monkeypatch.setattr("app.agents.reflection.call_llm", fake_call_llm)

    result = await run_reflection(
        "charmander",
        {"chosen_move_name": "Ember", "obedience_status": "obeyed"},
        SimpleNamespace(turn=1, agent_damage=30, player_move="Tackle", player_damage=10),
        "brave",
    )

    assert result["agent_id"] == "charmander"
    assert result["turn"] == 1
    assert result["decision_was_correct"] is True
    assert result["confidence_adjustment"] == 0.05


@pytest.mark.asyncio
async def test_bench_agent_calls_llm_with_stateful_prompt(monkeypatch):
    ws = _WsRecorder()
    opponent_team = {
        "active": {
            "def_id": "charmander",
            "name": "小火龙",
            "types": ["fire"],
            "current_hp": 35,
            "max_hp": 120,
            "status": "burn",
            "personality": _personality("勇敢", "大胆而自信", "偏爱进攻。"),
        },
        "bench": [],
    }
    player_team = {
        "active": {
            "def_id": "squirtle",
            "name": "杰尼龟",
            "types": ["water"],
            "current_hp": 100,
            "max_hp": 127,
            "status": None,
            "personality": _personality("沉稳", "冷静而沉稳", "等待合适时机。"),
        },
        "bench": [],
    }
    bench = {
        "def_id": "pikachu",
        "name": "皮卡丘",
        "types": ["electric"],
        "battle_lust": 0.83,
        "status": "paralysis",
        "personality": _personality(),
    }
    orchestrator = TurnOrchestrator(opponent_team, player_team, ws)
    captured = {}

    async def fake_call_llm(messages, **kwargs):
        captured["messages"] = messages
        captured["kwargs"] = kwargs
        return {"content": "让我上让我上！杰尼龟看起来好欺负！"}

    monkeypatch.setattr("app.pipeline.orchestrator.call_llm", fake_call_llm)

    result = await orchestrator._run_bench_agent(bench)

    assert result == {
        "pokemon_id": "pikachu",
        "battle_lust": 0.83,
        "message": "让我上让我上！杰尼龟看起来好欺负！",
    }
    assert captured["kwargs"] == {"temperature": 0.8, "max_tokens": 100, "json_mode": False}
    prompt_text = "\n".join(message["content"] for message in captured["messages"])
    assert "场上队友: 小火龙 (fire) HP:35/120 状态:burn" in prompt_text
    assert "对手: 杰尼龟 (water) HP:100/127 状态:正常" in prompt_text
    assert "自己的上场欲望值(0-1):0.83" in prompt_text
    assert "自己的性格描述: 顽皮而好动；喜欢主动请战。" in prompt_text


@pytest.mark.asyncio
async def test_turn_orchestrator_broadcasts_phases_in_order(monkeypatch):
    ws = _WsRecorder()
    orchestrator = TurnOrchestrator(_team(), _team(), ws)

    async def fake_bench_agent(bp):
        return {"pokemon_id": bp["def_id"], "message": "ready", "battle_lust": bp["battle_lust"]}

    async def fake_trainer(_bench_results, _tool_results=None):
        return {"suggested_move": "Ember", "strategy": "aggressive", "reasoning": "press"}

    async def fake_pokemon(_trainer_decision):
        return {"chosen_move_index": 0, "chosen_move_name": "Ember", "obedience_status": "obeyed"}

    async def fake_reflection(*args, **kwargs):
        return {"agent_id": "charmander", "turn": 1, "decision_was_correct": True}

    monkeypatch.setattr(orchestrator, "_run_bench_agent", fake_bench_agent)
    monkeypatch.setattr(orchestrator, "_run_trainer_agent", fake_trainer)
    monkeypatch.setattr(orchestrator, "_run_pokemon_agent", fake_pokemon)
    monkeypatch.setattr("app.pipeline.orchestrator.run_reflection", fake_reflection)
    # Mock new methods added in features 2 & 4
    monkeypatch.setattr(orchestrator, "_generate_team_chat", _async_noop)
    monkeypatch.setattr(orchestrator, "_generate_cross_talk", _async_noop)
    monkeypatch.setattr(orchestrator, "_execute_trainer_tools", _async_noop)
    monkeypatch.setattr(
        orchestrator,
        "_resolve_turn",
        lambda _player_move_index, _agent_move_index: SimpleNamespace(
            turn=0,
            agent_damage=20,
            player_move="Tackle",
            player_damage=12,
        ),
    )

    await orchestrator.execute_turn(0)

    phases = [event["data"]["phase"] for event in ws.events if event["type"] == "phase_change"]
    assert phases == ["bench_observe", "trainer_strategy", "pokemon_decide", "resolving", "reflection"]


@pytest.mark.asyncio
async def test_turn_orchestrator_broadcasts_trainer_and_pokemon_decisions(monkeypatch):
    ws = _WsRecorder()
    orchestrator = TurnOrchestrator(_team(), _team(), ws)

    async def fake_bench_agent(bp):
        return {"pokemon_id": bp["def_id"], "message": "ready", "battle_lust": bp["battle_lust"]}

    async def fake_trainer(_bench_results, _tool_results=None):
        return {"suggested_move": "Ember", "strategy": "aggressive", "reasoning": "press"}

    async def fake_pokemon(_trainer_decision):
        return {
            "chosen_move_index": 0,
            "chosen_move_name": "Ember",
            "confidence": 0.85,
            "reasoning": "I trust the call.",
            "obedience_status": "obeyed",
        }

    async def fake_reflection(*args, **kwargs):
        return {"agent_id": "charmander", "turn": 1, "decision_was_correct": True}

    monkeypatch.setattr(orchestrator, "_run_bench_agent", fake_bench_agent)
    monkeypatch.setattr(orchestrator, "_run_trainer_agent", fake_trainer)
    monkeypatch.setattr(orchestrator, "_run_pokemon_agent", fake_pokemon)
    monkeypatch.setattr("app.pipeline.orchestrator.run_reflection", fake_reflection)
    # Mock new methods
    monkeypatch.setattr(orchestrator, "_generate_team_chat", _async_noop)
    monkeypatch.setattr(orchestrator, "_generate_cross_talk", _async_noop)
    monkeypatch.setattr(orchestrator, "_execute_trainer_tools", _async_noop)
    monkeypatch.setattr(
        orchestrator,
        "_resolve_turn",
        lambda _player_move_index, _agent_move_index: SimpleNamespace(
            turn=0,
            agent_damage=20,
            player_move="Tackle",
            player_damage=12,
        ),
    )

    await orchestrator.execute_turn(0)

    decisions = [event["data"] for event in ws.events if event["type"] == "agent_decision"]
    assert decisions == [
        {
            "agent_type": "trainer",
            "reasoning": "press",
            "suggested_move": "Ember",
            "strategy": "aggressive",
        },
        {
            "agent_type": "pokemon",
            "chosen_move_name": "Ember",
            "confidence": 0.85,
            "reasoning": "I trust the call.",
            "obedience_status": "obeyed",
        },
    ]


@pytest.mark.asyncio
async def test_turn_orchestrator_rejects_invalid_player_move_before_turn_starts():
    ws = _WsRecorder()
    orchestrator = TurnOrchestrator(_team(), _team(), ws)

    with pytest.raises(ValueError, match="invalid_player_move_index"):
        await orchestrator.execute_turn(1)

    assert orchestrator.turn == 0
    assert ws.events == []


@pytest.mark.asyncio
async def test_bench_agents_run_concurrently(monkeypatch):
    ws = _WsRecorder()
    orchestrator = TurnOrchestrator(_team(), _team(), ws)

    async def slow_bench_agent(bp):
        await asyncio.sleep(0.03)
        return {"pokemon_id": bp["def_id"], "message": "ready", "battle_lust": bp["battle_lust"]}

    async def fake_trainer(_bench_results, _tool_results=None):
        return {"suggested_move": "Ember", "strategy": "aggressive", "reasoning": "press"}

    async def fake_pokemon(_trainer_decision):
        return {"chosen_move_index": 0, "chosen_move_name": "Ember", "obedience_status": "obeyed"}

    async def fake_reflection(*args, **kwargs):
        return {"agent_id": "charmander", "turn": 1, "decision_was_correct": True}

    monkeypatch.setattr(orchestrator, "_run_bench_agent", slow_bench_agent)
    monkeypatch.setattr(orchestrator, "_run_trainer_agent", fake_trainer)
    monkeypatch.setattr(orchestrator, "_run_pokemon_agent", fake_pokemon)
    monkeypatch.setattr("app.pipeline.orchestrator.run_reflection", fake_reflection)
    # Mock new methods
    monkeypatch.setattr(orchestrator, "_generate_team_chat", _async_noop)
    monkeypatch.setattr(orchestrator, "_generate_cross_talk", _async_noop)
    monkeypatch.setattr(orchestrator, "_execute_trainer_tools", _async_noop)
    monkeypatch.setattr(
        orchestrator,
        "_resolve_turn",
        lambda _player_move_index, _agent_move_index: SimpleNamespace(
            turn=0,
            agent_damage=20,
            player_move="Tackle",
            player_damage=12,
        ),
    )

    start = time.perf_counter()
    await orchestrator.execute_turn(0)
    elapsed = time.perf_counter() - start

    assert elapsed < 0.055


@pytest.mark.asyncio
async def test_parse_json_decision_extracts_from_code_block():
    """验证 _parse_json_decision 能从 ```json 代码块中正确提取 JSON."""
    text = """我的分析过程...
对手的火系招式对我们威胁很大。

```json
{"chosen_move_index": 2, "chosen_move_name": "水枪", "confidence": 0.9, "reasoning": "水系克制火系", "obedience_status": "obeyed"}
```
以上就是我的决策。"""
    default = {"chosen_move_index": 0, "chosen_move_name": "", "confidence": 0, "reasoning": "", "obedience_status": "unknown"}
    result = TurnOrchestrator._parse_json_decision(text, default)
    assert result["chosen_move_index"] == 2
    assert result["chosen_move_name"] == "水枪"
    assert result["confidence"] == 0.9
    assert result["obedience_status"] == "obeyed"


@pytest.mark.asyncio
async def test_parse_json_decision_handles_nested_json():
    """验证 _parse_json_decision 能通过 brace-counting 处理嵌套 JSON."""
    text = """分析完成。

{"suggested_move": "暗影球", "strategy": "aggressive", "reasoning": "对手血量低，使用高威力招式尽快结束战斗。同时需要考虑{属性克制}的问题。"}"""
    default = {"suggested_move": "", "strategy": "", "reasoning": ""}
    result = TurnOrchestrator._parse_json_decision(text, default)
    assert result["suggested_move"] == "暗影球"
    assert result["strategy"] == "aggressive"
    assert "属性克制" in result["reasoning"]


@pytest.mark.asyncio
async def test_parse_json_decision_returns_default_on_failure():
    """验证 _parse_json_decision 在无法解析时返回 default."""
    text = "没有JSON的普通文本回复"
    default = {"chosen_move_index": 0, "chosen_move_name": "默认", "confidence": 0, "reasoning": "", "obedience_status": "unknown"}
    result = TurnOrchestrator._parse_json_decision(text, default)
    assert result == default


@pytest.mark.asyncio
async def test_update_behavior_states_records_player_move(monkeypatch):
    """验证 _update_behavior_states 正确记录玩家出招到 OpponentModel."""
    ws = _WsRecorder()
    orchestrator = TurnOrchestrator(_team(), _team(), ws)

    # Spy on opponent_model.record_move
    recorded_calls = []
    def fake_record_move(move_type, damage, hp_pct, was_se):
        recorded_calls.append({"move_type": move_type, "damage": damage, "hp_pct": hp_pct, "was_se": was_se})
    monkeypatch.setattr(orchestrator.opponent_model, "record_move", fake_record_move)

    result = SimpleNamespace(turn=1, player_damage=40, agent_damage=20, player_move="Ember")
    orchestrator._update_behavior_states(result, 0, {"chosen_move_index": 0})

    assert len(recorded_calls) == 1
    assert recorded_calls[0]["move_type"] == "special"
    assert recorded_calls[0]["damage"] == 40
    assert recorded_calls[0]["was_se"] is False  # Fire vs Fire is not super effective


@pytest.mark.asyncio
async def test_get_voice_extracts_narrative_voice():
    """验证 _get_voice 正确提取 narrative_voice."""
    pokemon = {
        "name": "皮卡丘",
        "personality": {"narrative_voice": "顽皮而好动", "name": "顽皮"},
    }
    assert TurnOrchestrator._get_voice(pokemon) == "顽皮而好动"

    pokemon_no_personality = {"name": "未知"}
    assert TurnOrchestrator._get_voice(pokemon_no_personality) == "普通"
