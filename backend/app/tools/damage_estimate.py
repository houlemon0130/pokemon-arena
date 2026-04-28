from app.engine.damage import calculate_damage

from .pp_check import resolve_move


def estimate_damage(
    move_name: str,
    attack_stat: int,
    defense_stat: int,
    sp_attack_stat: int,
    sp_defense_stat: int,
    has_stab: bool,
    type_mult: float = 1.0,
    critical: float = 1.0,
) -> dict:
    move = resolve_move(move_name)
    power = move.get("power") or 0
    if power == 0:
        return {"min": 0, "max": 0, "expected": 0, "samples": []}

    if move["category"] == "special":
        offense = sp_attack_stat
        defense = sp_defense_stat
    else:
        offense = attack_stat
        defense = defense_stat

    stab = 1.5 if has_stab else 1.0
    samples = [
        calculate_damage(power, offense, defense, stab=stab, type_mult=type_mult, critical=critical)
        for _ in range(100)
    ]
    return {
        "move_id": move["id"],
        "min": min(samples),
        "max": max(samples),
        "expected": sum(samples) / len(samples),
        "samples": samples,
    }
