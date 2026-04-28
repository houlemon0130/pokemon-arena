from app.engine.battle import resolve_turn
from app.models.battle import BattlePokemon
from app.models.pokemon import MoveDef, Stats


def _stats(speed=100):
    return Stats(hp=120, attack=100, defense=100, sp_attack=100, sp_defense=100, speed=speed)


def _mon(name, types, moves, speed=100, hp=120):
    return BattlePokemon(
        def_id=name.lower(),
        name=name,
        types=types,
        stats=_stats(speed),
        moves=moves,
        current_hp=hp,
        max_hp=120,
    )


def test_resolve_turn_deals_damage_and_logs_events(monkeypatch):
    monkeypatch.setattr("app.engine.battle.random.random", lambda: 0.5)
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 1.0)
    player = _mon("Charmander", ["fire"], [MoveDef(id="ember", name="Ember", type="fire", category="special", power=40, accuracy=100, pp=25)], speed=100)
    agent = _mon("Bulbasaur", ["grass"], [MoveDef(id="tackle", name="Tackle", type="normal", category="physical", power=40, accuracy=100, pp=35)], speed=80)

    result = resolve_turn(player, agent, 0, 0)

    assert result.player_damage > 0
    assert result.agent_damage > 0
    assert agent.current_hp < agent.max_hp
    assert player.current_hp < player.max_hp
    assert any("Charmander used Ember" in event for event in result.events)


def test_faster_agent_moves_first(monkeypatch):
    monkeypatch.setattr("app.engine.battle.random.random", lambda: 0.5)
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 1.0)
    player = _mon("Squirtle", ["water"], [MoveDef(id="tackle", name="Tackle", type="normal", category="physical", power=40, accuracy=100, pp=35)], speed=60)
    agent = _mon("Pikachu", ["electric"], [MoveDef(id="quick_attack", name="Quick Attack", type="normal", category="physical", power=40, accuracy=100, pp=30)], speed=120)

    result = resolve_turn(player, agent, 0, 0)

    assert result.events[0].startswith("Pikachu used Quick Attack")


def test_fainted_pokemon_does_not_move(monkeypatch):
    monkeypatch.setattr("app.engine.battle.random.random", lambda: 0.5)
    monkeypatch.setattr("app.engine.damage.random.uniform", lambda _low, _high: 1.0)
    player = _mon("Charmander", ["fire"], [MoveDef(id="flamethrower", name="Flamethrower", type="fire", category="special", power=90, accuracy=100, pp=15)], speed=100)
    agent = _mon("Bulbasaur", ["grass"], [MoveDef(id="tackle", name="Tackle", type="normal", category="physical", power=40, accuracy=100, pp=35)], speed=80, hp=1)

    result = resolve_turn(player, agent, 0, 0)

    assert agent.current_hp == 0
    assert result.agent_damage == 0
    assert any("Bulbasaur fainted" in event for event in result.events)
