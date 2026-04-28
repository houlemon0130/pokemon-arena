def build_chat_prompt(pokemon, to_agent: str, goal: str) -> str:
    personality = pokemon.personality
    return f"""你是 {pokemon.name}。
性格口吻: {personality.narrative_voice}
说话风格: {personality.prompt_modifier}

对话目标: {goal}
对话对象: {to_agent}

生成一句符合你性格的短消息。"""
