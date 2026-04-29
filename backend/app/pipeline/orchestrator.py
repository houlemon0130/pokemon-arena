import asyncio
import json
import logging
import re

from app.agents.prompts.bench import build_bench_system_prompt, build_bench_turn_message
from app.agents.reflection import run_reflection
from app.behavior.battle_lust import accumulate_battle_lust
from app.behavior.fear import accumulate_fear
from app.behavior.opponent_model import OpponentModel
from app.engine.battle import resolve_turn
from app.engine.type_chart import get_effectiveness
from app.models.battle import BattlePokemon
from app.models.pokemon import MoveDef, Personality, Stats
from app.pipeline.streaming import call_llm, stream_llm
from app.tools.registry import ToolRegistry

logger = logging.getLogger(__name__)


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
        self.disconnected = False

    async def _broadcast_safe(self, event: dict):
        """安全广播，捕获连接异常后设置 disconnected 标志."""
        if self.disconnected:
            return
        try:
            await self.ws.broadcast(event)
        except Exception:
            logger.warning("WebSocket broadcast failed, marking as disconnected", exc_info=True)
            self.disconnected = True

    async def execute_turn(self, player_move_index: int):
        self._validate_move_index(self.player_team["active"], player_move_index, "player")
        self.turn += 1

        await self._broadcast_safe({"type": "phase_change", "data": {"phase": "bench_observe"}})
        if self.disconnected:
            return None

        for bench_pokemon in self.opponent_team["bench"]:
            bench_pokemon["battle_lust"] = accumulate_battle_lust(
                bench_pokemon.get("battle_lust", 0.3),
                bench_pokemon["types"][0],
                self.player_team["active"]["types"],
                self.opponent_team["active"]["current_hp"] < self.opponent_team["active"]["max_hp"] * 0.3,
                self.opponent_team["active"]["status"] is not None,
            )
        bench_results = await asyncio.gather(
            *(self._run_bench_agent(bench_pokemon) for bench_pokemon in self.opponent_team["bench"])
        )

        for result in bench_results:
            await self._broadcast_safe({"type": "bench_opinion", "data": result})
        if self.disconnected:
            return None

        # Feature 2: 队内聊天 — 板凳宝可梦对场上队友鼓励/建议
        await self._generate_team_chat(bench_results)

        await self._broadcast_safe({"type": "phase_change", "data": {"phase": "trainer_strategy"}})
        if self.disconnected:
            return None

        # Feature 4: 训练师工具调用，返回结果注入训练师 prompt
        tool_results = await self._execute_trainer_tools()

        trainer_decision = await self._run_trainer_agent(bench_results, tool_results)
        await self._broadcast_safe(
            {"type": "agent_decision", "data": self._trainer_decision_payload(trainer_decision)}
        )

        await self._broadcast_safe({"type": "phase_change", "data": {"phase": "pokemon_decide"}})
        if self.disconnected:
            return None

        pokemon_decision = await self._run_pokemon_agent(trainer_decision)
        await self._broadcast_safe(
            {"type": "agent_decision", "data": self._pokemon_decision_payload(pokemon_decision)}
        )

        # Feature 2: 跨队对话 — 上场宝可梦对玩家说垃圾话
        await self._generate_cross_talk(pokemon_decision)

        await self._broadcast_safe({"type": "phase_change", "data": {"phase": "resolving"}})
        if self.disconnected:
            return None

        result = self._resolve_turn(player_move_index, pokemon_decision["chosen_move_index"])
        result.turn = self.turn
        # Feature 1: 传入 player_move_index，记录玩家行为
        self._update_behavior_states(result, player_move_index, pokemon_decision)

        await self._broadcast_safe({"type": "phase_change", "data": {"phase": "reflection"}})
        if self.disconnected:
            return None
        reflection = await run_reflection(
            self.opponent_team["active"]["def_id"],
            pokemon_decision,
            result,
            self.opponent_team["active"].get("personality"),
        )
        self.reflections.append(reflection)
        await self._broadcast_safe({"type": "reflection_result", "data": reflection})

        return result

    def _validate_move_index(self, pokemon, move_index: int, actor: str):
        moves = pokemon.moves if isinstance(pokemon, BattlePokemon) else pokemon["moves"]
        if not isinstance(move_index, int) or isinstance(move_index, bool):
            raise ValueError(f"invalid_{actor}_move_index")
        if move_index < 0 or move_index >= len(moves):
            raise ValueError(f"invalid_{actor}_move_index")

    async def _run_bench_agent(self, bench_pokemon: dict) -> dict:
        battle_lust = bench_pokemon.get("battle_lust", 0.3)
        raw = await call_llm(
            [
                {"role": "system", "content": build_bench_system_prompt(bench_pokemon)},
                {
                    "role": "user",
                    "content": build_bench_turn_message(
                        bench_pokemon,
                        self.opponent_team["active"],
                        self.player_team["active"],
                        battle_lust,
                        self.turn,
                    ),
                },
            ],
            temperature=0.8,
            max_tokens=100,
            json_mode=False,
        )
        message = raw.get("content", "").strip() if isinstance(raw, dict) else str(raw).strip()
        return {
            "pokemon_id": bench_pokemon["def_id"],
            "battle_lust": battle_lust,
            "message": message or "我还在观察局势。",
        }

    # ── Feature 2: 队内聊天 ────────────────────────────────────────────

    async def _generate_team_chat(self, bench_results: list[dict]):
        """Issue 2 修复: 并发执行所有板凳宝可梦的聊天 LLM 调用."""
        bench = self.opponent_team["bench"]
        active = self.opponent_team["active"]
        player = self.player_team["active"]

        async def _chat_for(bp):
            voice = self._get_voice(bp)
            prompt = (
                f"你是板凳宝可梦 {bp['name']}，性格{voice}。\n"
                f"场上队友 {active['name']} 正在战斗，对手是 {player['name']}。\n"
                f"请对场上队友说一句鼓励或战术建议，用你的性格口吻，1-2句中文，不要输出JSON。"
            )
            raw = await call_llm(
                [{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=80,
                json_mode=False,
            )
            content = (
                raw.get("content", "").strip()
                if isinstance(raw, dict)
                else str(raw).strip()
            )
            return {
                "pokemon_id": bp["def_id"],
                "pokemon_name": bp["name"],
                "content": content or f"{bp['name']}为队友加油！",
            }

        results = await asyncio.gather(*(_chat_for(bp) for bp in bench))
        for r in results:
            await self._broadcast_safe({
                "type": "chat_message",
                "data": {
                    "turn": self.turn,
                    "from_agent": f"bench:{r['pokemon_id']}",
                    "channel": "team",
                    "content": r["content"],
                },
            })

    # ── Feature 2: 跨队对话 ────────────────────────────────────────────

    async def _generate_cross_talk(self, pokemon_decision: dict):
        """上场宝可梦对玩家说垃圾话."""
        active = self.opponent_team["active"]
        voice = self._get_voice(active)
        prompt = (
            f"你是{active['name']}，一只{'/'.join(active['types'])}宝可梦，性格{voice}。\n"
            f"你刚使用了{pokemon_decision.get('chosen_move_name', '招式')}。\n"
            f"请对玩家说一句垃圾话，用你的性格口吻，1句中文，不要输出JSON。"
        )
        raw = await call_llm(
            [{"role": "user", "content": prompt}],
            temperature=0.9,
            max_tokens=60,
            json_mode=False,
        )
        content = (
            raw.get("content", "").strip()
            if isinstance(raw, dict)
            else str(raw).strip()
        )
        await self._broadcast_safe({
            "type": "chat_message",
            "data": {
                "turn": self.turn,
                "from_agent": active["def_id"],
                "to_agent": "player",
                "channel": "cross_team",
                "content": content or f"{active['name']}挑衅地看着你！",
            },
        })

    @staticmethod
    def _get_voice(pokemon) -> str:
        """安全提取 personality 的 narrative_voice."""
        personality = pokemon.get("personality") if isinstance(pokemon, dict) else getattr(pokemon, "personality", None)
        if personality is None:
            return "普通"
        if isinstance(personality, dict):
            return personality.get("narrative_voice", "普通")
        return getattr(personality, "narrative_voice", "普通")

    # ── Feature 3: 流式 Agent 思考 ─────────────────────────────────────

    async def _stream_and_broadcast(
        self, agent_id: str, prompt: str, temperature: float, max_tokens: int
    ) -> dict:
        """流式 LLM 调用并通过 agent_stream 事件广播."""
        messages = [{"role": "user", "content": prompt}]
        full_text = ""

        try:
            async for chunk in stream_llm(messages, temperature=temperature, max_tokens=max_tokens):
                full_text += chunk
                await self._broadcast_safe({
                    "type": "agent_stream",
                    "data": {
                        "agent_id": agent_id,
                        "chunk": chunk,
                        "replace": False,
                    },
                })
        except Exception:
            # Issue 1 修复: fallback 时使用 replace: true 避免文本重复
            # Issue 6 修复: 使用 json_mode=True 直接获取解析后的 dict，避免不可靠的文本提取
            logger.warning("Stream failed for %s, falling back to non-stream", agent_id, exc_info=True)
            raw = await call_llm(messages, temperature=temperature, max_tokens=max_tokens, json_mode=True)
            # json_mode=True 时 raw 已是解析后的 dict，序列化为字符串用于广播
            if isinstance(raw, dict):
                full_text = json.dumps(raw, ensure_ascii=False)
                await self._broadcast_safe({
                    "type": "agent_stream",
                    "data": {
                        "agent_id": agent_id,
                        "chunk": full_text,
                        "replace": True,
                    },
                })
                return raw
            # 降级: 非 dict 的返回值
            full_text = raw.get("content", "") if isinstance(raw, dict) else str(raw)
            await self._broadcast_safe({
                "type": "agent_stream",
                "data": {
                    "agent_id": agent_id,
                    "chunk": full_text,
                    "replace": True,
                },
            })

        default: dict = {}
        if agent_id == "trainer":
            default = {"suggested_move": "", "strategy": "aggressive", "reasoning": ""}
        elif agent_id == "pokemon":
            default = {"chosen_move_index": 0, "chosen_move_name": "", "confidence": 0.5, "reasoning": "", "obedience_status": "obeyed"}

        return self._parse_json_decision(full_text, default)

    @staticmethod
    def _parse_json_decision(text: str, default: dict) -> dict:
        """Issue 3 修复: 从流式文本中提取 JSON（先试 ```json 代码块，再 brace-counting 处理嵌套 JSON）."""
        # Try ```json code block first
        match = re.search(r"```json\s*\n?(.*?)\n?```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        # Try brace-counting for nested JSON
        start = text.find("{")
        if start == -1:
            return default
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break
        return default

    # ── Feature 1: OpponentModel 注入 & Feature 3: 流式训练师 ──────────

    async def _run_trainer_agent(self, bench_results: list[dict], tool_results: list[dict] | None = None) -> dict:
        active = self.opponent_team["active"]
        player = self.player_team["active"]
        moves = active["moves"]
        move_list = "\n".join(
            f"  [{i}] {m['name']}({m['type']}, 威力:{m.get('power','-')})"
            for i, m in enumerate(moves)
        )
        # Feature 1: 注入 OpponentModel 预测结果
        opponent_prediction = self.opponent_model.predict()

        # 格式化工具调用结果注入 prompt
        tool_section = ""
        if tool_results:
            tool_lines = []
            for tr in tool_results:
                tool_name = tr.get("tool_name", "")
                output = tr.get("output_result", {})
                if isinstance(output, dict):
                    output_str = json.dumps(output, ensure_ascii=False)
                else:
                    output_str = str(output)
                tool_lines.append(f"  [{tool_name}]: {output_str}")
            if tool_lines:
                tool_section = "工具调用结果:\n" + "\n".join(tool_lines) + "\n"

        prompt = f"""你是对手训练师。场上情况：
你的宝可梦: {active['name']}({'/'.join(active['types'])}) HP:{active['current_hp']}/{active['max_hp']}
玩家宝可梦: {player['name']}({'/'.join(player['types'])}) HP:{player['current_hp']}/{player['max_hp']}
可用招式:
{move_list}
板凳意见: {bench_results}
对手行为预测: {opponent_prediction}
{tool_section}
先写出你的策略分析和内心想法，然后以JSON格式给出指令，JSON放在```json代码块中：
{{"suggested_move": "招式名", "strategy": "aggressive/defensive/status", "reasoning": "你的策略分析(中文)"}}"""

        return await self._stream_and_broadcast("trainer", prompt, temperature=0.6, max_tokens=300)

    # ── Feature 3: 流式宝可梦 ──────────────────────────────────────────

    async def _run_pokemon_agent(self, trainer_decision: dict) -> dict:
        active = self.opponent_team["active"]
        player = self.player_team["active"]
        moves = active["moves"]
        move_list = "\n".join(
            f"  [{i}] {m['name']}({m['type']}, 威力:{m.get('power','-')})"
            for i, m in enumerate(moves)
        )
        prompt = f"""你是{active['name']}，一只{'/'.join(active['types'])}宝可梦。
你的HP:{active['current_hp']}/{active['max_hp']}
对手{player['name']}({'/'.join(player['types'])}) HP:{player['current_hp']}/{player['max_hp']}
训练师指令: {trainer_decision.get('suggested_move','无')} (策略:{trainer_decision.get('strategy','未知')})
你的招式:
{move_list}

先写出你的内心想法和分析过程，然后选择要使用的招式，JSON放在```json代码块中：
{{"chosen_move_index": 0, "chosen_move_name": "招式名", "confidence": 0.85, "reasoning": "你的决策理由(中文)", "obedience_status": "obeyed/modified/defied"}}"""

        return await self._stream_and_broadcast("pokemon", prompt, temperature=0.7, max_tokens=300)

    def _trainer_decision_payload(self, trainer_decision: dict) -> dict:
        return {
            "agent_type": "trainer",
            "reasoning": trainer_decision.get("reasoning", ""),
            "suggested_move": trainer_decision.get("suggested_move", ""),
            "strategy": trainer_decision.get("strategy", ""),
        }

    def _pokemon_decision_payload(self, pokemon_decision: dict) -> dict:
        return {
            "agent_type": "pokemon",
            "chosen_move_name": pokemon_decision.get("chosen_move_name", ""),
            "confidence": pokemon_decision.get("confidence", 0),
            "reasoning": pokemon_decision.get("reasoning", ""),
            "obedience_status": pokemon_decision.get("obedience_status", ""),
        }

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
            fear=pokemon.get("fear", 0.0),
            battle_lust=pokemon.get("battle_lust", 0.0),
        )

    def _sync_runtime_pokemon(self, target, source: BattlePokemon):
        if isinstance(target, BattlePokemon):
            return
        target["current_hp"] = source.current_hp
        target["status"] = source.status
        target["status_turns"] = source.status_turns
        target["fear"] = source.fear
        target["battle_lust"] = source.battle_lust

    # ── Feature 1: OpponentModel 行为记录 ──────────────────────────────

    def _update_behavior_states(self, result, player_move_index: int, pokemon_decision: dict):
        """Feature 1: 记录玩家出招信息到 OpponentModel."""
        player_mon = self.player_team["active"]
        if player_move_index < len(player_mon["moves"]):
            player_move = player_mon["moves"][player_move_index]
        else:
            return
        move_category = player_move.get("category", "attack")
        hp_pct = player_mon["current_hp"] / max(player_mon["max_hp"], 1)
        player_move_type = player_move["type"]
        agent_types = self.opponent_team["active"]["types"]
        was_se = get_effectiveness(player_move_type, agent_types) >= 2.0
        self.opponent_model.record_move(move_category, result.player_damage, hp_pct, was_se)

        # Feature 1: 累积玩家宝可梦的恐惧值
        agent_mon = self.opponent_team["active"]
        agent_move_index = pokemon_decision.get("chosen_move_index", 0)
        if isinstance(agent_move_index, int) and 0 <= agent_move_index < len(agent_mon["moves"]):
            agent_move = agent_mon["moves"][agent_move_index]
            agent_move_type = agent_move["type"]
            agent_was_se = get_effectiveness(agent_move_type, player_mon["types"]) >= 2.0
            agent_was_critical = any("会心一击" in e for e in (getattr(result, "events", []) or []))
            player_mon["fear"] = accumulate_fear(
                player_mon.get("fear", 0.0),
                result.agent_damage,
                player_mon["max_hp"],
                player_mon.get("status"),
                agent_was_se,
                agent_was_critical,
            )

    # ── Feature 4: 训练师工具调用 ─────────────────────────────────────

    async def _execute_trainer_tools(self) -> list[dict]:
        """Issue 4 & 5: 训练师阶段执行工具，检查招式属性克制和速度对比.

        返回工具调用结果列表，供 _run_trainer_agent 注入到 prompt 中.
        """
        active = self.opponent_team["active"]
        player = self.player_team["active"]
        tool_results: list[dict] = []

        # Issue 5 修复: 遍历招式，用招式类型检查属性克制，而不是宝可梦属性类型
        for move in active["moves"]:
            try:
                result = self.tools.execute(
                    "check_type_effectiveness",
                    move_type=move["type"],
                    defender_types=player["types"],
                )
                tool_result = {
                    "tool_name": "check_type_effectiveness",
                    "input_params": {
                        "move_name": move["name"],
                        "move_type": move["type"],
                        "defender_types": player["types"],
                    },
                    "output_result": result,
                }
                tool_results.append(tool_result)
                await self._broadcast_safe({
                    "type": "tool_call",
                    "data": {
                        "turn": self.turn,
                        "agent_id": "trainer",
                        **tool_result,
                    },
                })
            except Exception:
                # Issue 5 修复: 使用 logger.warning 而非 silent pass
                logger.warning("Tool call failed for check_type_effectiveness", exc_info=True)

        # 检查速度对比
        try:
            speed_result = self.tools.execute(
                "check_speed_comparison",
                my_speed=active["stats"]["speed"],
                my_status=active.get("status"),
                opponent_speed=player["stats"]["speed"],
                opponent_status=player.get("status"),
            )
            tool_result = {
                "tool_name": "check_speed_comparison",
                "input_params": {
                    "my_speed": active["stats"]["speed"],
                    "opponent_speed": player["stats"]["speed"],
                },
                "output_result": speed_result,
            }
            tool_results.append(tool_result)
            await self._broadcast_safe({
                "type": "tool_call",
                "data": {
                    "turn": self.turn,
                    "agent_id": "trainer",
                    **tool_result,
                },
            })
        except Exception:
            logger.warning("Tool call failed for check_speed_comparison", exc_info=True)

        return tool_results
