from app.behavior.battle_lust import accumulate_battle_lust, check_plea_threshold
from app.behavior.fear import accumulate_fear, express_fear
from app.behavior.obedience import obedience_check
from app.behavior.opponent_model import OpponentModel
from app.behavior.social import apply_bond_effect, get_bond, load_social_graph


def _use_roll_sequence(monkeypatch):
    rolls = iter(i / 100 for i in range(100))
    monkeypatch.setattr("app.behavior.obedience.random.random", lambda: next(rolls))


def test_brave_defies_often(monkeypatch):
    _use_roll_sequence(monkeypatch)
    results = [obedience_check(0.6, 0.7, 0) for _ in range(100)]
    defiances = sum(1 for result in results if result == "defied")
    assert defiances >= 10


def test_timid_often_obeys(monkeypatch):
    _use_roll_sequence(monkeypatch)
    results = [obedience_check(1.3, 0.7, 0) for _ in range(100)]
    obeys = sum(1 for result in results if result == "obeyed")
    assert obeys >= 60


def test_defiance_streak_increases_future_defiance(monkeypatch):
    _use_roll_sequence(monkeypatch)
    results = [obedience_check(0.6, 0.7, 3) for _ in range(100)]
    defiances = sum(1 for result in results if result == "defied")
    assert defiances >= 20


def test_fear_accumulates_from_damage():
    fear = accumulate_fear(0.0, 50, 120, None, False, False)
    assert fear > 0.0


def test_fear_multiplier_changes_result():
    brave_fear = accumulate_fear(0.0, 50, 120, None, False, False) * 0.3
    timid_fear = accumulate_fear(0.0, 50, 120, None, False, False) * 1.5
    assert timid_fear > brave_fear


def test_fear_expression_levels():
    assert express_fear(0.2, 0.3, "brave") == "none"
    assert express_fear(0.45, 0.7, "brave") == "unease"
    assert express_fear(0.65, 0.8, "brave") == "suggest_retreat"
    assert express_fear(0.85, 0.9, "brave") == "force_defensive"
    assert express_fear(0.95, 1.0, "brave") == "attempt_flee"


def test_battle_lust_rises_with_type_advantage():
    lust = accumulate_battle_lust(0.3, "fire", ["grass"], False, False)
    assert lust > 0.3


def test_battle_lust_plea_threshold():
    assert check_plea_threshold(0.65) is True
    assert check_plea_threshold(0.40) is False


def test_social_graph_loads_correctly():
    graph = load_social_graph()
    assert graph["charmander"]["pikachu"] == 0.7
    assert graph["gengar"]["eevee"] == 0.1


def test_social_bond_helpers():
    graph = {"pikachu": {"charmander": 0.7}}
    assert get_bond(graph, "pikachu", "charmander") == 0.7
    assert get_bond(graph, "pikachu", "gengar") == 0.5
    assert apply_bond_effect(1.0, 0.7, "encouragement") == 1.35
    assert apply_bond_effect(1.0, 0.7, "suggestion_weight") == 1.21
    assert apply_bond_effect(1.0, 0.7, "criticism") == 0.5800000000000001


def test_opponent_model_tracks_moves():
    model = OpponentModel()
    model.record_move("attack", 40, 0.8, True)
    model.record_move("attack", 38, 0.7, False)
    pred = model.predict()
    assert pred["predicted_move_type"] == "attack"
