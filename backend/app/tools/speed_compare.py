from app.engine.effects import get_effective_speed


def check_speed_comparison(
    my_speed: int,
    my_status: str | None,
    opponent_speed: int,
    opponent_status: str | None,
) -> dict:
    my_effective_speed = get_effective_speed(my_speed, my_status)
    opponent_effective_speed = get_effective_speed(opponent_speed, opponent_status)
    return {
        "my_effective_speed": my_effective_speed,
        "opponent_effective_speed": opponent_effective_speed,
        "i_go_first": my_effective_speed >= opponent_effective_speed,
    }
