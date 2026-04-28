import random


def apply_burn_damage(max_hp: int) -> int:
    return max(1, max_hp // 8)


def check_paralysis_skip() -> bool:
    return random.random() < 0.25


def check_sleep_wake() -> bool:
    return random.random() < 1 / 3


def try_apply_status(current_status: str | None, new_status: str, chance: float = 1.0) -> str | None:
    if current_status is not None:
        return current_status
    if random.random() < chance:
        return new_status
    return None


def get_effective_speed(speed: int, status: str | None) -> int:
    if status == "paralysis":
        return speed // 2
    return speed
