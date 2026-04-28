import pytest
from fastapi.testclient import TestClient

import app.agents.reflection as reflection_module
import app.pipeline.orchestrator as orchestrator_module
from app.api.battles import BATTLES
from app.main import app


client = TestClient(app)


def _receive_until(websocket, message_type: str) -> tuple[dict, list[dict]]:
    messages = []
    while True:
        message = websocket.receive_json()
        messages.append(message)
        if message["type"] == message_type:
            return message, messages


def test_start_battle_with_unknown_battle_id_returns_error():
    with client.websocket_connect("/ws/battles/not-a-real-battle") as websocket:
        websocket.send_json({"type": "start_battle"})
        message = websocket.receive_json()

    assert message == {"type": "error", "message": "battle_not_found"}


@pytest.mark.asyncio
async def test_complete_battle_flow_records_turn_results_winner_and_history(monkeypatch):
    async def fake_call_llm(messages, temperature=0.7, max_tokens=500, json_mode=True):
        content = messages[0]["content"]
        if "选择招式" in content:
            return {
                "chosen_move_index": 2,
                "chosen_move_name": "Scratch",
                "confidence": 0.8,
                "reasoning": "Use a deterministic move for the integration test.",
                "obedience_status": "obeyed",
            }
        if "复盘" in content:
            return {
                "decision_was_correct": True,
                "alternative_would_be_better": None,
                "learned_insight": "Keep attacking.",
                "narrative": "继续进攻。",
            }
        return {"instruction": "attack"}

    monkeypatch.setattr(orchestrator_module, "call_llm", fake_call_llm)
    monkeypatch.setattr(reflection_module, "call_llm", fake_call_llm)
    monkeypatch.setattr("app.engine.battle.random.random", lambda: 0.5)
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 1.0)

    response = client.post(
        "/api/battles",
        json={
            "player_active_id": "squirtle",
            "player_bench_ids": ["pikachu", "eevee"],
            "opponent_team_ids": ["charmander", "bulbasaur", "gengar"],
        },
    )
    assert response.status_code == 200
    battle = response.json()

    turn_results = []
    with client.websocket_connect(battle["ws_url"]) as websocket:
        websocket.send_json({"type": "start_battle"})
        started = websocket.receive_json()

        assert started["type"] == "battle_started"
        assert started["data"]["current_turn"] == 0
        assert started["data"]["history"] == []

        for expected_turn in (1, 2):
            websocket.send_json({"type": "player_move", "move_index": 0})
            turn_result, messages = _receive_until(websocket, "turn_result")
            turn_results.append(turn_result["data"])

            assert any(message["type"] == "phase_change" for message in messages)
            assert turn_result["battle_id"] == battle["battle_id"]
            assert turn_result["data"]["turn"] == expected_turn
            assert turn_result["data"]["events"]
            assert "Squirtle used Water Gun." in turn_result["data"]["events"]
            assert set(turn_result["data"]["hp_after"]) == {"squirtle", "charmander"}

        ended = websocket.receive_json()

    assert ended["type"] == "battle_ended"
    assert ended["battle_id"] == battle["battle_id"]
    assert ended["data"]["winner"]

    battle_state = BATTLES[battle["battle_id"]]
    assert battle_state["winner"] == ended["data"]["winner"]
    assert battle_state["current_turn"] == 2
    assert battle_state["history"] == turn_results
    assert [entry["turn"] for entry in battle_state["history"]] == [1, 2]
