import asyncio

from app.agents.reflection import run_reflection
from app.behavior.battle_lust import accumulate_battle_lust
from app.behavior.opponent_model import OpponentModel
from app.engine.battle import resolve_turn
from app.models.battle import BattlePokemon
from app.models.pokemon import MoveDef, Personality, Stats
from app.pipeline.streaming import call_llm
from app.tools.registry import ToolRegistry


class TurnOrchestrator:
    """Coordinates all agents and deterministic systems for one turn."""

    def __init__(self, opponent_team, player_team, ws_handler):
        self.opponent_team = opponent_team
        self.player_team = player_team
        self.ws = ws_handler
        self.tools = ToolRegistry()
        self.opponent_model = OpponentModel()
        self.turn = 0
        self.reflections = []

    async def execute_turn(self, player_move_index: int):
        self._validate_move_index(self.player_team["active"], player_move_index, "player")
        self.turn += 1

        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "bench_observe"}})
        bench_results = await asyncio.gather(
            *(self._run_bench_agent(bench_pokemon) for bench_pokemon in self.opponent_team["bench"])
        )

        for bench_pokemon, result in zip(self.opponent_team["bench"], bench_results):
            bench_pokemon["battle_lust"] = accumulate_battle_lust(
                bench_pokemon.get("battle_lust", 0.3),
                bench_pokemon["types"][0],
                self.player_team["active"]["types"],
                self.opponent_team["active"]["current_hp"] < self.opponent_team["active"]["max_hp"] * 0.3,
                self.opponent_team["active"]["status"] is not None,
            )
            await self.ws.broadcast({"type": "bench_opinion", "data": result})

        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "trainer_strategy"}})
        trainer_decision = await self._run_trainer_agent(bench_results)

        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "pokemon_decide"}})
        pokemon_decision = await self._run_pokemon_agent(trainer_decision)

        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "resolving"}})
        result = self._resolve_turn(player_move_index, pokemon_decision["chosen_move_index"])
        result.turn = self.turn
        self._update_behavior_states(result, pokemon_decision)

        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "reflection"}})
        reflection = await run_reflection(
            self.opponent_team["active"]["def_id"],
            pokemon_decision,
            result,
            self.opponent_team["active"].get("personality"),
        )
        self.reflections.append(reflection)
        await self.ws.broadcast({"type": "reflection_result", "data": reflection})

        return result

    def _validate_move_index(self, pokemon, move_index: int, actor: str):
        moves = pokemon.moves if isinstance(pokemon, BattlePokemon) else pokemon["moves"]
        if not isinstance(move_index, int) or isinstance(move_index, bool):
            raise ValueError(f"invalid_{actor}_move_index")
        if move_index < 0 or move_index >= len(moves):
            raise ValueError(f"invalid_{actor}_move_index")

    async def _run_bench_agent(self, bench_pokemon: dict) -> dict:
        return {
            "pokemon_id": bench_pokemon["def_id"],
            "battle_lust": bench_pokemon.get("battle_lust", 0.3),
            "message": "我在观察局势。",
        }

    async def _run_trainer_agent(self, bench_results: list[dict]) -> dict:
        return await call_llm(
            [
                {
                    "role": "user",
                    "content": f"根据板凳意见给出训练师指令: {bench_results}",
                }
            ],
            temperature=0.6,
            max_tokens=300,
        )

    async def _run_pokemon_agent(self, trainer_decision: dict) -> dict:
        return await call_llm(
            [
                {
                    "role": "user",
                    "content": f"根据训练师指令选择招式: {trainer_decision}",
                }
            ],
            temperature=0.7,
            max_tokens=300,
        )

    def _resolve_turn(self, player_move_index: int, agent_move_index: int):
        player_mon = self._as_battle_pokemon(self.player_team["active"])
        agent_mon = self._as_battle_pokemon(self.opponent_team["active"])
        result = resolve_turn(player_mon, agent_mon, player_move_index, agent_move_index)
        self._sync_runtime_pokemon(self.player_team["active"], player_mon)
        self._sync_runtime_pokemon(self.opponent_team["active"], agent_mon)
        return result

    def _as_battle_pokemon(self, pokemon):
        if isinstance(pokemon, BattlePokemon):
            return pokemon

        return BattlePokemon(
            def_id=pokemon["def_id"],
            name=pokemon["name"],
            types=pokemon["types"],
            stats=Stats(**pokemon["stats"]) if isinstance(pokemon["stats"], dict) else pokemon["stats"],
            moves=[
                MoveDef(**move) if isinstance(move, dict) else move
                for move in pokemon["moves"]
            ],
            personality=(
                Personality(**pokemon["personality"])
                if isinstance(pokemon.get("personality"), dict)
                else pokemon.get("personality")
            ),
            current_hp=pokemon["current_hp"],
            max_hp=pokemon["max_hp"],
            status=pokemon.get("status"),
            status_turns=pokemon.get("status_turns", 0),
        )

    def _sync_runtime_pokemon(self, target, source: BattlePokemon):
        if isinstance(target, BattlePokemon):
            return
        target["current_hp"] = source.current_hp
        target["status"] = source.status
        target["status_turns"] = source.status_turns

    def _update_behavior_states(self, result, pokemon_decision: dict):
        return None
