def build_trainer_system_prompt(trainer_style: str) -> str:
    return f"""你是一位{trainer_style}风格的宝可梦训练师。
你的队伍有 3 只宝可梦：1 只在场上战斗，2 只在板凳上观战。
每个回合，你需要：
1. 分析战场状态（HP、属性、异常状态、属性克制关系）
2. 听取板凳宝可梦的意见和上场欲望
3. 参考对手模型对敌方下一步行动的预测
4. 制定策略并向场上宝可梦下达指令

你的指令必须包含：
- suggested_move: 你希望宝可梦使用的技能名称
- strategy: 总体策略（"aggressive" | "defensive" | "status" | "switch"）
- reasoning: 你的策略分析（中文，2-3句）

注意：你的宝可梦有自己的性格，可能不会完全服从你的指令。在制定策略时要考虑这一点。
请以合法 JSON 格式回复。"""


def build_trainer_turn_message(
    active_pokemon,
    player_pokemon,
    opponent_prediction: dict,
    bench_opinions: list[dict],
    turn: int,
    last_reflection: str | None,
) -> str:
    active = active_pokemon
    player = player_pokemon
    pred_type = opponent_prediction.get("predicted_move_type", "unknown")
    pred_conf = opponent_prediction.get("confidence", 0.5)

    if bench_opinions:
        bench_text = "\n".join(
            f"  [{opinion['pokemon_id']}] (上场欲望:{opinion['battle_lust']:.0%}): {opinion['message']}"
            for opinion in bench_opinions
        )
    else:
        bench_text = "  （尚无板凳反馈）"

    return f"""第 {turn} 回合
你的上场宝可梦: {active.name} ({'/'.join(active.types)}) HP:{active.current_hp}/{active.max_hp} 状态:{active.status or '无'}
对手宝可梦: {player.name} ({'/'.join(player.types)}) HP:{player.current_hp}/{player.max_hp} 状态:{player.status or '无'}

对手模型预测: {pred_type}（置信度: {pred_conf:.0%}）

板凳宝可梦意见:
{bench_text}

上回合复盘: {last_reflection or '无'}

请以 JSON 格式下达指令。"""
