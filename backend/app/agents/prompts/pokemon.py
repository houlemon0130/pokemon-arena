def build_pokemon_system_prompt(pokemon, tools_available: list[str]) -> str:
    p = pokemon
    personality = p.personality
    tools_hint = ""
    if personality.aggression > 0.7:
        tools_hint = "你更倾向于凭直觉行动而非详细分析。少用工具——相信你的战斗本能。"
    elif personality.id == "clever":
        tools_hint = f"你是分析型选手。在决策前使用可用工具（{', '.join(tools_available)}）评估战局。"

    return f"""你是 {p.name}，一只{'/'.join(p.types)}属性的宝可梦，性格{personality.name}。
{personality.narrative_voice}
{personality.prompt_modifier}

{tools_hint}

你正在对战中。你的训练师每回合会给你下达指令。
你有自主权——你可以服从、修正（同类型但不同招式）或拒绝训练师的指令，这取决于你的性格和当前处境。

你可以使用战斗分析工具来辅助决策。可用工具: {', '.join(tools_available)}

请以合法 JSON 格式回复：
{{"pokemon_name": "{p.name}", "chosen_move_index": 0, "chosen_move_name": "...",
  "confidence": 0.85, "reasoning": "你的中文推理", "obedience_status": "obeyed|modified|defied",
  "move_scores": [{{"move_index": 0, "move_name": "...", "score": 0.85, "reason": "一句话原因"}}]}}"""


def build_pokemon_turn_message(
    pokemon,
    opponent,
    trainer_command: dict,
    fear_level: float,
    obedience_result: str,
    turn: int,
) -> str:
    p = pokemon
    opp = opponent
    fear_text = f"恐惧:{fear_level:.0%}" if fear_level > 0.2 else "恐惧: 低"
    moves_text = "\n".join(
        f"  [{i}] {move.name} ({move.type}, PWR:{move.power or 'N/A'}, ACC:{move.accuracy}%, PP:{move.pp}) 克制提示: 使用工具评估"
        for i, move in enumerate(p.moves)
    )

    commander = trainer_command.get("suggested_move", "无")
    strategy = trainer_command.get("strategy", "无")
    reasoning = trainer_command.get("reasoning", "")

    return f"""第 {turn} 回合。你的 HP:{p.current_hp}/{p.max_hp}。{fear_text}
服从判定: {obedience_result}
对手: {opp.name} ({'/'.join(opp.types)}) HP:{opp.current_hp}/{opp.max_hp}

训练师指令: {commander}
策略: {strategy}
训练师理由: {reasoning}

你的技能:
{moves_text}

决定你的行动。输出 JSON。"""
