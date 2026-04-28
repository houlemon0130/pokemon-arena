import math
import random


def calculate_damage(
    power: int,
    attack_stat: int,
    defense_stat: int,
    stab: float = 1.0,
    type_mult: float = 1.0,
    critical: float = 1.0,
) -> int:
    if type_mult == 0.0:
        return 0

    level = 50
    base = math.floor(((2 * level / 5 + 2) * power * (attack_stat / defense_stat) / 50 + 2))
    base *= stab * type_mult * critical
    base *= random.uniform(0.85, 1.0)
    return max(1, math.floor(base))
