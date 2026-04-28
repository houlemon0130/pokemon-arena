import json

MOVE_ALIASES = {
    "火花": "ember",
    "喷射火焰": "flamethrower",
    "抓": "scratch",
    "叫声": "growl",
    "水枪": "water_gun",
    "水炮": "hydro_pump",
    "撞击": "tackle",
    "缩壳": "withdraw",
    "藤鞭": "vine_whip",
    "飞叶快刀": "razor_leaf",
    "催眠粉": "sleep_powder",
    "寄生种子": "leech_seed",
    "十万伏特": "thunderbolt",
    "电击": "thunder_shock",
    "电光一闪": "quick_attack",
    "电磁波": "thunder_wave",
    "舍身冲撞": "double_edge",
    "泼沙": "sand_attack",
    "帮助": "helping_hand",
    "暗影球": "shadow_ball",
    "催眠术": "hypnosis",
    "奇异之光": "confuse_ray",
    "舌舔": "lick",
    "摇尾巴": "tail_whip",
}


def _load_moves() -> dict:
    with open("app/data/moves.json") as f:
        return json.load(f)


def resolve_move(move_name: str) -> dict:
    moves = _load_moves()
    move_id = MOVE_ALIASES.get(move_name, move_name)
    if move_id not in moves:
        raise ValueError(f"未知招式: {move_name}")
    return moves[move_id]


def check_pp_remaining(move_name: str, used_pp: int = 0) -> dict:
    move = resolve_move(move_name)
    max_pp = move["pp"]
    current_pp = max(max_pp - used_pp, 0)
    return {
        "move_id": move["id"],
        "move_name": move["name"],
        "current_pp": current_pp,
        "max_pp": max_pp,
    }
