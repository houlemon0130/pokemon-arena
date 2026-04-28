class OpponentModel:
    """Rule-based tracker for player behavior."""

    def __init__(self):
        self.move_history: list[str] = []
        self.damage_history: list[int] = []
        self.hp_pct_history: list[float] = []
        self.was_se_history: list[bool] = []

    def record_move(self, move_type: str, damage: int, hp_pct: float, was_se: bool):
        self.move_history.append(move_type)
        self.damage_history.append(damage)
        self.hp_pct_history.append(hp_pct)
        self.was_se_history.append(was_se)

    def predict(self) -> dict:
        if len(self.move_history) < 2:
            return {"predicted_move_type": "attack", "confidence": 0.5}

        attack_count = sum(1 for move in self.move_history if move in ("attack", "physical", "special"))
        ratio = attack_count / len(self.move_history)
        if ratio > 0.7:
            return {"predicted_move_type": "attack", "confidence": min(ratio, 0.9)}
        if ratio < 0.3:
            return {"predicted_move_type": "status", "confidence": min(1.0 - ratio, 0.9)}
        return {"predicted_move_type": "mixed", "confidence": 0.6}
