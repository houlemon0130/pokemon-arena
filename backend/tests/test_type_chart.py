from app.engine.type_chart import TYPE_CHART, get_effectiveness


def test_fire_beats_grass():
    assert get_effectiveness("fire", ["grass"]) == 2.0


def test_water_beats_fire():
    assert get_effectiveness("water", ["fire"]) == 2.0


def test_grass_beats_water():
    assert get_effectiveness("grass", ["water"]) == 2.0


def test_electric_beats_water():
    assert get_effectiveness("electric", ["water"]) == 2.0


def test_normal_cannot_hit_ghost():
    assert get_effectiveness("normal", ["ghost"]) == 0.0


def test_neutral_matchup():
    assert get_effectiveness("normal", ["normal"]) == 1.0


def test_not_very_effective():
    assert get_effectiveness("fire", ["water"]) == 0.5


def test_dual_type_quad_effective():
    assert get_effectiveness("grass", ["water", "ground"]) == 4.0


def test_dual_type_quarter_effective():
    assert get_effectiveness("bug", ["fire", "flying"]) == 0.25


def test_all_18_types_are_covered():
    types = [
        "normal",
        "fire",
        "water",
        "electric",
        "grass",
        "ice",
        "fighting",
        "poison",
        "ground",
        "flying",
        "psychic",
        "bug",
        "rock",
        "ghost",
        "dragon",
        "dark",
        "steel",
        "fairy",
    ]
    for pokemon_type in types:
        assert pokemon_type in TYPE_CHART
        assert len(TYPE_CHART[pokemon_type]) == 18
