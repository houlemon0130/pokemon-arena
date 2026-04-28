from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_pokemon_list():
    response = client.get("/api/pokemon")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    assert any(pokemon["id"] == "charmander" for pokemon in data)


def test_get_pokemon_detail():
    response = client.get("/api/pokemon/charmander")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "charmander"
    assert data["types"] == ["fire"]


def test_create_battle_returns_ws_url():
    response = client.post(
        "/api/battles",
        json={
            "player_active_id": "charmander",
            "player_bench_ids": ["squirtle", "bulbasaur"],
            "opponent_team_ids": ["gengar", "pikachu", "eevee"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["battle_id"]
    assert data["ws_url"] == f"/ws/battles/{data['battle_id']}"


def test_battle_websocket_connects():
    battle = client.post(
        "/api/battles",
        json={
            "player_active_id": "charmander",
            "player_bench_ids": ["squirtle", "bulbasaur"],
            "opponent_team_ids": ["gengar", "pikachu", "eevee"],
        },
    ).json()

    with client.websocket_connect(battle["ws_url"]) as websocket:
        websocket.send_json({"type": "start_battle"})
        message = websocket.receive_json()

    assert message["type"] == "battle_started"
