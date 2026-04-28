import random


def obedience_check(obedience_mult: float, base_obedience: float = 0.7, defiance_streak: int = 0) -> str:
    streak_penalty = min(defiance_streak * 0.08, 0.3)
    effective = min(obedience_mult * base_obedience - streak_penalty, 1.0)
    roll = random.random()
    if roll < effective * 0.7:
        return "obeyed"
    if roll < effective:
        return "modified"
    return "defied"
