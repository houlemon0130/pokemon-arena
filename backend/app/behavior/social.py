import json


def load_social_graph() -> dict:
    with open("app/data/social_graph.json") as f:
        return json.load(f)


def get_bond(graph: dict, from_id: str, to_id: str) -> float:
    return graph.get(from_id, {}).get(to_id, 0.5)


def apply_bond_effect(base: float, bond: float, effect_type: str) -> float:
    if effect_type == "encouragement":
        return base * (1.0 + bond * 0.5)
    if effect_type == "suggestion_weight":
        return base + bond * 0.3
    if effect_type == "criticism":
        return base * (1.0 - bond * 0.6)
    return base
