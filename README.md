# 宝可梦竞技场

**AI 多 Agent 宝可梦对战模拟器** — 浏览器端 1v1 回合制 PvE 对战。你手动操作宝可梦，AI 对手是一个**多 Agent 系统**：训练师 (Leader) 指挥 3 只宝可梦 Workers (1 上场 + 2 板凳)，每只宝可梦 Agent 有独立性格、心理状态、自主决策能力，所有思考过程前端实时可视化。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | Next.js 14 (App Router) + TypeScript |
| 游戏渲染 | Phaser.js 3 |
| UI 动画 | Tailwind CSS + Framer Motion |
| 状态管理 | Zustand |
| 通信 | WebSocket (实时推送 Agent 决策) |
| 后端 | Python FastAPI |
| Agent 编排 | CrewAI |
| 大模型 | 百炼 DeepSeek V4 Flash |
| 部署 | Docker Compose |

## 核心特性

### 多 Agent 架构

```
对手训练师 (Leader)
  ├── 观察战场 → 对手建模 → 制定策略 → 下发指令
  ├── 上场宝可梦 (Worker) — 接收指令/性格过滤/自主选招
  └── 板凳宝可梦 ×2 (Worker) — 观战分析/请战/队内建议
```

### 5 大行为系统

| 系统 | 说明 |
|------|------|
| **服从度** | 宝可梦可能服从/修正/违抗训练师指令 |
| **恐惧度** | 受击积累恐惧 → 建议撤退 → 强制防御 → 擅自逃跑 |
| **上场欲望** | 板凳宝可梦请战，属性优势/队友危机时上升 |
| **社交关系** | 宝可梦间好感度影响建议权重和鼓励效果 |
| **对手建模** | 训练师跨回合追踪玩家行为，预测下回合出招 |

### 6 只首发宝可梦

| 宝可梦 | 属性 | 性格 | 风格 |
|--------|------|------|------|
| 小火龙 | 火 | 勇敢 | 进攻型，无视克制 |
| 杰尼龟 | 水 | 沉稳 | 防守反击 |
| 妙蛙种子 | 草/毒 | 聪明 | 战术状态流 |
| 皮卡丘 | 电 | 顽皮 | 高风险高回报 |
| 伊布 | 一般 | 胆小 | 极度保守 |
| 耿鬼 | 幽灵/毒 | 神秘 | 状态折磨流 |

每只宝可梦 4 个技能，共 24 个技能定义。战斗机制包含属性克制 (18 属性)、STAB、暴击、命中率、优先级、烧伤/麻痹/睡眠 3 种状态效果。

## 快速开始

```bash
# 1. 克隆
git clone https://github.com/houlemon0130/pokemon-arena.git
cd pokemon-arena

# 2. 配置百炼 API Key
echo 'BAILIAN_API_KEY=你的密钥' > backend/.env

# 3. 启动
docker-compose up
```

浏览器打开 `http://localhost:3000`，选 3 只宝可梦 → 开始对战。

## 本地开发

```bash
# 后端
cd backend && pip install -r requirements.txt
BAILIAN_API_KEY=xxx python -m uvicorn app.main:app --reload

# 前端
cd frontend && npm install && npm run dev

# 运行测试
cd backend && pytest tests/ -v
cd frontend && npx tsc --noEmit && npm run build
```

## 项目结构

```
pokemon-arena/
├── backend/
│   ├── app/
│   │   ├── api/          # REST 接口
│   │   ├── ws/           # WebSocket 端点
│   │   ├── engine/       # 战斗引擎 (伤害/克制/状态)
│   │   ├── behavior/     # 5 大行为系统
│   │   ├── tools/        # 5 个确定性 Tool
│   │   ├── agents/       # Agent prompt + reflection
│   │   ├── pipeline/     # 回合编排 + LLM streaming
│   │   └── data/         # JSON 游戏数据
│   └── tests/            # pytest (85 tests)
├── frontend/
│   ├── src/app/          # 页面路由
│   ├── components/       # React 组件
│   ├── game/             # Phaser 游戏层
│   ├── hooks/            # WebSocket hook
│   ├── store/            # Zustand 全局状态
│   └── lib/              # API client + types
└── docs/superpowers/     # 设计文档
```

## 阶段规划

| Phase | 内容 | 状态 |
|-------|------|------|
| 1 | 战斗系统 (1v1 PvE + 多Agent + 可视化) | ✅ 完成 |
| 2 | 养成系统 (亲密度/成长/进化) | 规划中 |
| 3 | 故事系统 (劲敌/道馆/事件) | 规划中 |

## License

MIT
