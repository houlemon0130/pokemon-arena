def accumulate_fear(
    current: float,
    damage_taken: int,
    max_hp: int,
    status: str | None,
    was_super_effective: bool,
    was_critical: bool,
) -> float:
    pct = damage_taken / max_hp
    fear = current
    fear += pct * 0.5
    if was_super_effective:
        fear += 0.20
    if was_critical:
        fear += 0.15
    if status == "burn":
        fear += 0.05
    if status and pct > 0.2:
        fear += 0.10
    return min(fear, 1.0)


def express_fear(fear: float, fear_mult: float, personality: str) -> str:
    effective = fear * fear_mult
    if effective >= 0.9:
        return "attempt_flee"
    if effective >= 0.7:
        return "force_defensive"
    if effective >= 0.5:
        return "suggest_retreat"
    if effective >= 0.3:
        return "unease"
    return "none"
