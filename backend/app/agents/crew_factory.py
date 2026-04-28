from crewai import Agent, Crew, Process


def build_opponent_crew(trainer_style: str, active_pokemon, bench_pokemon: list, tool_registry) -> Crew:
    """Build the opponent multi-agent crew."""

    trainer_agent = Agent(
        role="宝可梦训练师",
        goal="通过策略指挥宝可梦队伍赢得战斗",
        backstory=f"你是一位经验丰富的{trainer_style}风格训练师。",
        allow_delegation=True,
        verbose=True,
    )
    return Crew(
        agents=[trainer_agent],
        tasks=[],
        process=Process.hierarchical,
        manager_llm="deepseek-v4-pro",
    )
