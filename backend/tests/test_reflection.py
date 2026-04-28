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
            "current_hp": 100,
            "max_hp": 120,
            "status": None,
            "personality": "brave",
        },
        "bench": [
            {"def_id": "pikachu", "name": "Pikachu", "types": ["electric"], "battle_lust": 0.3},
            {"def_id": "gengar", "name": "Gengar", "types": ["ghost"], "battle_lust": 0.3},
        ],
    }


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
async def test_turn_orchestrator_broadcasts_phases_in_order(monkeypatch):
    ws = _WsRecorder()
    orchestrator = TurnOrchestrator(_team(), _team(), ws)

    async def fake_bench_agent(bp):
        return {"pokemon_id": bp["def_id"], "message": "ready", "battle_lust": bp["battle_lust"]}

    async def fake_trainer(_bench_results):
        return {"suggested_move": "Ember", "strategy": "aggressive", "reasoning": "press"}

    async def fake_pokemon(_trainer_decision):
        return {"chosen_move_index": 0, "chosen_move_name": "Ember", "obedience_status": "obeyed"}

    async def fake_reflection(*args, **kwargs):
        return {"agent_id": "charmander", "turn": 1, "decision_was_correct": True}

    monkeypatch.setattr(orchestrator, "_run_bench_agent", fake_bench_agent)
    monkeypatch.setattr(orchestrator, "_run_trainer_agent", fake_trainer)
    monkeypatch.setattr(orchestrator, "_run_pokemon_agent", fake_pokemon)
    monkeypatch.setattr("app.pipeline.orchestrator.run_reflection", fake_reflection)
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
async def test_bench_agents_run_concurrently(monkeypatch):
    ws = _WsRecorder()
    orchestrator = TurnOrchestrator(_team(), _team(), ws)

    async def slow_bench_agent(bp):
        await asyncio.sleep(0.03)
        return {"pokemon_id": bp["def_id"], "message": "ready", "battle_lust": bp["battle_lust"]}

    async def fake_trainer(_bench_results):
        return {"suggested_move": "Ember", "strategy": "aggressive", "reasoning": "press"}

    async def fake_pokemon(_trainer_decision):
        return {"chosen_move_index": 0, "chosen_move_name": "Ember", "obedience_status": "obeyed"}

    async def fake_reflection(*args, **kwargs):
        return {"agent_id": "charmander", "turn": 1, "decision_was_correct": True}

    monkeypatch.setattr(orchestrator, "_run_bench_agent", slow_bench_agent)
    monkeypatch.setattr(orchestrator, "_run_trainer_agent", fake_trainer)
    monkeypatch.setattr(orchestrator, "_run_pokemon_agent", fake_pokemon)
    monkeypatch.setattr("app.pipeline.orchestrator.run_reflection", fake_reflection)
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
