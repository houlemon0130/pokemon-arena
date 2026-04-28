import random

from app.engine.damage import calculate_damage
from app.engine.effects import apply_burn_damage, get_effective_speed
from app.engine.type_chart import get_effectiveness
from app.models.battle import BattlePokemon, TurnResult
from app.models.pokemon import MoveDef


def _is_fainted(pokemon: BattlePokemon) -> bool:
    return pokemon.current_hp <= 0


def _critical_multiplier() -> float:
    return 1.5 if random.random() < 0.0625 else 1.0


def _move_hits(move: MoveDef) -> bool:
    return random.random() <= move.accuracy / 100


def _choose_stats(attacker: BattlePokemon, defender: BattlePokemon, move: MoveDef) -> tuple[int, int]:
    if move.category == "special":
        return attacker.stats.sp_attack, defender.stats.sp_defense
    return attacker.stats.attack, defender.stats.defense


def _apply_move(attacker: BattlePokemon, defender: BattlePokemon, move: MoveDef, events: list[str]) -> int:
    if _is_fainted(attacker):
        return 0

    if attacker.status == "sleep":
        if random.random() < 1 / 3:
            attacker.status = None
            events.append(f"{attacker.name} woke up!")
        else:
            events.append(f"{attacker.name} is asleep.")
            return 0

    if attacker.status == "paralysis" and random.random() < 0.25:
        events.append(f"{attacker.name} is paralyzed and cannot move.")
        return 0

    if not _move_hits(move):
        events.append(f"{attacker.name} used {move.name}, but it missed!")
        return 0

    events.append(f"{attacker.name} used {move.name}.")
    if move.power is None:
        return 0

    attack_stat, defense_stat = _choose_stats(attacker, defender, move)
    stab = 1.5 if move.type in attacker.types else 1.0
    type_mult = get_effectiveness(move.type, defender.types)
    critical = _critical_multiplier()
    damage = calculate_damage(move.power, attack_stat, defense_stat, stab, type_mult, critical)
    damage = min(damage, defender.current_hp)
    defender.current_hp = max(defender.current_hp - damage, 0)

    if critical > 1.0:
        events.append("Critical hit!")
    if type_mult >= 2:
        events.append("It's super effective!")
    elif type_mult == 0:
        events.append("It had no effect.")
    elif type_mult <= 0.5:
        events.append("It's not very effective.")
    events.append(f"{move.name} dealt {damage} damage.")

    if _is_fainted(defender):
        events.append(f"{defender.name} fainted.")
    return damage


def _apply_end_of_turn_effects(pokemon: BattlePokemon, events: list[str]):
    if _is_fainted(pokemon):
        return
    if pokemon.status == "burn":
        damage = min(apply_burn_damage(pokemon.max_hp), pokemon.current_hp)
        pokemon.current_hp = max(pokemon.current_hp - damage, 0)
        events.append(f"{pokemon.name} is hurt by its burn for {damage} damage.")
        if _is_fainted(pokemon):
            events.append(f"{pokemon.name} fainted.")


def resolve_turn(
    player_mon: BattlePokemon,
    agent_mon: BattlePokemon,
    player_move_idx: int,
    agent_move_idx: int,
) -> TurnResult:
    player_move = player_mon.moves[player_move_idx]
    agent_move = agent_mon.moves[agent_move_idx]
    events: list[str] = []
    player_damage = 0
    agent_damage = 0

    player_speed = get_effective_speed(player_mon.stats.speed, player_mon.status)
    agent_speed = get_effective_speed(agent_mon.stats.speed, agent_mon.status)
    order = [
        ("player", player_mon, agent_mon, player_move),
        ("agent", agent_mon, player_mon, agent_move),
    ]
    if agent_speed > player_speed:
        order.reverse()

    for side, attacker, defender, move in order:
        damage = _apply_move(attacker, defender, move, events)
        if side == "player":
            player_damage += damage
        else:
            agent_damage += damage
        if _is_fainted(defender):
            break

    _apply_end_of_turn_effects(player_mon, events)
    _apply_end_of_turn_effects(agent_mon, events)

    return TurnResult(
        turn=0,
        player_move=player_move.name,
        agent_move=agent_move.name,
        player_damage=player_damage,
        agent_damage=agent_damage,
        events=events,
        hp_after={
            player_mon.def_id: player_mon.current_hp,
            agent_mon.def_id: agent_mon.current_hp,
        },
    )
