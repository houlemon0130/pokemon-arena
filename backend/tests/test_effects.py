from app.engine.effects import (
    apply_burn_damage,
    check_paralysis_skip,
    check_sleep_wake,
    get_effective_speed,
    try_apply_status,
)


def test_burn_damage_is_one_eighth():
    assert apply_burn_damage(120) == 15


def test_burn_damage_has_minimum_of_one():
    assert apply_burn_damage(5) == 1


def test_paralysis_has_25_percent_skip_chance(monkeypatch):
    monkeypatch.setattr("app.engine.effects.random.random", lambda: 0.24)
    assert check_paralysis_skip() is True

    monkeypatch.setattr("app.engine.effects.random.random", lambda: 0.25)
    assert check_paralysis_skip() is False


def test_sleep_has_33_percent_wake_chance(monkeypatch):
    monkeypatch.setattr("app.engine.effects.random.random", lambda: 0.32)
    assert check_sleep_wake() is True

    monkeypatch.setattr("app.engine.effects.random.random", lambda: 0.34)
    assert check_sleep_wake() is False


def test_try_apply_status_when_empty(monkeypatch):
    monkeypatch.setattr("app.engine.effects.random.random", lambda: 0.19)
    assert try_apply_status(None, "burn", chance=0.2) == "burn"


def test_existing_status_does_not_stack(monkeypatch):
    monkeypatch.setattr("app.engine.effects.random.random", lambda: 0.0)
    assert try_apply_status("burn", "paralysis", chance=1.0) == "burn"


def test_paralysis_halves_speed():
    assert get_effective_speed(100, "paralysis") == 50


def test_burn_does_not_affect_speed():
    assert get_effective_speed(100, "burn") == 100
