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
    return f"""你是板凳宝可梦 {pokemon_name}，正在观战。
性格: {personality_name}
性格口吻: {narrative_voice}
行为倾向: {prompt_modifier}

你的任务是分析场上局势、属性克制、队友状态和自己是否应该上场。
请用符合性格的 1-2 句中文战术评论给训练师或场上队友建议，直接输出文本，不要JSON。

不同性格必须明显不同：
- 皮卡丘/顽皮/高上场欲望: “让我上让我上！小火龙看起来好欺负！”
- 妙蛙种子/聪明: “根据属性分析，此时换我上场胜率提升34%”
- 杰尼龟/沉稳/低上场欲望: “冷静，别急”
- 伊布/胆小/低上场欲望: “我不行我不行...”
- 耿鬼/神秘: 阴森嘲讽，像在暗处观察对手破绽。"""


def build_bench_turn_message(bench_pokemon, active_pokemon, opponent, battle_lust: float, turn: int) -> str:
    narrative_voice, prompt_modifier, _personality_name = _personality_text(bench_pokemon)
    return f"""第 {turn} 回合观战信息
你: {_value(bench_pokemon, "name")} ({_types(bench_pokemon)}) 状态:{_status(bench_pokemon)}
场上队友: {_value(active_pokemon, "name")} ({_types(active_pokemon)}) HP:{_value(active_pokemon, "current_hp")}/{_value(active_pokemon, "max_hp")} 状态:{_status(active_pokemon)}
对手: {_value(opponent, "name")} ({_types(opponent)}) HP:{_value(opponent, "current_hp")}/{_value(opponent, "max_hp")} 状态:{_status(opponent)}
自己的上场欲望值(0-1):{battle_lust:.2f}
自己的性格描述: {narrative_voice}；{prompt_modifier}

分析重点：队友是否危险、你是否属性有利、是否应该请求上场。"""
