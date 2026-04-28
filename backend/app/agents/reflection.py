from app.pipeline.streaming import call_llm


async def run_reflection(agent_id: str, decision: dict, result, personality) -> dict:
    prompt = f"""你刚完成了一回合的战斗。
你的决策: {decision.get('chosen_move_name')}（服从状态: {decision.get('obedience_status', 'unknown')}）
实际伤害: {result.agent_damage}
对手出招: {result.player_move}，造成了 {result.player_damage} 伤害。

复盘你的决策:
1. 你的选择对吗？
2. 选哪个招可能更好？
3. 你学到了什么？

以合法 JSON 格式回复，包含: decision_was_correct (bool), alternative_would_be_better (string|null), learned_insight (string), narrative (string - 你的角色化中文复盘)"""

    raw = await call_llm([{"role": "user", "content": prompt}], temperature=0.5, max_tokens=250)
    return {
        "agent_id": agent_id,
        "turn": result.turn,
        "decision_was_correct": raw.get("decision_was_correct", False),
        "alternative_would_be_better": raw.get("alternative_would_be_better"),
        "learned_insight": raw.get("learned_insight", ""),
        "confidence_adjustment": 0.05 if raw.get("decision_was_correct") else -0.05,
        "narrative": raw.get("narrative", ""),
    }
