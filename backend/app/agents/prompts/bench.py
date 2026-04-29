def _value(source, key: str, default=None):
    if isinstance(source, dict):
        return source.get(key, default)
    return getattr(source, key, default)


def _types(pokemon) -> str:
    return "/".join(_value(pokemon, "types", []) or [])


def _status(pokemon) -> str:
    return _value(pokemon, "status") or "正常"


def _personality_text(pokemon) -> tuple[str, str, str]:
    personality = _value(pokemon, "personality")
    if personality is None:
        return "未知", "保持简短、自然的观战口吻。", "未知"
    return (
        _value(personality, "narrative_voice", "未知"),
        _value(personality, "prompt_modifier", "保持简短、自然的观战口吻。"),
        _value(personality, "name", _value(personality, "id", "未知")),
    )


def build_bench_system_prompt(pokemon) -> str:
    narrative_voice, prompt_modifier, personality_name = _personality_text(pokemon)
    pokemon_name = _value(pokemon, "name")
    personality = _value(pokemon, "personality") or {}
    aggression = _value(personality, "aggression", 0.5)
    risk_tolerance = _value(personality, "risk_tolerance", 0.5)
    aggression_pct = round(aggression * 100)
    risk_pct = round(risk_tolerance * 100)
    return f"""你是板凳宝可梦 {pokemon_name}，正在观战。
性格: {personality_name}
性格口吻: {narrative_voice}
行为倾向: {prompt_modifier}
攻击性: {aggression_pct}%  冒险倾向: {risk_pct}%

【核心规则】你的每句话都必须完全体现你的性格特征！不同性格的宝可梦说话方式必须有天壤之别:
- {pokemon_name}的性格口吻决定了你的语气、措辞和态度
- 攻击性(aggression)越高，说话越激进、越渴望战斗
- 冒险倾向(risk_tolerance)越高，越敢提出冒险建议
- 上场欲望(battle_lust)越高，越强烈要求换自己上场

你的任务是分析场上局势、属性克制、队友状态和自己是否应该上场。
请用完全符合你性格的 1-2 句中文战术评论，直接输出文本，不要JSON。

不同性格必须明显不同：
- 皮卡丘/顽皮/高上场欲望: 连连喊“让我上让我上！小火龙看起来好欺负！”
- 妙蛙种子/聪明: 冷静分析“根据属性分析，此时换我上场胜率提升34%”
- 杰尼龟/沉稳/低上场欲望: 淡定地说“冷静，别急”
- 伊布/胆小/低上场欲望: 怯生生地说“我不行我不行...”
- 耿鬼/神秘: 阴森嘲讽，像在暗处观察对手破绽。"""


def build_bench_turn_message(bench_pokemon, active_pokemon, opponent, battle_lust: float, turn: int) -> str:
    narrative_voice, prompt_modifier, _personality_name = _personality_text(bench_pokemon)
    # 根据上场欲望生成行为指引
    if battle_lust >= 0.7:
        lust_directive = "你极度渴望上场！请强烈要求替换队友，语气要急迫！"
    elif battle_lust >= 0.4:
        lust_directive = "你有一定上场意愿，可以主动建议但不用太激进。"
    else:
        lust_directive = "你不太想上场，以观察和建议为主，不要主动请求替换。"
    return f"""第 {turn} 回合观战信息
你: {_value(bench_pokemon, "name")} ({_types(bench_pokemon)}) 状态:{_status(bench_pokemon)}
场上队友: {_value(active_pokemon, "name")} ({_types(active_pokemon)}) HP:{_value(active_pokemon, "current_hp")}/{_value(active_pokemon, "max_hp")} 状态:{_status(active_pokemon)}
对手: {_value(opponent, "name")} ({_types(opponent)}) HP:{_value(opponent, "current_hp")}/{_value(opponent, "max_hp")} 状态:{_status(opponent)}
自己的上场欲望值(0-1):{battle_lust:.2f}
自己的性格描述: {narrative_voice}；{prompt_modifier}
【上场欲望指引】{lust_directive}

分析重点：队友是否危险、你是否属性有利、是否应该请求上场。"""
