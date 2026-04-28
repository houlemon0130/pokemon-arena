# Pokemon Arena 战斗系统 — 实施计划 v2

> **适用对象：** 本项目使用 Claude Code 实现。计划审批后逐任务执行。

**目标：** 构建一个浏览器端宝可梦对战模拟器，AI 对手是一个多 Agent 系统——1 个训练师 Agent (Leader) 指挥 3 个宝可梦 Agent (1 个上场 + 2 个板凳)，每个 Agent 有独立的性格、心理状态、自主行为、Tool Calling、Agent 间通信和自我复盘。

**架构：** Next.js 14 前端内嵌 Phaser.js 战斗画布。Python FastAPI 后端运行 CrewAI 做多 Agent 编排。在 CrewAI 之上自建 thin harness 层，实现 5 个行为系统（服从/恐惧/上场欲望/社交/对手建模）、Tool Calling、流式输出和自我复盘。WebSocket 实时推送所有 Agent 的思考过程。

**技术栈：** Next.js 14, Phaser.js 3, Zustand, Tailwind CSS, Framer Motion, Python FastAPI, CrewAI, Pydantic, WebSocket, 百炼 DeepSeek v4 pro

---

## 给实施者

> **你是代码实施者。你的任务是严格按照本计划实现。**
>
> **不要：** 重新设计、重新规划、质疑设计。设计和规格已经批准过了。
>
> **要做：** 按顺序执行每个任务，每段代码都用 TDD，每个任务完成后跑验证，频繁 commit。
>
> **如果被阻塞：** 报告阻塞点。不要猜测或即兴发挥。

**规格文档：** `docs/superpowers/specs/2026-04-27-pokemon-arena-design.md`

---

## 文件结构总览

```
pokemon-arena/
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI 应用入口
│   │   ├── models/                  # Pydantic 数据模型
│   │   │   ├── pokemon.py          # Stats, MoveDef, Personality, PokemonDef
│   │   │   ├── battle.py           # BattlePokemon, BattleState, TurnResult
│   │   │   ├── agent.py            # AgentDecision, MoveScore, AgentInternalState, ReflectionResult
│   │   │   └── team.py             # TeamState, ChatMessage, ToolCall
│   │   ├── data/                    # 游戏静态数据
│   │   │   ├── pokemon.json        # 6 只宝可梦定义
│   │   │   ├── moves.json          # ~24 个技能定义
│   │   │   ├── personalities.json  # 6 种性格预设（含行为参数）
│   │   │   └── social_graph.json   # 宝可梦间初始关系值
│   │   ├── engine/                  # 战斗引擎（纯数学计算）
│   │   │   ├── type_chart.py       # 18 属性克制矩阵
│   │   │   ├── damage.py           # 伤害公式
│   │   │   ├── effects.py          # 状态效果（烧伤/麻痹/睡眠）
│   │   │   └── battle.py           # 回合结算
│   │   ├── behavior/                # 行为系统（纯规则，不调LLM）
│   │   │   ├── obedience.py        # 服从计算
│   │   │   ├── fear.py             # 恐惧累加
│   │   │   ├── battle_lust.py      # 上场欲望累加
│   │   │   ├── social.py           # 关系图
│   │   │   └── opponent_model.py   # 对手行为追踪
│   │   ├── tools/                   # 5 个确定性工具
│   │   │   ├── registry.py         # ToolRegistry
│   │   │   ├── type_check.py
│   │   │   ├── damage_estimate.py
│   │   │   ├── pp_check.py
│   │   │   ├── status_info.py
│   │   │   └── speed_compare.py
│   │   ├── agents/                  # Agent 层（LLM）
│   │   │   ├── crew_factory.py     # CrewAI Crew 构建
│   │   │   ├── reflection.py       # 自我复盘
│   │   │   └── prompts/            # Prompt 模板
│   │   │       ├── trainer.py      # 训练师
│   │   │       ├── pokemon.py      # 上场宝可梦
│   │   │       ├── bench.py        # 板凳宝可梦
│   │   │       └── chat.py         # 垃圾话/队内聊天
│   │   ├── pipeline/                # 回合流水线
│   │   │   ├── orchestrator.py     # 回合编排器
│   │   │   └── streaming.py        # LLM 流式调用
│   │   ├── api/                     # REST 接口
│   │   │   ├── router.py
│   │   │   ├── pokemon.py          # GET /api/pokemon
│   │   │   └── battles.py          # POST /api/battles
│   │   └── ws/                      # WebSocket
│   │       └── battle_ws.py        # WebSocket 端点 + 状态机
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # 选宠页面
│   │   │   └── battle/[id]/page.tsx # 对战页面
│   │   ├── lib/
│   │   │   ├── types.ts            # 前端类型定义
│   │   │   └── api.ts              # REST API 封装
│   │   ├── store/
│   │   │   └── battleStore.ts      # Zustand 全局状态
│   │   ├── hooks/
│   │   │   └── useBattleSocket.ts  # WebSocket 连接管理
│   │   ├── components/
│   │   │   ├── select/             # 选宠页组件
│   │   │   │   ├── PokemonCard.tsx
│   │   │   │   └── PokemonGrid.tsx
│   │   │   └── battle/             # 对战页组件
│   │   │       ├── BattleCanvas.tsx       # Phaser 画布挂载
│   │   │       ├── TrainerMindPanel.tsx   # 训练师思考面板
│   │   │       ├── ActivePokemonPanel.tsx # 上场宝可梦思考面板
│   │   │       ├── ToolCallCard.tsx       # Tool Call 卡片
│   │   │       ├── ReflectionCard.tsx     # 复盘卡片
│   │   │       ├── BenchPanel.tsx         # 板凳宝可梦面板
│   │   │       ├── TeamChatPanel.tsx      # 队内聊天
│   │   │       ├── CrossTalkPanel.tsx     # 跨队垃圾话
│   │   │       ├── MoveSelector.tsx       # 技能选择按钮
│   │   │       ├── PlayerPokemonCard.tsx  # 玩家宝可梦卡片
│   │   │       ├── OpponentPokemonCard.tsx# 对手宝可梦卡片
│   │   │       ├── BattleLog.tsx          # 战斗日志
│   │   │       ├── TurnBanner.tsx         # 回合指示
│   │   │       └── BattleEndOverlay.tsx   # 战斗结算
│   │   └── game/                   # Phaser 游戏层
│   │       ├── config.ts
│   │       ├── scenes/BattleScene.ts
│   │       ├── objects/
│   │       │   ├── PokemonSprite.ts
│   │       │   ├── HPBar.ts
│   │       │   └── BattleBackground.ts
│   │       └── effects/            # 6 种技能粒子特效
│   │           ├── FireEffect.ts ...
├── tests/                          # 后端测试
│   ├── test_models.py
│   ├── test_game_data.py
│   ├── test_type_chart.py
│   ├── test_damage.py
│   ├── test_effects.py
│   ├── test_behavior.py
│   ├── test_tools.py
│   ├── test_battle.py
│   ├── test_prompts.py
│   ├── test_reflection.py
│   └── test_api.py
└── docker-compose.yml
```

---

## 任务 1：后端脚手架

**涉及文件：**
- 新建: `backend/requirements.txt`
- 新建: `backend/Dockerfile`
- 新建: `backend/app/__init__.py`（空文件）
- 新建: `backend/app/main.py`
- 新建: `backend/.env.example`
- 修改: `.gitignore`

- [ ] **第1步：创建 backend/requirements.txt（不固定版本号，使用最新版）**

```
fastapi
uvicorn[standard]
pydantic
httpx
websockets
python-dotenv
crewai
pytest
pytest-asyncio
```

- [ ] **第2步：创建 backend/Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **第3步：创建 backend/app/main.py**

```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Pokemon Arena API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **第4步：创建 backend/.env.example**

```
BAILIAN_API_KEY=你的API密钥
```

- [ ] **第5步：更新 .gitignore**，追加 `__pycache__/` 和 `.env`

- [ ] **第6步：验证后端能启动**

```bash
cd backend && pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 &
curl http://localhost:8000/health
```

预期返回: `{"status":"ok"}`。测试完关掉服务。

- [ ] **第7步：提交**

```bash
git add backend/ .gitignore
git commit -m "feat: 初始化后端项目 FastAPI + CrewAI"
```

---

## 任务 2：前端脚手架

**涉及文件：**
- 新建: `frontend/`（通过 create-next-app 创建）
- 新建: `frontend/.env.local`
- 新建: `frontend/Dockerfile`

- [ ] **第1步：创建 Next.js 项目**

```bash
cd /Users/houlemon/jay/pokemon-arena
npx create-next-app@14 frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

- [ ] **第2步：安装依赖**

```bash
cd frontend && npm install phaser@3.80.1 zustand@5.0.2 framer-motion@11.15.0
```

- [ ] **第3步：创建 frontend/.env.local**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

- [ ] **第4步：清理 globals.css**，替换为暗色主题基础样式：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0a0a; color: #e0e0e0; min-height: 100vh; }
```

- [ ] **第5步：创建 frontend/Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

- [ ] **第6步：验证前端能启动**

```bash
cd frontend && npm run dev
```

浏览器访问 http://localhost:3000，应该看到一个空白的暗色页面。测试完关掉。

- [ ] **第7步：提交**

```bash
git add frontend/
git commit -m "feat: 初始化前端 Next.js 14 + Phaser + Zustand + Framer Motion"
```

---

## 任务 3：后端数据模型

**涉及文件：**
- 新建: `backend/app/models/__init__.py`（空文件）
- 新建: `backend/app/models/pokemon.py`
- 新建: `backend/app/models/battle.py`
- 新建: `backend/app/models/agent.py`
- 新建: `backend/app/models/team.py`
- 新建: `tests/test_models.py`

- [ ] **第1步：写会失败的测试 — tests/test_models.py**

```python
import pytest
from app.models.pokemon import Stats, MoveDef, Personality, PokemonDef
from app.models.battle import BattlePokemon, BattleStateV2, TurnResult
from app.models.agent import AgentDecision, MoveScore, AgentInternalState, ReflectionResult
from app.models.team import TeamState, ChatMessage, ToolCall


def test_stats模型():
    s = Stats(hp=120, attack=95, defense=78, sp_attack=109, sp_defense=85, speed=100)
    assert s.hp == 120


def test_move_def模型():
    m = MoveDef(id="火花", name="火花", type="fire", category="special", power=40, accuracy=100, pp=25)
    assert m.id == "火花"
    assert m.effect is None


def test_personality模型含行为参数():
    p = Personality(id="brave", name="Brave", aggression=0.8, risk_tolerance=0.7,
                    obedience_mult=0.6, fear_mult=0.3, battle_lust_base=0.5,
                    prompt_modifier="喜欢进攻", narrative_voice="大胆自信")
    assert p.fear_mult == 0.3
    assert p.obedience_mult == 0.6


def test_battle_pokemon模型():
    bp = BattlePokemon(
        def_id="charmander", name="Charmander", types=["fire"],
        stats=Stats(hp=120, attack=95, defense=78, sp_attack=109, sp_defense=85, speed=100),
        moves=[], personality=None, current_hp=120, max_hp=120,
    )
    assert bp.current_hp == 120


def test_agent_internal_state模型():
    state = AgentInternalState(pokemon_id="charmander", fear=0.2, battle_lust=0.5)
    assert state.fear == 0.2


def test_reflection_result模型():
    r = ReflectionResult(
        agent_id="gengar", turn=1, decision_was_correct=True,
        learned_insight="攻击是对的", confidence_adjustment=0.05, narrative="不后悔"
    )
    assert r.confidence_adjustment == 0.05


def test_team_state模型():
    ts = TeamState(
        team_id="team_1", trainer_style="balanced",
        active_pokemon_id="charmander",
        bench_pokemon_ids=["bulbasaur", "squirtle"],
        social_graph={}, internal_states={},
    )
    assert len(ts.bench_pokemon_ids) == 2


def test_chat_message模型():
    msg = ChatMessage(
        turn=1, from_agent="pikachu", to_agent="trainer",
        channel="plea", content="让我上！", emotion="excited"
    )
    assert msg.channel == "plea"


def test_tool_call模型():
    tc = ToolCall(
        turn=1, agent_id="gengar", tool_name="check_type_effectiveness",
        input_params={"move_type": "ghost", "defender_types": ["fire"]},
        output_result={"multiplier": 1.0, "effect_text": "普通"},
        agent_comment="伤害正常"
    )
    assert tc.tool_name == "check_type_effectiveness"
```

- [ ] **第2步：跑测试 — 验证全部失败**

```bash
cd backend && python -m pytest tests/test_models.py -v
```

预期：全部 FAIL，因为模块还不存在

- [ ] **第3步：创建 backend/app/models/pokemon.py**

```python
from pydantic import BaseModel


class Stats(BaseModel):
    hp: int
    attack: int
    defense: int
    sp_attack: int
    sp_defense: int
    speed: int


class MoveDef(BaseModel):
    id: str
    name: str
    type: str
    category: str  # "physical" | "special" | "status"
    power: int | None = None
    accuracy: int = 100
    pp: int
    priority: int = 0
    effect: str | None = None


class Personality(BaseModel):
    id: str
    name: str
    aggression: float          # 攻击倾向 0-1
    risk_tolerance: float      # 风险承受 0-1
    obedience_mult: float      # 服从乘数（<1 = 容易抗命）
    fear_mult: float           # 恐惧乘数（>1 = 容易害怕）
    battle_lust_base: float    # 上场欲望基础值
    prompt_modifier: str       # 注入 system prompt 的行为描述
    narrative_voice: str       # 说话风格


class PokemonDef(BaseModel):
    id: str
    name: str
    types: list[str]
    stats: Stats
    moves: list[str]           # 技能 ID 列表
    personality: str           # 性格 ID
```

- [ ] **第4步：创建 backend/app/models/battle.py**

```python
from pydantic import BaseModel
from .pokemon import Stats, MoveDef, Personality


class BattlePokemon(BaseModel):
    """战斗中宝可梦的运行时实例"""
    def_id: str
    name: str
    types: list[str]
    stats: Stats
    moves: list[MoveDef]
    personality: Personality | None = None
    current_hp: int
    max_hp: int
    status: str | None = None      # "burn" | "paralysis" | "sleep"
    status_turns: int = 0


class TurnResult(BaseModel):
    turn: int
    player_move: str
    agent_move: str
    player_damage: int
    agent_damage: int
    events: list[str]              # 日志消息
    hp_after: dict[str, int]


class BattleStateV2(BaseModel):
    battle_id: str
    player_team_id: str
    opponent_team_id: str
    current_turn: int
    phase: str = "player_select"
    winner: str | None = None
    history: list[TurnResult] = []
    chat_history: list = []
    tool_call_history: list = []
    reflection_history: list = []
```

- [ ] **第5步：创建 backend/app/models/agent.py**

```python
from pydantic import BaseModel


class MoveScore(BaseModel):
    move_index: int
    move_name: str
    score: float
    reason: str


class AgentDecision(BaseModel):
    pokemon_name: str
    chosen_move_index: int
    chosen_move_name: str
    confidence: float              # 0.0-1.0
    reasoning: str                 # 中文推理，2-3句
    move_scores: list[MoveScore] = []
    obedience_status: str = "obeyed"  # "obeyed" | "modified" | "defied"


class AgentInternalState(BaseModel):
    """宝可梦心理状态，每回合更新"""
    pokemon_id: str
    fear: float = 0.0              # 0.0-1.0
    battle_lust: float = 0.0       # 0.0-1.0（仅板凳）
    obedience_last_turn: str | None = None
    obedience_streak: int = 0      # 连续抗命次数
    last_emotion: str = "neutral"


class ReflectionResult(BaseModel):
    agent_id: str
    turn: int
    decision_was_correct: bool
    alternative_would_be_better: str | None = None
    learned_insight: str
    confidence_adjustment: float   # -0.1 ~ +0.1
    narrative: str                 # 性格化的复盘总结
```

- [ ] **第6步：创建 backend/app/models/team.py**

```python
from pydantic import BaseModel


class TeamState(BaseModel):
    team_id: str
    trainer_style: str             # "aggressive" | "balanced" | "cautious"
    active_pokemon_id: str
    bench_pokemon_ids: list[str]
    social_graph: dict[str, dict[str, float]]
    internal_states: dict[str, dict]


class ChatMessage(BaseModel):
    turn: int
    from_agent: str
    to_agent: str
    channel: str                   # "team_chat" | "cross_team" | "command" | "plea" | "feedback"
    content: str
    emotion: str


class ToolCall(BaseModel):
    turn: int
    agent_id: str
    tool_name: str
    input_params: dict
    output_result: dict
    agent_comment: str             # Agent 对结果的 1 句话反应
```

- [ ] **第7步：跑测试 — 验证全部通过**

```bash
cd backend && python -m pytest tests/test_models.py -v
```

预期：全部 9 条测试 PASS

- [ ] **第8步：提交**

```bash
git add backend/app/models/ tests/test_models.py
git commit -m "feat: 添加 Pydantic 数据模型 — 宝可梦、战斗、Agent、队伍"
```

---

## 任务 4：游戏静态数据（JSON 文件）

**涉及文件：**
- 新建: `backend/app/data/personalities.json`
- 新建: `backend/app/data/moves.json`
- 新建: `backend/app/data/pokemon.json`
- 新建: `backend/app/data/social_graph.json`
- 新建: `tests/test_game_data.py`

- [ ] **第1步：写会失败的测试 — tests/test_game_data.py**

```python
import json


def test_性格json合法():
    with open("app/data/personalities.json") as f:
        data = json.load(f)
    assert len(data) == 6
    for pid, p in data.items():
        assert "obedience_mult" in p
        assert "fear_mult" in p
        assert "battle_lust_base" in p
        assert 0 <= p["aggression"] <= 1


def test_技能json合法():
    with open("app/data/moves.json") as f:
        data = json.load(f)
    assert len(data) >= 24
    for mid, m in data.items():
        assert "type" in m
        assert "category" in m


def test_宝可梦json合法():
    with open("app/data/pokemon.json") as f:
        data = json.load(f)
    assert len(data) == 6
    for pid, p in data.items():
        assert len(p["types"]) >= 1
        assert len(p["moves"]) == 4


def test_社交图json合法():
    with open("app/data/social_graph.json") as f:
        data = json.load(f)
    all_ids = ["charmander", "squirtle", "bulbasaur", "pikachu", "eevee", "gengar"]
    for pid in all_ids:
        assert pid in data
```

- [ ] **第2步：跑测试 — 验证全部失败**（文件还不存在）

- [ ] **第3步：创建 backend/app/data/personalities.json**

```json
{
  "brave": {
    "id":"brave","name":"Brave","aggression":0.8,"risk_tolerance":0.7,
    "obedience_mult":0.6,"fear_mult":0.3,"battle_lust_base":0.5,
    "prompt_modifier":"你热爱进攻。你相信最好的防守就是进攻。即使在属性劣势时也偏向攻击。",
    "narrative_voice":"大胆而自信"
  },
  "calm": {
    "id":"calm","name":"Calm","aggression":0.4,"risk_tolerance":0.3,
    "obedience_mult":1.2,"fear_mult":0.5,"battle_lust_base":0.3,
    "prompt_modifier":"你耐心且防守型。在进攻前先强化自己。等待合适的时机。",
    "narrative_voice":"冷静而沉稳"
  },
  "clever": {
    "id":"clever","name":"Clever","aggression":0.5,"risk_tolerance":0.5,
    "obedience_mult":1.0,"fear_mult":0.6,"battle_lust_base":0.3,
    "prompt_modifier":"你是战术型。状态效果是你的主要工具——先使用催眠粉或寄生种子，再进攻。读懂对手然后适应。",
    "narrative_voice":"聪明而策略性"
  },
  "playful": {
    "id":"playful","name":"Playful","aggression":0.7,"risk_tolerance":0.8,
    "obedience_mult":0.8,"fear_mult":0.7,"battle_lust_base":0.6,
    "prompt_modifier":"你喜欢刺激和不可预测性。你偏爱高风险高回报的招式，喜欢给对手惊喜。",
    "narrative_voice":"顽皮而好动"
  },
  "timid": {
    "id":"timid","name":"Timid","aggression":0.3,"risk_tolerance":0.2,
    "obedience_mult":1.3,"fear_mult":1.5,"battle_lust_base":0.1,
    "prompt_modifier":"你极其谨慎。优先削弱对手和保护自己。只在绝对安全时才进攻。",
    "narrative_voice":"胆小犹豫"
  },
  "mysterious": {
    "id":"mysterious","name":"Mysterious","aggression":0.8,"risk_tolerance":0.9,
    "obedience_mult":0.5,"fear_mult":0.4,"battle_lust_base":0.4,
    "prompt_modifier":"你神秘而不可预测。你喜欢状态折磨——催眠术+奇异之光，然后用暗影球收割。享受对手挣扎的样子。",
    "narrative_voice":"阴森而神秘"
  }
}
```

- [ ] **第4步：创建 backend/app/data/moves.json** — 24 个技能，包含所有 6 只宝可梦的招式：ember, flamethrower, scratch, growl, water_gun, hydro_pump, tackle, withdraw, vine_whip, razor_leaf, sleep_powder, leech_seed, thunderbolt, thunder_shock, quick_attack, thunder_wave, double_edge, sand_attack, helping_hand, shadow_ball, hypnosis, confuse_ray, lick, tail_whip。（完整 JSON 参考规格文档）

- [ ] **第5步：创建 backend/app/data/pokemon.json** — 6 只宝可梦完整定义，示例：

```json
{
  "charmander": {
    "id":"charmander","name":"Charmander","types":["fire"],
    "stats":{"hp":120,"attack":95,"defense":78,"sp_attack":109,"sp_defense":85,"speed":100},
    "moves":["火花","喷射火焰","抓","叫声"],
    "personality":"brave"
  },
  "squirtle": {
    "id":"squirtle","name":"Squirtle","types":["water"],
    "stats":{"hp":127,"attack":83,"defense":121,"sp_attack":100,"sp_defense":110,"speed":78},
    "moves":["water_gun","hydro_pump","撞击","缩壳"],
    "personality":"calm"
  }
}
```

（剩余 4 只参考规格文档）

- [ ] **第6步：创建 backend/app/data/social_graph.json** — 6×6 邻接矩阵，关键关系：charmander↔pikachu:0.7, squirtle↔eevee:0.6, charmander↔bulbasaur:0.6, gengar 对所有人都 <0.4

- [ ] **第7步：跑测试 — 验证全部通过**

```bash
cd backend && python -m pytest tests/test_game_data.py -v
```

- [ ] **第8步：提交**

```bash
git add backend/app/data/ tests/test_game_data.py
git commit -m "feat: 添加游戏数据 — 6只宝可梦、24个技能、6种性格、社交图"
```

---

## 任务 5：属性克制引擎

**涉及文件：**
- 新建: `backend/app/engine/__init__.py`（空文件）
- 新建: `backend/app/engine/type_chart.py`
- 新建: `tests/test_type_chart.py`

- [ ] **第1步：写会失败的测试**

```python
from app.engine.type_chart import get_effectiveness, TYPE_CHART


def test_火克草(): assert get_effectiveness("fire", ["grass"]) == 2.0
def test_水克火(): assert get_effectiveness("water", ["fire"]) == 2.0
def test_草克水(): assert get_effectiveness("grass", ["water"]) == 2.0
def test_电克水(): assert get_effectiveness("electric", ["water"]) == 2.0
def test_一般打幽灵无效(): assert get_effectiveness("normal", ["ghost"]) == 0.0
def test_中立(): assert get_effectiveness("normal", ["normal"]) == 1.0
def test_效果不好(): assert get_effectiveness("fire", ["water"]) == 0.5
def test_双属性四倍克制(): assert get_effectiveness("grass", ["water", "ground"]) == 4.0
def test_双属性四分之一(): assert get_effectiveness("bug", ["fire", "flying"]) == 0.25
def test_18属性全覆盖():
    types = ["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"]
    for t in types:
        assert t in TYPE_CHART
        assert len(TYPE_CHART[t]) == 18
```

- [ ] **第2步：跑测试 — 验证全部失败**

- [ ] **第3步：创建 type_chart.py** — 完整 18×18 克制矩阵 + `get_effectiveness(move_type, defender_types) → float`（防御方多属性时乘法叠加）

- [ ] **第4步：跑测试 — 验证 10 条全部 PASS**

- [ ] **第5步：提交**

```bash
git add backend/app/engine/ tests/test_type_chart.py
git commit -m "feat: 添加 18 属性克制矩阵及双属性倍率计算"
```

---

## 任务 6：伤害公式 + 状态效果

**涉及文件：**
- 新建: `backend/app/engine/damage.py`
- 新建: `backend/app/engine/effects.py`
- 新建: `tests/test_damage.py`
- 新建: `tests/test_effects.py`

- [ ] **第1步：写会失败的测试**

伤害测试（7 条）：
```python
from app.engine.damage import calculate_damage

def test_基础伤害为正():
    dmg = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=1.0, critical=1.0)
    assert 15 <= dmg <= 20

def test_STAB加成():
    dmg1 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=1.0, critical=1.0)
    dmg2 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.5, type_mult=1.0, critical=1.0)
    assert dmg2 > dmg1

def test_效果拔群翻倍():
    dmg1 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=1.0, critical=1.0)
    dmg2 = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=2.0, critical=1.0)
    assert dmg2 >= dmg1 * 1.8

def test_免疫伤害为零():
    dmg = calculate_damage(power=40, attack_stat=100, defense_stat=100, stab=1.0, type_mult=0.0, critical=1.0)
    assert dmg == 0

def test_暴击加成(): ...
def test_高攻低防伤害大(): ...
def test_保底伤害为1(): ...
```

状态效果测试（8 条）：
```python
from app.engine.effects import apply_burn_damage, check_paralysis_skip, check_sleep_wake, try_apply_status, get_effective_speed

def test_烧伤扣八分之一(): assert apply_burn_damage(120) == 15
def test_烧伤保底扣1(): assert apply_burn_damage(5) == 1
def test_麻痹25%跳过(): ...
def test_睡眠33%醒来(): ...
def test_施加状态(): ...
def test_已有状态不再叠加(): ...
def test_麻痹速度减半(): assert get_effective_speed(100, "paralysis") == 50
def test_烧伤不影响速度(): assert get_effective_speed(100, "burn") == 100
```

- [ ] **第2步：跑测试 — 验证全部失败**

- [ ] **第3步：创建 damage.py**

```python
import random, math

def calculate_damage(power, attack_stat, defense_stat, stab=1.0, type_mult=1.0, critical=1.0) -> int:
    if type_mult == 0.0:
        return 0
    level = 50
    base = math.floor(((2 * level / 5 + 2) * power * (attack_stat / defense_stat) / 50 + 2))
    base *= stab * type_mult * critical
    base *= random.uniform(0.85, 1.0)
    return max(1, math.floor(base))
```

- [ ] **第4步：创建 effects.py** — 实现 `apply_burn_damage`, `check_paralysis_skip`, `check_sleep_wake`, `try_apply_status`, `get_effective_speed`

- [ ] **第5步：跑测试 — 验证全部 PASS**

- [ ] **第6步：提交**

```bash
git add backend/app/engine/damage.py backend/app/engine/effects.py tests/test_damage.py tests/test_effects.py
git commit -m "feat: 添加伤害公式和状态效果（烧伤/麻痹/睡眠）"
```

---

## 任务 7：行为系统（5 个纯规则引擎）

**涉及文件：**
- 新建: `backend/app/behavior/__init__.py`（空文件）
- 新建: `backend/app/behavior/obedience.py`
- 新建: `backend/app/behavior/fear.py`
- 新建: `backend/app/behavior/battle_lust.py`
- 新建: `backend/app/behavior/social.py`
- 新建: `backend/app/behavior/opponent_model.py`
- 新建: `tests/test_behavior.py`

- [ ] **第1步：写会失败的测试 — tests/test_behavior.py**

```python
import pytest
from app.behavior.obedience import obedience_check
from app.behavior.fear import accumulate_fear, express_fear
from app.behavior.battle_lust import accumulate_battle_lust, check_plea_threshold
from app.behavior.social import load_social_graph, get_bond, apply_bond_effect
from app.behavior.opponent_model import OpponentModel


def test_brave容易抗命():
    results = [obedience_check(0.6, 0.7, 0) for _ in range(100)]
    defiances = sum(1 for r in results if r == "defied")
    assert defiances >= 10  # 统计下限


def test_timid容易服从():
    results = [obedience_check(1.3, 0.7, 0) for _ in range(100)]
    obeys = sum(1 for r in results if r == "obeyed")
    assert obeys >= 60


def test_连续抗命增加再犯概率():
    results = [obedience_check(0.6, 0.7, 3) for _ in range(100)]
    defiances = sum(1 for r in results if r == "defied")
    assert defiances >= 20


def test_fear受击累加():
    fear = accumulate_fear(0.0, 50, 120, None, False, False)
    assert fear > 0.0


def test_fear乘数影响结果():
    brave_fear = accumulate_fear(0.0, 50, 120, None, False, False) * 0.3
    timid_fear = accumulate_fear(0.0, 50, 120, None, False, False) * 1.5
    assert timid_fear > brave_fear


def test_fear分级表达():
    assert express_fear(0.2, 0.3, "brave") == "none"
    assert express_fear(0.45, 0.3, "brave") == "unease"
    assert express_fear(0.65, 0.3, "brave") == "suggest_retreat"
    assert express_fear(0.85, 0.3, "brave") == "force_defensive"
    assert express_fear(0.95, 0.3, "brave") == "attempt_flee"


def test_battle_lust属性优势时上涨():
    lust = accumulate_battle_lust(0.3, "fire", ["grass"], False, False)
    assert lust > 0.3


def test_battle_lust请战阈值():
    assert check_plea_threshold(0.65) is True
    assert check_plea_threshold(0.40) is False


def test_social_graph加载正确():
    graph = load_social_graph()
    assert graph["charmander"]["pikachu"] == 0.7
    assert graph["gengar"]["eevee"] == 0.1


def test_opponent_model追踪出招():
    model = OpponentModel()
    model.record_move("attack", 40, 0.8, True)
    model.record_move("attack", 38, 0.7, False)
    pred = model.predict()
    assert pred["predicted_move_type"] == "attack"
```

- [ ] **第2步：跑测试 — 验证全部失败**

- [ ] **第3步：创建 obedience.py**

```python
import random

def obedience_check(obedience_mult: float, base_obedience: float = 0.7, defiance_streak: int = 0) -> str:
    """返回 "obeyed"、"modified" 或 "defied" """
    streak_penalty = min(defiance_streak * 0.08, 0.3)
    effective = min(obedience_mult * base_obedience - streak_penalty, 1.0)
    roll = random.random()
    if roll < effective * 0.7:
        return "obeyed"
    elif roll < effective:
        return "modified"
    else:
        return "defied"
```

- [ ] **第4步：创建 fear.py**

```python
def accumulate_fear(current: float, damage_taken: int, max_hp: int,
                    status: str | None, was_super_effective: bool,
                    was_critical: bool) -> float:
    pct = damage_taken / max_hp
    fear = current
    fear += pct * 0.5
    if was_super_effective: fear += 0.20
    if was_critical: fear += 0.15
    if status == "burn": fear += 0.05
    if status and pct > 0.2: fear += 0.10
    return min(fear, 1.0)


def express_fear(fear: float, fear_mult: float, personality: str) -> str:
    """将恐惧数值翻译成行为级别"""
    effective = fear * fear_mult
    if effective >= 0.9: return "attempt_flee"       # 试图逃跑
    if effective >= 0.7: return "force_defensive"    # 只用防守技
    if effective >= 0.5: return "suggest_retreat"    # 建议撤退
    if effective >= 0.3: return "unease"             # 表达不安
    return "none"                                    # 正常战斗
```

- [ ] **第5步：创建 battle_lust.py**

```python
from app.engine.type_chart import get_effectiveness

def accumulate_battle_lust(current: float, self_type: str, opponent_types: list[str],
                           teammate_low_hp: bool, teammate_status: bool) -> float:
    lust = current
    eff = get_effectiveness(self_type, opponent_types)
    if eff >= 2.0: lust += 0.20
    elif eff > 1.0: lust += 0.10
    elif eff <= 0.5: lust -= 0.10
    if teammate_low_hp: lust += 0.20
    if teammate_status: lust += 0.10
    return min(max(lust, 0.0), 1.0)


def check_plea_threshold(lust: float) -> bool:
    return lust >= 0.65
```

- [ ] **第6步：创建 social.py**

```python
import json

def load_social_graph() -> dict:
    with open("app/data/social_graph.json") as f:
        return json.load(f)


def get_bond(graph: dict, from_id: str, to_id: str) -> float:
    return graph.get(from_id, {}).get(to_id, 0.5)


def apply_bond_effect(base: float, bond: float, effect_type: str) -> float:
    """关系值影响行为权重"""
    if effect_type == "encouragement":
        return base * (1.0 + bond * 0.5)    # 高好感鼓励更有效
    elif effect_type == "suggestion_weight":
        return base + bond * 0.3             # 高好感建议更被采纳
    elif effect_type == "criticism":
        return base * (1.0 - bond * 0.6)     # 低好感批评更刻薄
    return base
```

- [ ] **第7步：创建 opponent_model.py**

```python
class OpponentModel:
    """追踪玩家行为，纯规则统计"""
    def __init__(self):
        self.move_history: list[str] = []
        self.damage_history: list[int] = []
        self.hp_pct_history: list[float] = []
        self.was_se_history: list[bool] = []

    def record_move(self, move_type: str, damage: int, hp_pct: float, was_se: bool):
        self.move_history.append(move_type)
        self.damage_history.append(damage)
        self.hp_pct_history.append(hp_pct)
        self.was_se_history.append(was_se)

    def predict(self) -> dict:
        if len(self.move_history) < 2:
            return {"predicted_move_type": "attack", "confidence": 0.5}
        attack_count = sum(1 for m in self.move_history if m in ("attack", "physical", "special"))
        ratio = attack_count / len(self.move_history)
        if ratio > 0.7:
            return {"predicted_move_type": "attack", "confidence": min(ratio, 0.9)}
        elif ratio < 0.3:
            return {"predicted_move_type": "status", "confidence": min(1.0 - ratio, 0.9)}
        return {"predicted_move_type": "mixed", "confidence": 0.6}
```

- [ ] **第8步：跑测试 — 验证 10 条全部 PASS**

- [ ] **第9步：提交**

```bash
git add backend/app/behavior/ tests/test_behavior.py
git commit -m "feat: 添加 5 个行为系统 — 服从、恐惧、上场欲望、社交、对手建模"
```

---

## 任务 8：Tool Registry（5 个确定性工具）

**涉及文件：**
- 新建: `backend/app/tools/__init__.py`（空文件）
- 新建: `backend/app/tools/registry.py`
- 新建: `backend/app/tools/type_check.py`
- 新建: `backend/app/tools/damage_estimate.py`
- 新建: `backend/app/tools/pp_check.py`
- 新建: `backend/app/tools/status_info.py`
- 新建: `backend/app/tools/speed_compare.py`
- 新建: `tests/test_tools.py`

- [ ] **第1步：写会失败的测试**

```python
from app.tools.type_check import check_type_effectiveness
from app.tools.damage_estimate import estimate_damage
from app.tools.pp_check import check_pp_remaining
from app.tools.status_info import get_status_info
from app.tools.speed_compare import check_speed_comparison
from app.tools.registry import ToolRegistry


def test_属性克制工具():
    result = check_type_effectiveness("fire", ["grass"])
    assert result["multiplier"] == 2.0
    assert "效果拔群" in result["effect_text"]


def test_伤害估算工具返回范围():
    result = estimate_damage("火花", 100, 100, 100, 100, True)
    assert result["min"] <= result["expected"] <= result["max"]


def test_PP查询工具():
    result = check_pp_remaining("火花")
    assert result["current_pp"] > 0


def test_状态信息工具():
    result = get_status_info("burn")
    assert "每回合" in result["description"]


def test_速度比较工具():
    result = check_speed_comparison(100, None, 80, None)
    assert result["i_go_first"] is True


def test_ToolRegistry列出所有工具():
    registry = ToolRegistry()
    tools = registry.list_tools()
    assert len(tools) == 5
    assert "check_type_effectiveness" in tools
```

- [ ] **第2步：跑测试 — 验证全部失败**

- [ ] **第3步：逐个创建工具模块** — 每个工具是纯 Python 函数，接收确定输入，返回 dict。`pp_check.py` 读取 moves.json。`damage_estimate.py` 运行伤害公式 100 次取 min/max/expected。

- [ ] **第4步：创建 registry.py**

```python
from .type_check import check_type_effectiveness
from .damage_estimate import estimate_damage
from .pp_check import check_pp_remaining
from .status_info import get_status_info
from .speed_compare import check_speed_comparison


class ToolRegistry:
    def __init__(self):
        self._tools = {
            "check_type_effectiveness": check_type_effectiveness,
            "estimate_damage": estimate_damage,
            "check_pp_remaining": check_pp_remaining,
            "get_status_info": get_status_info,
            "check_speed_comparison": check_speed_comparison,
        }

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())

    def execute(self, tool_name: str, **kwargs) -> dict:
        if tool_name not in self._tools:
            raise ValueError(f"未知工具: {tool_name}")
        return self._tools[tool_name](**kwargs)
```

- [ ] **第5步：跑测试 — 验证 6 条全部 PASS**

- [ ] **第6步：提交**

```bash
git add backend/app/tools/ tests/test_tools.py
git commit -m "feat: 添加 5 个确定性战斗工具及 ToolRegistry"
```

---

## 任务 9：Agent Prompt 模板

**涉及文件：**
- 新建: `backend/app/agents/__init__.py`（空文件）
- 新建: `backend/app/agents/prompts/__init__.py`（空文件）
- 新建: `backend/app/agents/prompts/trainer.py`
- 新建: `backend/app/agents/prompts/pokemon.py`
- 新建: `backend/app/agents/prompts/bench.py`
- 新建: `backend/app/agents/prompts/chat.py`
- 新建: `tests/test_prompts.py`

- [ ] **第1步：写会失败的 prompt 测试** — 验证每个模板：
  - 训练师 prompt 包含性格描述、对手模型预测、板凳意见
  - 上场宝可梦 prompt 包含 4 个技能（带克制提示）、fear/obedience 状态、tool 可用性
  - 板凳 prompt 包含观战分析重点、上场欲望
  - 聊天 prompt 包含性格口吻、对话目标

- [ ] **第2步：跑测试 — 验证全部失败**

- [ ] **第3步：创建 prompts/trainer.py**

```python
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


def build_trainer_turn_message(active_pokemon, player_pokemon, opponent_prediction: dict,
                                bench_opinions: list[dict], turn: int, last_reflection: str | None) -> str:
    a = active_pokemon
    p = player_pokemon
    pred_type = opponent_prediction.get("predicted_move_type", "unknown")
    pred_conf = opponent_prediction.get("confidence", 0.5)

    bench_text = ""
    if bench_opinions:
        lines = []
        for o in bench_opinions:
            lines.append(f"  [{o['pokemon_id']}] (上场欲望:{o['battle_lust']:.0%}): {o['message']}")
        bench_text = "\n".join(lines)
    else:
        bench_text = "  （尚无板凳反馈）"

    return f"""第 {turn} 回合
你的上场宝可梦: {a.name} ({'/'.join(a.types)}) HP:{a.current_hp}/{a.max_hp} 状态:{a.status or '无'}
对手宝可梦: {p.name} ({'/'.join(p.types)}) HP:{p.current_hp}/{p.max_hp} 状态:{p.status or '无'}

对手模型预测: {pred_type}（置信度: {pred_conf:.0%}）

板凳宝可梦意见:
{bench_text}

上回合复盘: {last_reflection or '无'}

请以 JSON 格式下达指令。"""
```

- [ ] **第4步：创建 prompts/pokemon.py**

```python
def build_pokemon_system_prompt(pokemon, tools_available: list[str]) -> str:
    p = pokemon
    pers = p.personality
    tools_hint = ""
    if pers.aggression > 0.7:
        tools_hint = "你更倾向于凭直觉行动而非详细分析。少用工具——相信你的战斗本能。"
    elif pers.id == "clever":
        tools_hint = f"你是分析型选手。在决策前使用可用工具（{', '.join(tools_available)}）评估战局。"

    return f"""你是 {p.name}，一只{'/'.join(p.types)}属性的宝可梦，性格{pers.name}。
{pers.narrative_voice}
{pers.prompt_modifier}

{tools_hint}

你正在对战中。你的训练师每回合会给你下达指令。
你有自主权——你可以服从、修正（同类型但不同招式）或拒绝训练师的指令，这取决于你的性格和当前处境。

你可以使用战斗分析工具来辅助决策。

请以合法 JSON 格式回复：
{{"pokemon_name": "{p.name}", "chosen_move_index": 0, "chosen_move_name": "...",
  "confidence": 0.85, "reasoning": "你的中文推理", "obedience_status": "obeyed|modified|defied",
  "move_scores": [{{"move_index": 0, "move_name": "...", "score": 0.85, "reason": "一句话原因"}}]}}"""


def build_pokemon_turn_message(pokemon, opponent, trainer_command: dict,
                                fear_level: float, obedience_result: str, turn: int) -> str:
    p = pokemon
    opp = opponent
    fear_text = f"恐惧:{fear_level:.0%}" if fear_level > 0.2 else "恐惧: 低"

    moves_text = "\n".join(
        f"  [{i}] {m.name} ({m.type}, PWR:{m.power or 'N/A'}, ACC:{m.accuracy}%, PP:{m.pp})"
        for i, m in enumerate(p.moves)
    )

    commander = trainer_command.get("suggested_move", "无")
    strategy = trainer_command.get("strategy", "无")
    reasoning = trainer_command.get("reasoning", "")

    return f"""第 {turn} 回合。你的 HP:{p.current_hp}/{p.max_hp}。{fear_text}
对手: {opp.name} ({'/'.join(opp.types)}) HP:{opp.current_hp}/{opp.max_hp}

训练师指令: {commander}
策略: {strategy}
训练师理由: {reasoning}

你的技能:
{moves_text}

决定你的行动。输出 JSON。"""
```

- [ ] **第5步：创建 prompts/bench.py 和 prompts/chat.py** — 类似结构，分别针对板凳观战和垃圾话场景

- [ ] **第6步：跑测试 — 验证全部 PASS**

- [ ] **第7步：提交**

```bash
git add backend/app/agents/prompts/ tests/test_prompts.py
git commit -m "feat: 添加 Agent prompt 模板 — 训练师、宝可梦、板凳、聊天"
```

---

## 任务 10：CrewAI 集成 + LLM 流式调用

**涉及文件：**
- 新建: `backend/app/agents/crew_factory.py`
- 新建: `backend/app/pipeline/__init__.py`（空文件）
- 新建: `backend/app/pipeline/streaming.py`

- [ ] **第1步：创建 streaming.py** — 封装 百炼 DeepSeek v4 pro 的流式和非流式调用：

```python
import os, json, httpx
from typing import AsyncGenerator

BAILIAN_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"


async def stream_llm(messages: list[dict], temperature: float = 0.7,
                     max_tokens: int = 500) -> AsyncGenerator[str, None]:
    """流式调用 LLM，逐 token 返回"""
    api_key = os.environ["BAILIAN_API_KEY"]
    payload = {
        "model": "deepseek-v4-pro",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST", BAILIAN_URL, json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


async def call_llm(messages: list[dict], temperature: float = 0.7,
                   max_tokens: int = 500, json_mode: bool = True) -> dict:
    """非流式调用 LLM，返回完整结果"""
    api_key = os.environ["BAILIAN_API_KEY"]
    payload = {
        "model": "deepseek-v4-pro",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            BAILIAN_URL, json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        if json_mode:
            return json.loads(content)
        return {"content": content}
```

- [ ] **第2步：创建 crew_factory.py** — 构建 CrewAI Agent 对象和 Crew：

```python
from crewai import Agent, Task, Crew, Process

def build_opponent_crew(trainer_style: str, active_pokemon, bench_pokemon: list,
                        tool_registry) -> Crew:
    """构建对手的多 Agent Crew"""
    trainer_agent = Agent(
        role="宝可梦训练师",
        goal="通过策略指挥宝可梦队伍赢得战斗",
        backstory=f"你是一位经验丰富的{trainer_style}风格训练师。",
        allow_delegation=True,
        verbose=True,
    )
    # TODO: 完善 Agent 定义 —— 包括 pokemon_agent, bench_agents, chat_agent
    # ...
    return Crew(agents=[trainer_agent], tasks=[], process=Process.hierarchical)
```

- [ ] **第3步：验证导入成功**

```bash
cd backend && python -c "from app.pipeline.streaming import stream_llm, call_llm; from app.agents.crew_factory import build_opponent_crew; print('OK')"
```

- [ ] **第4步：提交**

```bash
git add backend/app/agents/crew_factory.py backend/app/pipeline/
git commit -m "feat: 添加 CrewAI 集成和 LLM 流式调用"
```

---

## 任务 11：回合流水线编排器 + 自我复盘

**涉及文件：**
- 新建: `backend/app/pipeline/orchestrator.py`
- 新建: `backend/app/agents/reflection.py`
- 新建: `tests/test_reflection.py`

- [ ] **第1步：写会失败的测试** — 验证编排器按阶段顺序执行、复盘返回合法结构、并行板凳调用不互相阻塞

- [ ] **第2步：创建 orchestrator.py** — 核心回合执行引擎

```python
import asyncio, json
from app.pipeline.streaming import call_llm, stream_llm
from app.behavior.obedience import obedience_check
from app.behavior.fear import accumulate_fear, express_fear
from app.behavior.battle_lust import accumulate_battle_lust, check_plea_threshold
from app.behavior.social import load_social_graph, get_bond
from app.behavior.opponent_model import OpponentModel
from app.agents.prompts.trainer import build_trainer_system_prompt, build_trainer_turn_message
from app.agents.prompts.pokemon import build_pokemon_system_prompt, build_pokemon_turn_message
from app.agents.prompts.bench import build_bench_system_prompt, build_bench_turn_message
from app.agents.reflection import run_reflection
from app.tools.registry import ToolRegistry


class TurnOrchestrator:
    """回合流水线编排器：负责一个回合内所有 Agent 的调度"""

    def __init__(self, opponent_team, player_team, ws_handler):
        self.opponent_team = opponent_team
        self.player_team = player_team
        self.ws = ws_handler
        self.tools = ToolRegistry()
        self.opponent_model = OpponentModel()
        self.turn = 0
        self.reflections = []

    async def execute_turn(self, player_move_index: int) -> dict:
        self.turn += 1

        # 阶段 1: 板凳观战（并行执行）
        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "bench_observe"}})
        bench_results = await asyncio.gather(*[
            self._run_bench_agent(bp) for bp in self.opponent_team["bench"]
        ])

        # 更新每只板凳宝可梦的上场欲望
        for bp, result in zip(self.opponent_team["bench"], bench_results):
            bp["battle_lust"] = accumulate_battle_lust(
                bp.get("battle_lust", 0.3),
                bp["types"][0],
                self.player_team["active"]["types"],
                self.opponent_team["active"]["current_hp"] < self.opponent_team["active"]["max_hp"] * 0.3,
                self.opponent_team["active"]["status"] is not None,
            )
            await self.ws.broadcast({"type": "bench_opinion", "data": result})

        # 阶段 2: 训练师策略
        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "trainer_strategy"}})
        trainer_decision = await self._run_trainer_agent(bench_results)

        # 阶段 3: 上场宝可梦决策（含 Tool Calling + 流式）
        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "pokemon_decide"}})
        pokemon_decision = await self._run_pokemon_agent(trainer_decision)

        # 阶段 4: 战斗结算
        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "resolving"}})
        result = resolve_turn(
            self.player_team["active"], self.opponent_team["active"],
            player_move_index, pokemon_decision["chosen_move_index"],
        )
        result.turn = self.turn

        # 更新行为状态
        self._update_behavior_states(result, pokemon_decision)

        # 阶段 5: 自我复盘
        await self.ws.broadcast({"type": "phase_change", "data": {"phase": "reflection"}})
        reflection = await run_reflection(
            self.opponent_team["active"]["def_id"],
            pokemon_decision, result,
            self.opponent_team["active"]["personality"],
        )
        self.reflections.append(reflection)
        await self.ws.broadcast({"type": "reflection_result", "data": reflection})

        return result

    # ... 私有方法 _run_bench_agent, _run_trainer_agent, _run_pokemon_agent 等
```

- [ ] **第3步：创建 reflection.py**

```python
from app.pipeline.streaming import call_llm


async def run_reflection(agent_id: str, decision: dict, result, personality) -> dict:
    prompt = f"""你刚完成了一回合的战斗。
你的决策: {decision.get('chosen_move_name')}（服从状态: {decision.get('obedience_status', 'unknown')}）
实际伤害: {result.agent_damage}
对手出招: {result.player_move}，造成了 {result.player_damage} 伤害。

复盘你的决策:
1. 你的选择对吗？
2. 选哪个招可能更好？
3. 你学到了什么？

以合法 JSON 格式回复，包含: decision_was_correct (bool), alternative_would_be_better (string|null), learned_insight (string), narrative (string - 你的角色化中文复盘)"""

    raw = await call_llm([{"role": "user", "content": prompt}], temperature=0.5, max_tokens=250)
    return {
        "agent_id": agent_id,
        "turn": result.turn,
        "decision_was_correct": raw.get("decision_was_correct", False),
        "alternative_would_be_better": raw.get("alternative_would_be_better"),
        "learned_insight": raw.get("learned_insight", ""),
        "confidence_adjustment": 0.05 if raw.get("decision_was_correct") else -0.05,
        "narrative": raw.get("narrative", ""),
    }
```

- [ ] **第4步：跑测试 — 验证通过**

- [ ] **第5步：提交**

```bash
git add backend/app/pipeline/orchestrator.py backend/app/agents/reflection.py tests/test_reflection.py
git commit -m "feat: 添加回合流水线编排器和自我复盘"
```

---

## 任务 12：REST API + WebSocket 端点

**涉及文件：**
- 新建: `backend/app/api/` 下所有文件
- 新建: `backend/app/ws/` 下所有文件
- 修改: `backend/app/main.py`（注册路由）
- 新建: `tests/test_api.py`

- [ ] **第1步：写会失败的 API 测试** — 测试健康检查、宝可梦列表、宝可梦详情、创建战斗、WebSocket 连接

- [ ] **第2步：创建 api/pokemon.py 和 api/battles.py** — REST 端点。POST /api/battles 接受 `{player_active_id, player_bench_ids, opponent_team_ids}`，返回 `{battle_id, ws_url}`

- [ ] **第3步：创建 ws/battle_ws.py** — WebSocket 端点：
  - 接收消息类型: start_battle, player_move, player_switch, encourage_pokemon, rematch, leave
  - 管理 TurnOrchestrator 生命周期
  - 广播所有 Agent 阶段和决策
  - 处理断线重连

- [ ] **第4步：在 main.py 注册路由**

- [ ] **第5步：跑测试 — 验证通过**

- [ ] **第6步：提交**

```bash
git add backend/app/api/ backend/app/ws/ backend/app/main.py tests/test_api.py
git commit -m "feat: 添加 REST API 和 WebSocket 对战端点"
```

---

## 任务 13：战斗引擎（回合结算）

**涉及文件：**
- 新建: `backend/app/engine/battle.py`
- 新建: `tests/test_battle.py`

- [ ] **第1步：写会失败的测试** — 验证 resolve_turn 造成伤害、产生事件日志、处理濒死

- [ ] **第2步：创建 battle.py** — `resolve_turn(player_mon, agent_mon, player_move_idx, agent_move_idx)` 执行完整回合：速度比较 → 玩家先手（PvE） → Agent 出手 → 状态检查 → 命中判定 → 暴击判定 → 伤害计算 → 施加效果 → 回合结束烧伤扣血 → 濒死判定。返回 TurnResult。

- [ ] **第3步：跑测试 — 验证通过**

- [ ] **第4步：提交**

---

## 任务 14：Docker Compose

**涉及文件：**
- 新建: `docker-compose.yml`

```yaml
version: "3.8"
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment: [BAILIAN_API_KEY=${BAILIAN_API_KEY}]
    volumes: [./backend:/app]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment: [NEXT_PUBLIC_API_URL=http://backend:8000, NEXT_PUBLIC_WS_URL=ws://backend:8000]
    depends_on: [backend]
```

---

## 任务 15：前端 — 类型、API 封装、状态管理、WebSocket Hook

**涉及文件：**
- 新建: `frontend/src/lib/types.ts`
- 新建: `frontend/src/lib/api.ts`
- 新建: `frontend/src/store/battleStore.ts`
- 新建: `frontend/src/hooks/useBattleSocket.ts`

- [ ] **第1步：创建 types.ts** — 照搬后端 Pydantic 模型到 TypeScript（Stats, MoveDef, Personality, PokemonDef, BattlePokemon, BattleStateV2, AgentDecision, MoveScore, AgentInternalState, ReflectionResult, ChatMessage, ToolCall 等）

- [ ] **第2步：创建 api.ts** — `fetchPokemonList()`, `fetchPokemonDetail(id)`, `createBattle(player_active, player_bench, opponent_team)`

- [ ] **第3步：创建 battleStore.ts** — Zustand store：battleState, agentDecisions, toolCalls, reflections, chatMessages, isAgentThinking, selectedMove + 所有 setter 方法

- [ ] **第4步：创建 useBattleSocket.ts** — WebSocket hook：挂载时连接，解析所有消息类型，分发给 store。支持自动重连。

- [ ] **第5步：验证编译通过**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **第6步：提交**

---

## 任务 16：前端 — 选宠页面

**涉及文件：**
- 修改: `frontend/src/app/layout.tsx`
- 修改: `frontend/src/app/page.tsx`
- 新建: `frontend/src/components/select/PokemonCard.tsx`
- 新建: `frontend/src/components/select/PokemonGrid.tsx`

构建队伍选择界面：挑选 3 只宝可梦（第一只默认上场），卡片用 Gen V 动态精灵图，Start Battle 按钮调用 API 后跳转到 `/battle/{id}`。

---

## 任务 17：前端 — 对战页面 React 组件

**涉及文件：**
- 新建: `frontend/src/app/battle/[id]/page.tsx` — 主布局
- 新建: `frontend/src/components/battle/PlayerPokemonCard.tsx` — HP 条 + 状态 + 恐惧指示器
- 新建: `frontend/src/components/battle/OpponentPokemonCard.tsx` — HP 条 + 状态
- 新建: `frontend/src/components/battle/MoveSelector.tsx` — 4 个技能按钮（带属性标签）
- 新建: `frontend/src/components/battle/BattleLog.tsx` — 自动滚动的战斗日志
- 新建: `frontend/src/components/battle/TurnBanner.tsx` — 回合数 + 阶段指示
- 新建: `frontend/src/components/battle/TrainerMindPanel.tsx` — 流式训练师思考 + 指令
- 新建: `frontend/src/components/battle/ActivePokemonPanel.tsx` — 流式宝可梦思考 + Tool Call 展示
- 新建: `frontend/src/components/battle/ToolCallCard.tsx` — 可展开的 Tool Call 结果卡片
- 新建: `frontend/src/components/battle/BenchPanel.tsx` — 板凳宝可梦 + 上场欲望条 + 意见
- 新建: `frontend/src/components/battle/TeamChatPanel.tsx` — 队内聊天流
- 新建: `frontend/src/components/battle/CrossTalkPanel.tsx` — 跨队垃圾话流
- 新建: `frontend/src/components/battle/ReflectionCard.tsx` — 复盘卡片
- 新建: `frontend/src/components/battle/BattleEndOverlay.tsx` — 胜负 + 回放 + 再来一场

所有组件从 Zustand store 读数据，动画用 Framer Motion。

---

## 任务 18：前端 — Phaser 游戏层

**涉及文件：**
- 新建: `frontend/src/game/config.ts`
- 新建: `frontend/src/game/scenes/BattleScene.ts`
- 新建: `frontend/src/game/objects/PokemonSprite.ts` — 精灵渲染（使用 PokeAPI CDN 素材）
- 新建: `frontend/src/game/objects/HPBar.ts` — 动画血条
- 新建: `frontend/src/game/objects/BattleBackground.ts` — 战斗背景
- 新建: `frontend/src/game/effects/` — 6 种技能粒子特效
- 新建: `frontend/src/components/battle/BattleCanvas.tsx` — Phaser 画布挂载点

完整的 Phaser 战斗场景：加载宝可梦精灵图（从 PokeAPI CDN），渲染战斗背景，受击时 HP 条动画、精灵闪烁，释放技能时播放对应属性的粒子特效，逃跑/换人时播放退场动画。

---

## 任务 19：前后端联调 + Polish

- WebSocket 完整流程测试：start_battle → select → player_move → bench_observe → trainer_strategy → pokemon_decide → resolving → reflection → ... → battle_ended
- 错误处理：LLM 调用失败时降级为随机选招
- 断线重连处理
- 所有面板的加载状态
- TypeScript strict 模式零报错
- 后端全部测试通过：`cd backend && python -m pytest tests/ -v`
- 前端构建成功：`cd frontend && npm run build`

---

## 验收清单

1. `cd backend && python -m pytest tests/ -v` — 全部测试通过
2. `cd frontend && npx tsc --noEmit` — 零类型错误
3. `cd frontend && npm run build` — 构建成功
4. 后端启动，`curl localhost:8000/api/pokemon` 返回 6 只宝可梦
5. 手动端到端测试（需要 百炼 API Key）：选队 → 对战 → 观察所有 Agent 面板 → 完成 → 回放
6. 录演示视频：完整对战过程，展示所有多 Agent 交互
