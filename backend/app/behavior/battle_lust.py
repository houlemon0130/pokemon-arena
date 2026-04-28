from app.engine.type_chart import get_effectiveness


def accumulate_battle_lust(
    current: float,
    self_type: str,
    opponent_types: list[str],
    teammate_low_hp: bool,
    teammate_status: bool,
) -> float:
    lust = current
    effectiveness = get_effectiveness(self_type, opponent_types)
    if effectiveness >= 2.0:
        lust += 0.20
    elif effectiveness > 1.0:
        lust += 0.10
    elif effectiveness <= 0.5:
        lust -= 0.10
    if teammate_low_hp:
        lust += 0.20
    if teammate_status:
        lust += 0.10
    return min(max(lust, 0.0), 1.0)


def check_plea_threshold(lust: float) -> bool:
    return lust >= 0.65
