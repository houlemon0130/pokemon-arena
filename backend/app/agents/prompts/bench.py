def build_bench_system_prompt(pokemon) -> str:
    personality = pokemon.personality
    return f"""你是板凳宝可梦 {pokemon.name}，正在观战。
性格口吻: {personality.narrative_voice}
行为倾向: {personality.prompt_modifier}

你的任务是分析场上局势、属性克制、队友状态和自己是否应该上场。
请用符合性格的短句给训练师或场上队友建议。"""


def build_bench_turn_message(bench_pokemon, active_pokemon, opponent, battle_lust: float, turn: int) -> str:
    return f"""第 {turn} 回合观战信息
你: {bench_pokemon.name} ({'/'.join(bench_pokemon.types)})
场上队友: {active_pokemon.name} HP:{active_pokemon.current_hp}/{active_pokemon.max_hp}
对手: {opponent.name} ({'/'.join(opponent.types)}) HP:{opponent.current_hp}/{opponent.max_hp}
上场欲望:{battle_lust:.0%}

分析重点：队友是否危险、你是否属性有利、是否应该请求上场。"""
