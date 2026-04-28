# AI Pokemon Battle Arena — Design Spec v2

**Date**: 2026-04-27
**Author**: Jay
**Status**: Draft v2 — Multi-Agent Architecture

## Purpose

A browser-based Pokemon battle simulator where the player controls their Pokemon manually, while the AI opponent is a **multi-agent system**: a Trainer Agent (Leader) commands a team of Pokemon Agents (Workers), each with independent personality, internal psychological state, and the ability to communicate, negotiate, and even disobey.

This is a portfolio project to demonstrate multi-agent engineering capabilities for job hunting (target: 2027 Q2). The core demo value is watching multiple AI Agents interact — forming opinions, debating tactics, expressing fear, trash-talking opponents, and sometimes defying their own trainer.

## Multi-Agent Architecture

### Technology Positioning

本项目定位为**炫技型 Portfolio**。原则：用最新的 Agent 技术，但只在场景天然需要的地方用。

| 技术 | 是否用 | 在本项目中的表现 |
|------|--------|-------------------|
| **Multi-Agent Orchestration** | 用 | Trainer + Active + Bench ×4，CrewAI Crew |
| **Tool Calling** | 用 | Pokemon Agent 选招前调 tool 分步推理 |
| **Streaming** | 用 | 所有 Agent 思考过程流式推到前端 |
| **Structured Output** | 用 | JSON mode / Function Calling 做决策输出 |
| **Human-in-the-Loop** | 用 | PvE 本身就是 Human-AI Collaboration |
| **Context Engineering** | 用 | Battle history + psych state + opponent model → prompt |
| **Self-Reflection** | 用 | 每回合后 Agent 复盘，跨回合影响行为 |
| **A2A 通信** | 概念 | 6 条 Agent 间通信通道（队内协商 + 跨队心理战） |
| **RAG / 向量检索** | 不用 | 类型克制是 18×18 静态矩阵，无需检索 |
| **Multi-Modal Agent** | 不用 | 无图片理解需求 |
| **Long-Running Autonomous Loop** | 不用 | 回合制，不是持续探索场景 |
| **A2A 完整协议栈** | 不用 | Agent 同进程，无需跨服务发现和认证 |

<div style="background:#0f3460;padding:12px;border-radius:8px;margin:12px 0">

**面试叙事主线**："我设计了一个 multi-agent battle system，Trainer 领导和 3 个 Pokemon worker 各司其职。Agent 通过 tool calling 分步推理战斗决策，队内有协商通信，训练师能跨回合建模对手行为，每回合 Agent 会自省复盘——这些都是当前 Agent 工程的主流技术在真实场景下的原生应用。"

</div>

### Agent Hierarchy

```
┌──────────────────────────────────────────────────────────┐
│              Opponent Trainer Agent (Leader)               │
│                                                            │
│  Observes battlefield → Models opponent → Forms strategy   │
│  Issues commands → Listens to team → Evaluates trust       │
│  Personality: Aggressive / Balanced / Cautious              │
└──┬────────────────┬──────────────────┬────────────────────┘
   │ commands        │ listens          │ manages
   ▼                 ▼                  ▼
┌──────────┐  ┌──────────────────────────────────────────┐
│ Active   │  │          Bench Pokemon Agents (2)          │
│ Pokemon  │  │                                            │
│ Agent    │  │  "Let me fight! Fire beats Grass!"         │
│          │  │  "Charmander you're too aggressive..."      │
│  Executes │◄─┤  Each bench agent:                         │
│  Obeys /  │  │  - Watches battle → Forms opinions         │
│  Defies   │  │  - Battle Lust accumulates per turn        │
│  Expresses│  │  - Personality drives suggestion style     │
│  Fear     │  │  - Can plead to replace active Pokemon     │
└──────────┘  └──────────────────────────────────────────┘
   │
   │  inter-team communication
   │  (trash talk / intimidation / mind games)
   ▼
┌──────────────────────────────────────────────────────────────┐
│              Player's Team (Player controls active Pokemon)    │
│                                                                │
│  ┌──────────┐    ┌──────────────────────────────────────┐     │
│  │  Active  │    │        Player Bench Pokemon           │     │
│  │ Pokemon  │    │  (optional: also agents with opinions) │     │
│  │ (manual) │    └──────────────────────────────────────┘     │
│  └──────────┘                                                  │
└──────────────────────────────────────────────────────────────┘
```

### Agent Types

| Agent | Role | LLM Calls/Turn | Autonomy |
|-------|------|---------------|----------|
| **Opponent Trainer** | Leader — strategist, opponent modeler, command issuer | 1 | Full |
| **Opponent Active Pokemon** | Worker — move selector, command evaluator, emotional voice | 1 | Semi (can defy) |
| **Opponent Bench Pokemon** (×2) | Observer — battle analyst, substitution pleader | 1 each | Full opinion |
| **Player Bench Pokemon** (×2, optional) | Observer — trash talk target, morale voice | 1 each | Full opinion |

**Total LLM calls per turn: up to 6** (1 trainer + 1 active + 4 bench). Each call is independent and can run in parallel where no data dependency exists.

### Inter-Agent Communication Channels

| Channel | Participants | Content | Direction |
|---------|-------------|---------|-----------|
| **Command** | Trainer → Active Pokemon | Strategy directive + suggested move | One-way |
| **Feedback** | Active Pokemon → Trainer | Obedience status, HP/fear report | One-way |
| **Plea** | Bench Pokemon → Trainer | Substitution request with reasoning | One-way |
| **Team Chat** | All Pokemon (same team) | Tactical suggestions, encouragement, criticism | Multi-way |
| **Cross-Team** | Active ↔ Opponent Active | Trash talk, intimidation, psychological warfare | Bi-directional |
| **Bench Cross-Talk** | Bench ↔ Opponent Bench | Commentary, predictions, defense of teammates | Multi-way |

---

## Five Pokemon Agent Behavior Systems

Each Pokemon Agent maintains internal psychological state that evolves turn-by-turn. These systems run as pre/post hooks around the LLM call.

### 1. Obedience System

Governs whether the Pokemon follows the Trainer's command.

```
Base Obedience = 0.7 (varies by personality)
Personality multipliers:
  Brave:    ×0.6  (strong-willed, often defies)
  Calm:     ×1.2  (trusts trainer's judgment)
  Clever:   ×1.0  (defies only with good reason)
  Playful:  ×0.8  (defies for fun)
  Timid:    ×1.3  (grateful for guidance)
  Mysterious: ×0.5 (unpredictable defiance)

Outcomes:
  obey:      uses trainer's suggested move
  modify:    same category but different move (e.g., trainer said Flamethrower, used Ember)
  defy:      completely self-chosen move
```

### 2. Battle Lust System

How badly a bench Pokemon wants to enter the battle.

```
Battle Lust starts at personality base:
  Brave: 0.5, Calm: 0.3, Clever: 0.3, Playful: 0.6, Timid: 0.1, Mysterious: 0.4

Accumulates per turn:
  +0.15  Opponent weak to own type
  +0.20  Active teammate HP < 30%
  +0.10  Active teammate has status condition
  +0.05  Trainer's strategy matches own style
  -0.10  Opponent counters own type

Thresholds:
  ≥ 0.5: mentions desire in team chat
  ≥ 0.7: formally pleads to Trainer for substitution
  = 1.0: demands to be switched in (may cause tension)
```

### 3. Fear System

The active Pokemon's willingness to continue fighting.

```
Fear starts at 0.0, modified by personality multiplier:
  Brave: ×0.3, Calm: ×0.5, Clever: ×0.6, Playful: ×0.7, Mysterious: ×0.4, Timid: ×1.5

Accumulates:
  +0.30  Hit by super-effective move
  +0.20  Critical hit received
  +0.15  HP < 30% (per turn while low)
  +0.10  Burn damage tick
  +0.15  Opponent trash talk successful
  +0.40  Teammate faints (future)
  
Decays:
  -0.10  Successfully landed a super-effective hit
  -0.05  Trainer encouragement received

Expression thresholds:
  ≥ 0.3: expresses unease in team chat
  ≥ 0.5: suggests switching out to Trainer
  ≥ 0.7: only uses defensive/status moves (refuses attack commands)
  ≥ 0.9: attempts to flee → forced switch (or loss if no bench available)
```

### 4. Social Dynamics

Relationship graph between all Pokemon on a team.

```python
# Initial bonds (0.0 = neutral, 1.0 = strong bond)
social_graph = {
    "charmander": {"bulbasaur": 0.6, "squirtle": 0.3, "pikachu": 0.7, "eevee": 0.2, "gengar": 0.1},
    "squirtle":   {"charmander": 0.3, "bulbasaur": 0.5, "pikachu": 0.4, "eevee": 0.6, "gengar": 0.3},
    # ... etc
}
```

Effects:
- Higher bond → suggestions from this Pokemon weighted more heavily in active Pokemon's decision
- Higher bond → encouragement more effective at reducing fear
- Low bond → criticism, dismissal, and sarcasm more likely
- Bonds evolve over time based on shared battle experience (Phase 2)

### 5. Opponent Model (Trainer)

The Trainer Agent tracks player behavior across turns:

```
Tracked patterns:
  - Move type distribution (attack vs status ratio)
  - Risk tolerance (uses high-risk moves when?)
  - Predictability (same move repeated?)
  - HP thresholds (changes behavior at what HP?)

Output per turn:
  predicted_next_move_type: "attack" | "status" | "defense"
  predicted_risk_level: 0.0-1.0
  confidence: 0.0-1.0

Injected into Trainer's strategy prompt as context.
```

---

## Tool Calling — Agent 的分步推理

每个 Pokemon Agent 在最终选招之前，可以调用 Tool 分步推理。这不是硬塞——人类玩家脑子里就在做这些计算。把它显式化成 tool call，中间结果可以流式展示在前端，观众看得到 Agent "在做功课"。

### Tool Registry

```python
# 所有 Agent 共享的 Tool 集合
TOOLS = {
    "check_type_effectiveness": {
        "description": "查询攻击属性对防御属性的克制倍率",
        "parameters": {"move_type": "string", "defender_types": "list[string]"},
        "returns": {"multiplier": "float", "effect_text": "string"},  # 2.0, "效果拔群"
    },
    "estimate_damage": {
        "description": "估算技能对目标造成的伤害范围",
        "parameters": {"move_name": "string", "attacker_stats": "Stats", "defender_stats": "Stats", "is_stab": "bool"},
        "returns": {"min_damage": "int", "max_damage": "int", "expected": "float"},
    },
    "check_pp_remaining": {
        "description": "查询技能剩余 PP",
        "parameters": {"move_name": "string"},
        "returns": {"current_pp": "int", "max_pp": "int", "is_low": "bool"},
    },
    "get_status_info": {
        "description": "查询当前状态效果的影响",
        "parameters": {"status": "string"},
        "returns": {"description": "string", "effects": "list[string]"},
    },
    "check_speed_comparison": {
        "description": "比较双方当前有效速度（考虑麻痹减速）",
        "parameters": {},
        "returns": {"my_speed": "int", "opponent_speed": "int", "i_go_first": "bool"},
    },
}
```

### Active Pokemon Agent 的典型 Tool Call 流程

```
Agent 收到 Trainer 指令: "使用 Flamethrower 压制"

Step 1: tool_call → check_type_effectiveness("fire", ["water"])
        返回: {multiplier: 0.5, effect_text: "效果不好"}
        思考: "火打水只有一半伤害..."

Step 2: tool_call → estimate_damage("喷射火焰", my_stats, opponent_stats, stab=true)
        返回: {min: 38, max: 52, expected: 45.3}
        思考: "即使打满也就 52，不够杀"

Step 3: tool_call → check_speed_comparison()
        返回: {my_speed: 100, opponent_speed: 78, i_go_first: true}
        思考: "我先手，有机会"

Step 4: tool_call → check_pp_remaining("喷射火焰")
        返回: {current_pp: 12, max_pp: 15, is_low: false}
        思考: "PP 够用"

最终决策: 服从指令，选 Flamethrower
```

### 前端展示

每个 tool call 在前端 Agent 面板中展示为一个可展开的卡片：

```
┌─────────────────────────────────┐
│ 🔧 check_type_effectiveness     │
│ fire → water                    │
│ 结果: 0.5x (效果不好)            │
├─────────────────────────────────┤
│ 💭 "火打水只有一半伤害..."        │
└─────────────────────────────────┘
  ↓ (0.3s stagger)
┌─────────────────────────────────┐
│ 🔧 estimate_damage              │
│ Flamethrower: 38-52 dmg         │
├─────────────────────────────────┤
│ 💭 "即使打满也不够杀"            │
└─────────────────────────────────┘
```

### 哪些 Agent 用哪些 Tool

| Agent | Tool Set | 使用场景 |
|-------|---------|---------|
| **Active Pokemon** | 全部 5 个 | 选招前分步分析 |
| **Bench Pokemon** | check_type_effectiveness, check_speed_comparison | 分析"如果让我上会怎样" |
| **Trainer** | check_type_effectiveness, check_speed_comparison | 制定策略时参考 |
| **Chat Agent** | 无 | 垃圾话不需要 tool |

### Tool 调用策略

- Tool 调用是**可选的**——Agent 可以在 system prompt 中被指示"先分析再决策"或"直接决策"
- Brave Charmander 的性格 modifier 是"少用 tool，直接打"——它的 system prompt 会指示跳过分析
- Clever Bulbasaur 的性格 modifier 是"先用 tool 分析再行动"——它会用满 4 个 tool
- 这本身就是一个可观察的性格差异化行为

---

## Self-Reflection — 回合后复盘

每回合结算完成后，Active Pokemon Agent 和 Trainer Agent 对自己的决策进行简短复盘。复盘结果跨回合持久化，影响后续行为。

### 复盘维度

```
Active Pokemon 复盘:
  1. 选招是否合理？（实际伤害 vs 备选招的预期伤害）
  2. 服从/抗命是否正确？（结果验证了选择吗？）
  3. 对对手的判断是否准确？（预判的攻击招实际来了吗？）
  4. 情绪状态是否影响了理性判断？

Trainer 复盘:
  1. 策略是否有效？（进攻/防守/消耗的选择对吗？）
  2. 对玩家行为的预测是否准确？（Opponent Model 的预测 vs 实际）
  3. Pokemon 的信任度应该调整吗？
```

### 复盘输出

```python
class ReflectionResult(BaseModel):
    agent_id: str
    turn: int
    decision_was_correct: bool       # 事后评估
    alternative_would_be_better: str | None  # "选 Hydro Pump 期望伤害 72 > 40"
    learned_insight: str             # "低估了对手的攻击性"
    confidence_adjustment: float     # -0.1 ~ +0.1，对下回合决策置信度的影响
```

### 复盘影响

```
复盘 → 修改下回合行为参数:
  "我上次太保守了" → risk_tolerance +0.1(临时)
  "抗命是对的"     → obedience ×0.9 (临时，更容易再抗命)
  "Trainer 命令是对的" → obedience ×1.1 (临时，更容易服从)
  "对手比预想的更激进" → 更新 Opponent Model 的 aggression_estimate

临时修正持续 2-3 回合后衰减，模拟"短期记忆"
```

### 前端展示

复盘结果在回合结算后以简短的"事后诸葛亮"卡片展示：

```
┌─────────────────────────────────┐
│ 🤔 Gengar 复盘                  │
│ "选 Shadow Ball 打了 68。       │
│  如果催眠成功然后换 Bulbasaur，  │
│  可能更稳。但我不后悔。"         │
│ 信心: ████████░░ -0.1           │
└─────────────────────────────────┘
```

---

## Turn Flow (Expanded)

每个回合的完整 Agent 编排流程：

```
PHASE 1: Player selects move (manual, frontend)
  │
  ▼
PHASE 2: Bench Agents observe & form opinions
  ├── Opponent Bench ×2: analyze battle → optional tool calls → team chat messages
  └── Player Bench ×2: analyze battle → optional tool calls → team chat messages
  (All 4 run in PARALLEL — no data dependencies)
  │
  ▼
PHASE 3: Cross-team communication
  ├── Opponent Active ↔ Player Bench: trash talk
  └── Bench cross-talk: commentary exchange
  (2-4 calls, runs after Phase 2 completes)
  │
  ▼
PHASE 4: Trainer Agent strategizes
  ├── Receives: battle state + bench opinions + opponent model + last reflection
  └── Outputs: strategy + suggested move → sends to Active Pokemon
  │
  ▼
PHASE 5: Active Pokemon Agent decides
  ├── Receives: trainer command + team chat + fear state + obedience check
  ├── Process:
  │   ├── Optional: tool calling (type check → damage estimate → speed compare → PP check)
  │   └── Evaluate command → apply personality filter → check fear override
  └── Outputs: final move decision + emotional expression + tool call trace
  │
  ▼
PHASE 6: Battle engine resolves
  ├── Player move vs Agent move
  ├── Damage calculation, status effects
  └── Update all agent states (fear, battle lust, obedience history)
  │
  ▼
PHASE 7: Self-Reflection
  ├── Active Pokemon: evaluate own decision → learned insight → adjust parameters
  └── Trainer: evaluate strategy accuracy → update opponent model → adjust trust
  │
  ▼
PHASE 8: Results broadcast
  ├── Turn result + reflection to all agents
  ├── Agent reactions (brief, 1-line emotional responses)
  └── Frontend updates: animations, HP bars, log, agent panels, tool call trace, reflection card
```

**Latency strategy**: Phase 2 bench calls run in parallel (fastest first). Phase 3 is optional and can be skipped under latency pressure. Phase 4 and 5 are sequential (data dependency). Target total: < 5s per turn.

---

## Scope

### In Scope (v2)
- Multi-agent architecture: 1 Trainer + 3 Pokemon per team (1 active + 2 bench)
- 6 starter Pokemon with unique personalities, stats, move sets
- 5 behavior systems: Obedience, Battle Lust, Fear, Social Dynamics, Opponent Model
- **Tool Calling**: 5 tools for agent step-by-step battle reasoning
- **Self-Reflection**: post-turn evaluation with cross-turn behavioral impact
- Inter-agent communication: team chat, cross-team trash talk, bench commentary
- Forced switching: Pokemon can retreat due to fear, bench Pokemon can demand to enter
- "Run away" mechanic: extreme fear → Pokemon may flee battle (rare, personality-gated)
- 1v1 turn-based PvE battle (player manual vs AI multi-agent system)
- Standard battle mechanics: type chart, STAB, critical hits, accuracy, priority
- 3 status effects: burn, paralysis, sleep
- All agent thinking + tool calls + reflections fully visible in real-time
- Pixel-art battle scene with move animations and particle effects
- Post-battle summary with full agent interaction replay

### Out of Scope
- Items, weather, terrain, abilities
- Stat stage modifiers
- Multi-Pokemon simultaneous field
- Nurturing system / bond evolution (Phase 2)
- Story system / rival / gym (Phase 3)
- Mobile responsive

---

## Design Decisions (Updated)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent framework | CrewAI | Native Crew/Agent/Task/Process abstractions map directly to Trainer/Pokemon/Command/Team hierarchy |
| Agent transparency | Every agent's thoughts + tool calls + reflections visible in dedicated panels | Core demo value — watching 5+ agents interact, reason with tools, and self-reflect in real-time |
| Obedience model | Custom middleware between CrewAI agents | CrewAI doesn't natively model "defiance" — custom behavior layer needed |
| Psychological state | In-memory state objects, updated per turn | Fear/BattleLust/Social are numerical simulations, not LLM-generated |
| Tool Calling | 5 deterministic Python functions exposed as Tools | Agent 分步推理的战斗计算不需要 LLM，但"调用工具"这个行为本身是 Agent 工程的核心 pattern |
| Self-Reflection | Post-turn LLM evaluation, numerical parameter adjustment | 展示 Agent 的"学习能力"——规则不能跨回合自适应，但复盘可以 |
| Bench agents | Full LLM agents with independent opinions + tools | Different from most demos — bench isn't just data, it's actors |
| Cross-team chat | Separate LLM calls with dedicated chat prompts | Creates authentic "sports drama" dynamic |
| LLM calls per turn | Up to 8 (6 agents + tool calls + 2 reflections), aggressive parallelization | Portfolio demo — latency tolerance is higher for showcase value |
| Game renderer | Phaser.js (unchanged) | Battle scene remains a game, not a dashboard |

---

## 6 Starter Pokemon (Updated with Full Parameters)

| # | Pokemon | Types | Personality | Aggression | Risk Tol. | Obedience | Fear Mult | Battle Lust Base | Playstyle |
|---|---------|-------|-------------|------------|-----------|-----------|-----------|-----------------|-----------|
| 1 | Charmander | Fire | Brave | 0.8 | 0.7 | 0.6 | 0.3 | 0.5 | Defies to attack, low fear |
| 2 | Squirtle | Water | Calm | 0.4 | 0.3 | 1.2 | 0.5 | 0.3 | Follows orders, measured fear |
| 3 | Bulbasaur | Grass/Poison | Clever | 0.5 | 0.5 | 1.0 | 0.6 | 0.3 | Strategic defiance, calculated retreat |
| 4 | Pikachu | Electric | Playful | 0.7 | 0.8 | 0.8 | 0.7 | 0.6 | Defies for fun, high battle lust |
| 5 | Eevee | Normal | Timid | 0.3 | 0.2 | 1.3 | 1.5 | 0.1 | Highly obedient but easily terrified |
| 6 | Gengar | Ghost/Poison | Mysterious | 0.8 | 0.9 | 0.5 | 0.4 | 0.4 | Unpredictable defiance, erratic fear |

---

## Architecture

### Backend (Python FastAPI + CrewAI, deployed on Railway)

```
backend/
├── app/
│   ├── main.py                     # FastAPI app with CORS + lifespan
│   ├── api/
│   │   ├── router.py               # Include all sub-routers
│   │   ├── pokemon.py              # GET /api/pokemon, GET /api/pokemon/:id
│   │   └── battles.py              # POST /api/battles, GET /api/battles/:id
│   ├── ws/
│   │   └── battle_ws.py            # WebSocket endpoint + turn state machine
│   ├── engine/
│   │   ├── battle.py               # Turn orchestration
│   │   ├── damage.py               # Damage formula
│   │   ├── type_chart.py           # 18-type effectiveness matrix
│   │   └── effects.py              # Status effect resolution
│   ├── agents/
│   │   ├── crew_factory.py         # Builds CrewAI Crew (trainer + pokemon + bench)
│   │   ├── trainer_agent.py        # Trainer Agent definition + strategy prompt
│   │   ├── pokemon_agent.py        # Pokemon Agent definition + decision prompt
│   │   ├── bench_agent.py          # Bench Agent definition + observation prompt
│   │   ├── chat_agent.py           # Cross-team chat / trash talk prompts
│   │   ├── tools/
│   │   │   ├── registry.py         # Tool definitions + ToolRegistry
│   │   │   ├── type_check.py       # check_type_effectiveness tool
│   │   │   ├── damage_estimate.py  # estimate_damage tool
│   │   │   ├── pp_check.py         # check_pp_remaining tool
│   │   │   ├── status_info.py      # get_status_info tool
│   │   │   └── speed_compare.py    # check_speed_comparison tool
│   │   ├── harness/
│   │   │   ├── pipeline.py         # Multi-agent turn pipeline (orchestrator)
│   │   │   ├── behavior/
│   │   │   │   ├── obedience.py    # Obedience calculation + defiance logic
│   │   │   │   ├── battle_lust.py  # Battle lust accumulation + plea logic
│   │   │   │   ├── fear.py         # Fear accumulation + retreat logic
│   │   │   │   ├── social.py       # Relationship graph + bond effects
│   │   │   │   └── opponent_model.py # Player behavior tracking + prediction
│   │   │   ├── reflection.py       # Post-turn self-reflection + parameter adjustment
│   │   │   └── hooks.py            # Pre/post hook registry
│   │   └── prompts/
│   │       ├── trainer.py          # Trainer system prompt templates
│   │       ├── pokemon.py          # Pokemon decision prompt templates
│   │       ├── bench.py            # Bench observation prompt templates
│   │       └── chat.py             # Trash talk / team chat templates
│   ├── models/
│   │   ├── pokemon.py              # Pydantic: Stats, MoveDef, Personality
│   │   ├── battle.py               # Pydantic: BattleState, BattlePokemon, TurnResult
│   │   ├── agent.py                # Pydantic: AgentDecision, AgentState, ChatMessage
│   │   └── team.py                 # Pydantic: Team, TeamState, SocialGraph
│   └── data/
│       ├── pokemon.json            # 6 Pokemon definitions
│       ├── moves.json              # ~24 move definitions
│       ├── personalities.json      # 6 personality presets (expanded)
│       └── social_graph.json       # Initial relationship values
├── requirements.txt
└── Dockerfile
```

### Frontend (Next.js 14 + Phaser.js, deployed on Vercel)

```
frontend/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Team select screen (pick 3 Pokemon)
│   └── battle/[id]/page.tsx        # Battle screen
├── components/
│   ├── select/
│   │   ├── TeamBuilder.tsx         # Pick 3 Pokemon + assign active/bench
│   │   ├── PokemonCard.tsx
│   │   └── PokemonGrid.tsx
│   └── battle/
│       ├── BattleCanvas.tsx        # Phaser canvas mount point
│       ├── TrainerMindPanel.tsx    # Trainer agent thinking (top-right)
│       ├── ActivePokemonPanel.tsx  # Active Pokemon agent thinking + tool calls (right)
│       ├── ToolCallCard.tsx        # Individual tool call expandable card
│       ├── ReflectionCard.tsx      # Post-turn reflection card
│       ├── BenchPanel.tsx          # Bench agents chat + battle lust meters
│       ├── TeamChatPanel.tsx       # Team internal chat stream
│       ├── CrossTalkPanel.tsx      # Cross-team trash talk stream
│       ├── MoveSelector.tsx        # 4 move buttons
│       ├── PlayerPokemonCard.tsx   # HP/stats display
│       ├── OpponentPokemonCard.tsx # HP/stats display
│       ├── BattleLog.tsx           # Turn event log
│       ├── TurnBanner.tsx          # Turn indicator + phase
│       └── BattleEndOverlay.tsx    # Winner/summary/replay
├── game/
│   ├── config.ts
│   ├── scenes/BattleScene.ts
│   ├── objects/
│   │   ├── PokemonSprite.ts
│   │   ├── HPBar.ts
│   │   └── BattleBackground.ts
│   └── effects/
│       ├── FireEffect.ts ... (6 types)
├── hooks/
│   └── useBattleSocket.ts
├── store/
│   └── battleStore.ts              # Zustand store (expanded for multi-agent)
├── lib/
│   ├── api.ts
│   └── types.ts
└── public/sprites/
```

---

## Data Models (Expanded)

### Agent Psychological State

```python
class AgentInternalState(BaseModel):
    """Per-Pokemon psychological state, updated each turn."""
    pokemon_id: str
    fear: float = 0.0                # 0.0–1.0
    battle_lust: float = 0.0         # 0.0–1.0 (bench only)
    obedience_last_turn: str | None  # "obeyed" | "modified" | "defied"
    obedience_streak: int = 0        # consecutive defiances
    last_emotion: str = "neutral"    # "confident"|"nervous"|"angry"|"scared"|"excited"|"smug"
```

### Team & Social Graph

```python
class SocialBond(BaseModel):
    from_pokemon: str
    to_pokemon: str
    bond: float = 0.5                # 0.0–1.0
    history: list[str]               # significant interaction events

class TeamState(BaseModel):
    team_id: str
    trainer: TrainerPersonality
    active_pokemon: BattlePokemon
    bench: list[BattlePokemon]       # 2 bench Pokemon
    social_graph: dict[str, dict[str, float]]
    internal_states: dict[str, AgentInternalState]
```

### Chat Messages

```python
class ChatMessage(BaseModel):
    turn: int
    from_agent: str                  # "trainer" | "charmander" | "bench_bulbasaur"
    to_agent: str                    # "team" | "charmander" | "opponent_active"
    channel: str                     # "team_chat" | "cross_team" | "command" | "plea"
    content: str                     # message text in Chinese
    emotion: str                     # emotional tone

class ToolCall(BaseModel):
    turn: int
    agent_id: str
    tool_name: str
    input_params: dict
    output_result: dict
    agent_comment: str               # Agent's 1-line reaction to the result

class ReflectionResult(BaseModel):
    agent_id: str
    turn: int
    decision_was_correct: bool
    alternative_would_be_better: str | None
    learned_insight: str
    confidence_adjustment: float
    narrative: str                   # 性格化的事后总结
```

### Battle State (Updated)

```python
class BattleStateV2(BaseModel):
    battle_id: str
    player_team: TeamState            # Player's team (1 active + 2 bench)
    opponent_team: TeamState          # Opponent's team (1 active + 2 bench)
    current_turn: int
    phase: str                        # "player_select" | "bench_observe" | "cross_talk"
                                      # | "trainer_strategy" | "pokemon_decide" | "resolving"
                                      # | "reflection" | "finished" | "cancelled"
    winner: str | None
    history: list[TurnResult]
    chat_history: list[ChatMessage]
    tool_call_history: list[ToolCall]
    reflection_history: list[ReflectionResult]
```

---

## API Design (Updated)

### REST
```
GET  /api/pokemon              → list[PokemonDef] (6 items)
GET  /api/pokemon/:id          → PokemonDef (full, with move objects)
POST /api/battles              → {battle_id, ws_url}
     body: {
         player_active_id: "charmander",
         player_bench_ids: ["bulbasaur", "squirtle"],
         opponent_team_ids: ["pikachu", "eevee", "gengar"]  # 1st = active
     }
```

### WebSocket (`ws://host/ws/battle/{battle_id}`)

**Client → Server:**
```json
{"type": "start_battle"}
{"type": "player_move", "move_index": 0}
{"type": "player_switch", "bench_index": 0}     // manual switch
{"type": "encourage_pokemon"}                    // reduce fear
{"type": "rematch"}
{"type": "leave"}
```

**Server → Client (new/updated types):**
```json
// Phase progression
{"type": "phase_change", "data": {"phase": "bench_observe"}}

// Bench agent opinions (stream as they complete)
{"type": "bench_opinion", "data": {"pokemon_id": "bulbasaur", "message": "...", "battle_lust": 0.65}}

// Team chat message
{"type": "team_chat", "data": ChatMessage}

// Cross-team trash talk
{"type": "cross_talk", "data": ChatMessage}

// Trainer thinking (streaming)
{"type": "trainer_thinking_start"}
{"type": "trainer_thinking_chunk", "data": {"text": "..."}}
{"type": "trainer_command", "data": TrainerDecision}

// Pokemon decision with tool call trace
{"type": "tool_call_start", "data": {"pokemon_id": "gengar", "tool_name": "check_type_effectiveness"}}
{"type": "tool_call_result", "data": {"pokemon_id": "gengar", "tool_name": "...", "input": {...}, "output": {...}}}
{"type": "pokemon_thinking_start"}
{"type": "pokemon_thinking_chunk", "data": {"text": "..."}}
{"type": "pokemon_decision", "data": AgentDecision}

// Self-reflection after turn resolves
{"type": "reflection_start", "data": {"agent_id": "gengar"}}
{"type": "reflection_result", "data": ReflectionResult}

// Psychological state update
{"type": "agent_state_update", "data": {"pokemon_id": "...", "state": AgentInternalState}}

// Retreat / forced switch
{"type": "pokemon_retreat", "data": {"pokemon_id": "...", "reason": "...", "replacement_id": "..."}}

// Battle events (unchanged)
{"type": "turn_animation", "data": {actions, timing}}
{"type": "turn_resolved", "data": TurnResult}
{"type": "battle_ended", "data": {winner, history, chat_history}}
{"type": "error", "data": {message, code}}
```

---

## Battle Mechanics (Unchanged from v1)

### Damage Formula
```
Damage = floor(
    ((2 * 50 / 5 + 2) * POWER * (ATK / DEF) / 50 + 2)
    * STAB(1.5 if matching type)
    * TypeEffectiveness(0/0.25/0.5/1/2/4)
    * Critical(1.5 if crit)
    * Random(0.85~1.0)
)
```

### Turn Resolution Order
1. Player selects move (manual)
2. Bench agents observe, form opinions, accumulate battle lust
3. Cross-team chat exchanges
4. Trainer agent strategizes, issues command
5. Active Pokemon agent evaluates command, applies personality, decides
6. Engine resolves: speed → accuracy → crit → damage → status → burn tick → faint check
7. Results broadcast, psychological states updated

### Type Effectiveness
Standard 18-type chart. Dual-type multipliers are multiplicative.

---

## Frontend Layout (Expanded)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Turn 5                                          [TRAINER THINKING]  │
├────────────────────────────┬──────────────────┬──────────────────────┤
│                            │                  │ TRAINER              │
│    [BATTLE CANVAS]         │  OPPONENT TEAM   │ "局势劣，让            │
│                            │  ┌────────────┐  │  Bulbasaur准备..."   │
│   🦎          👻           │  │ Active:    │  │                      │
│  Charmander  Gengar        │  │ Gengar     │  ├──────────────────────┤
│  ████░░ 72   ██████ 105    │  │ HP:105/105 │  │ ACTIVE POKEMON       │
│                            │  │ 😈 Smug    │  │ GENGAR THINKING      │
│                            │  └────────────┘  │ "嘻嘻...对面小火龙     │
│                            │  ┌────────────┐  │  以为能打到我？让      │
│                            │  │ Bench:     │  │  我催眠他再换            │
│                            │  │ ⭐ Pikachu  │  │  上..."             │
│  [particles & animations]  │  │ 🍃Bulbasaur│  ├──────────────────────┤
│                            │  └────────────┘  │ BENCH CHAT           │
│                            │                  │ Pikachu: "我想上！"   │
│                            │  [BENCH PANEL]   │ Bulbasaur: "等等，    │
│                            │  Battle Lust:    │  对面鬼系打不了我"      │
│                            │  Pikachu  ████░░ │                      │
│                            │  Bulbasaur ██░░░░ │                      │
├────────────────────────────┴──────────────────┼──────────────────────┤
│ YOUR POKEMON                                   │ CROSS-TALK           │
│ Charmander HP:72/120 🔥BURN                     │ Gengar→"You sure   │
│                                                │  you wanna do that?"│
│ [🔥Ember] [🔥Flamethrower] [✂Scratch] [😱Growl]│ Charmander→"Shut   │
│                                                │  up ghost!"         │
├────────────────────────────────────────────────┴──────────────────────┤
│ ⚔ Charmander used Ember! 42 damage!                                 │
│ ⚔ Gengar used Shadow Ball! 68 damage! Critical hit!                 │
│ ⚔ Charmander is hurt by its burn! -15 HP                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Deployment (Unchanged)

- Frontend: Vercel (Next.js)
- Backend: Railway (Docker, FastAPI + uvicorn)
- LLM: 百炼 DeepSeek v4 pro
- Local dev: Docker Compose

## Constraints

- Desktop only (1920×1080+)
- Requires active 百炼 API key
- **Up to 8 LLM calls per turn** (4 bench + 1 trainer + 1 active + 2 reflection). Bench agents run in parallel.
- Tool calls are deterministic Python functions, no LLM cost
- API cost per battle: ~¥1.00–3.00 (depending on turn count)
- Target turn latency: < 5s (tool calls are instant; parallel bench agents reduce wall-clock time)
- No persistence (ephemeral battles)

## Verification

1. **Engine unit tests**: damage, type chart, status effects
2. **Behavior unit tests**: obedience, fear/battle_lust accumulation, social bond effects, opponent model prediction accuracy
3. **Tool unit tests**: each tool returns correct values for known inputs
4. **Reflection unit tests**: parameter adjustments stay within valid ranges
5. **Agent integration tests**: mock LLM responses, verify correct agent communication flow + tool call sequences + reflection execution
6. **Multi-agent quality**: 10 simulated battles, verify:
   - Agent wins > 60%
   - Tool calls per turn: Brave Pokemon < 1, Clever Pokemon > 3 (性格驱动的差异化)
   - Defiance events in > 50% of battles
   - At least 1 retreat/forced-switch event per 3 battles
   - Cross-team trash talk > 5 messages per battle
   - Reflection generates actionable insights (not just "good job")
7. **Manual E2E**: full battle with real LLM, verify all panels update, tool calls + reflections visible
8. **Demo video**: record complete multi-agent battle with tool calls and reflection
