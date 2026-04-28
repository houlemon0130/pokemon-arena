STATUS_INFO = {
    "burn": {
        "name": "烧伤",
        "description": "每回合损失最大 HP 的 1/8，物理攻击压力上升。",
    },
    "paralysis": {
        "name": "麻痹",
        "description": "速度减半，并且每回合有 25% 概率无法行动。",
    },
    "sleep": {
        "name": "睡眠",
        "description": "每回合有约 33% 概率醒来，醒来前无法行动。",
    },
}


def get_status_info(status: str) -> dict:
    if status not in STATUS_INFO:
        return {"name": status, "description": "未知状态"}
    return {"status": status, **STATUS_INFO[status]}
