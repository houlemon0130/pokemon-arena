# CLAUDE.md

## 项目：AI Pokemon Battle Arena

一个浏览器端宝可梦对战模拟器，玩家 vs AI Agent 对手。这是 Jay 的 Portfolio 项目，用于 2027 年 Q2 跳槽时展示 Agent 全栈工程能力。

## 重要：全中文规则

**本项目的宝可梦名称、招式名称、属性名称、界面文字、设计文档、实施计划全部使用中文，禁止使用英文。**

| 类型 | 示例 |
|------|------|
| 宝可梦名 | 小火龙、杰尼龟、妙蛙种子、皮卡丘、伊布、耿鬼 |
| 招式名 | 火花、喷射火焰、水枪、水炮、藤鞭、催眠粉、十万伏特、暗影球、催眠术 |
| 属性名 | 火、水、草、电、一般、幽灵、毒、超能力、格斗、地面、飞行、虫、岩石、冰、龙、恶、钢、妖精 |
| 状态 | 烧伤、麻痹、睡眠 |

## 项目位置

~/jay/pokemon-arena

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 游戏引擎 | Phaser.js | WebGL 2D 渲染，精灵动画/粒子特效/场景管理 |
| 前端壳 | Next.js 14 (App Router) | Phaser 嵌入 React，Vercel 一键部署 |
| UI 动画 | Framer Motion + Tailwind CSS | HP 条/思考面板/页面过渡 |
| 状态管理 | Zustand | React ↔ Phaser 桥接 |
| 通信 | WebSocket (原生) | 每回合实时推送 Agent 决策 |
| 后端 | Python FastAPI | 异步 WebSocket，LLM 集成 |
| LLM | 百炼 DeepSeek v4 pro | Agent 宝可梦的决策引擎 |
| 部署 | Vercel (前端) + Railway (后端 Docker) | 前后端分离，生产级 |
| 类型 | TypeScript (strict) + Pydantic | 前后端类型安全 |

## 设计决策

- **模式**：PvE（玩家手动选招 vs AI Agent 自主决策）
- **画风**：像素风（Pokemon 经典风格）
- **布局**：卡片式，右侧常驻 AI 思考面板，纯透明展示 Agent 推理
- **深度**：标准版 — 属性克制 + STAB + 暴击 + 命中 + 优先级 + 3 状态效果（烧伤/麻痹/睡眠）
- **数量**：6 只首发宝可梦，每只 4 招，独立性格

## 首发阵容

| 宝可梦 | 属性 | 性格 | 风格 |
|--------|------|------|------|
| Charmander | 火 | Brave 勇敢 | 进攻型，无视克制 |
| Squirtle | 水 | Calm 沉稳 | 防守反击 |
| Bulbasaur | 草/毒 | Clever 聪明 | 战术状态流 |
| Pikachu | 电 | Playful 顽皮 | 高风险高回报 |
| Eevee | 一般 | Timid 胆小 | 极度保守 |
| Gengar | 幽灵/毒 | Mysterious 神秘 | 状态折磨流 |

## 项目结构

```
pokemon-arena/
├── frontend/          # Next.js + Phaser.js
│   ├── src/
│   │   ├── app/       # 页面路由
│   │   ├── components/ # React UI 组件
│   │   │   ├── battle/   # 对战界面（AgentMindPanel, MoveSelector, BattleCanvas 等）
│   │   │   └── select/   # 选宠界面（PokemonGrid, PokemonCard）
│   │   ├── game/      # Phaser 游戏引擎（scenes, objects, effects）
│   │   ├── hooks/     # useBattleSocket
│   │   ├── store/     # Zustand battleStore
│   │   └── lib/       # API client, types
│   └── public/sprites/ # 宝可梦像素精灵
├── backend/           # Python FastAPI
│   └── app/
│       ├── api/       # REST 接口 + WebSocket
│       ├── engine/    # 战斗引擎（伤害/克制/效果）
│       ├── agents/    # Agent 决策（prompt/LLM/性格）
│       ├── models/    # Pydantic 数据模型
│       └── data/      # JSON 数据文件
├── docs/superpowers/specs/ # 设计文档
└── docker-compose.yml
```

## Phase 规划

| Phase | 内容 | 状态 |
|-------|------|------|
| 1 | 战斗系统（1v1 PvE + Agent 决策 + 可视化） | 当前 |
| 2 | 养成系统（亲密度/成长/进化拒绝） | 未来 |
| 3 | 故事系统（劲敌/道馆/事件） | 未来 |

## 核心设计文档

- `docs/superpowers/specs/2026-04-27-pokemon-arena-design.md` — 完整设计 Spec

## 工作流

本项目遵循 superpowers 流程：
1. brainstorming（已完成）→ 2. writing-plans → 3. 实现

### 分工

| 角色 | 工具 | 负责 |
|------|------|------|
| **设计/规划** | Claude Code | 需求分析、架构设计、Spec 编写、实施计划 |
| **编码** | Codex | 按 Plan 逐任务实现，TDD，频繁 commit |
| **代码审查** | Codex | 实现完成后 review 变更，检查是否符合 Plan |

## 开发命令

```bash
# 后端
cd backend && python -m uvicorn app.main:app --reload

# 前端
cd frontend && npm run dev

# 全部
docker-compose up
```
