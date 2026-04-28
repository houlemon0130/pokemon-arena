import json


def test_personalities_json_is_valid():
    with open("app/data/personalities.json") as f:
        data = json.load(f)

    assert len(data) == 6
    for personality in data.values():
        assert "obedience_mult" in personality
        assert "fear_mult" in personality
        assert "battle_lust_base" in personality
        assert 0 <= personality["aggression"] <= 1


def test_moves_json_is_valid():
    with open("app/data/moves.json") as f:
        data = json.load(f)

    assert len(data) >= 24
    for move in data.values():
        assert "type" in move
        assert "category" in move


def test_pokemon_json_is_valid():
    with open("app/data/pokemon.json") as f:
        data = json.load(f)

    assert len(data) == 6
    for pokemon in data.values():
        assert len(pokemon["types"]) >= 1
        assert len(pokemon["moves"]) == 4


def test_social_graph_json_is_valid():
    with open("app/data/social_graph.json") as f:
        data = json.load(f)

    all_ids = ["charmander", "squirtle", "bulbasaur", "pikachu", "eevee", "gengar"]
    for pokemon_id in all_ids:
        assert pokemon_id in data
