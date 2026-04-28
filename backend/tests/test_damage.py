from app.engine.damage import calculate_damage


def test_base_damage_is_positive_and_in_expected_range():
    dmg = calculate_damage(
        power=40,
        attack_stat=100,
        defense_stat=100,
        stab=1.0,
        type_mult=1.0,
        critical=1.0,
    )
    assert 15 <= dmg <= 20


def test_stab_increases_damage(monkeypatch):
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 1.0)
    dmg1 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=1.0, critical=1.0)
    dmg2 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.5, type_mult=1.0, critical=1.0)
    assert dmg2 > dmg1


def test_super_effective_doubles_damage(monkeypatch):
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 1.0)
    dmg1 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=1.0, critical=1.0)
    dmg2 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=2.0, critical=1.0)
    assert dmg2 >= dmg1 * 1.8


def test_immunity_deals_zero_damage():
    dmg = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=0.0, critical=1.0)
    assert dmg == 0


def test_critical_hit_increases_damage(monkeypatch):
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 1.0)
    dmg1 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=1.0, critical=1.0)
    dmg2 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=1.0, critical=1.5)
    assert dmg2 > dmg1


def test_high_attack_low_defense_deals_more_damage(monkeypatch):
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 1.0)
    low_damage = calculate_damage(power=40, attack_stat=80, defense_stat=140, stab=1.0, type_mult=1.0, critical=1.0)
    high_damage = calculate_damage(power=40, attack_stat=140, defense_stat=80, stab=1.0, type_mult=1.0, critical=1.0)
    assert high_damage > low_damage


def test_damage_has_minimum_of_one(monkeypatch):
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 0.85)
    dmg = calculate_damage(power=1, attack_stat=1, defense_stat=999, stab=1.0, type_mult=0.5, critical=1.0)
    assert dmg == 1
