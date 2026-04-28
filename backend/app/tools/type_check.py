from app.engine.type_chart import get_effectiveness


def _effect_text(multiplier: float) -> str:
    if multiplier == 0:
        return "没有效果"
    if multiplier >= 4:
        return "效果拔群！四倍伤害"
    if multiplier >= 2:
        return "效果拔群"
    if multiplier <= 0.25:
        return "效果很差，只有四分之一"
    if multiplier <= 0.5:
        return "效果不好"
    return "普通效果"


def check_type_effectiveness(move_type: str, defender_types: list[str]) -> dict:
    multiplier = get_effectiveness(move_type, defender_types)
    return {
        "move_type": move_type,
        "defender_types": defender_types,
        "multiplier": multiplier,
        "effect_text": _effect_text(multiplier),
    }
