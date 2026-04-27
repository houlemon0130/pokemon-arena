# AI Pokemon Battle Arena — Design Spec

**Date**: 2026-04-27
**Author**: Jay
**Status**: Draft

## Purpose

A browser-based Pokemon battle simulator where the player fights against an AI Agent-controlled opponent. This is a portfolio project to demonstrate full-stack Agent engineering capabilities for job hunting (target: 2027 Q2).

Each AI Pokemon is an independent LLM Agent with personality-driven autonomous decision making. The opponent's thought process is fully visible in real-time — the core demo value is watching an Agent reason about battle strategy.

## Scope: Sub-Project 1 — Battle System

This spec covers ONLY the battle subsystem. Nurturing (personality growth/evolution) and story (rival/gym/events) are future sub-projects that build on this battle engine.

### In Scope
- Pokemon select screen (6 starters)
- 1v1 turn-based PvE battle (player vs AI Agent)
- Standard battle mechanics: type chart, STAB, critical hits, accuracy, priority, speed comparison
- 3 status effects: burn, paralysis, sleep
- Real-time Agent thinking panel (fully transparent, visible entire battle)
- Pixel-art battle scene with move animations and particle effects
- Post-battle summary with turn-by-turn decision replay

### Out of Scope
- Stat stage modifiers (attack up/down, etc.)
- Items, weather, terrain, abilities
- Multi-Pokemon teams / switching
- Nurturing system (Phase 2)
- Story system (Phase 3)
- Mobile responsive (desktop-only for demo)

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Interaction | PvE: Player manual, AI Agent | Showcases Human-AI collaboration; player experiences Agent behavior directly |
| Visual style | Pixel art | Classic Pokemon aesthetic; sprite assets widely available |
| Layout | Card-style, AI panel right-side always visible | Agent thinking is the star of the demo |
| Agent transparency | Fully transparent, real-time confidence scores | Maximum portfolio showcase value |
| Game renderer | Phaser.js | Battle scene is a game, not a dashboard; built-in sprite/particle/scene management |
| LLM | 百炼 DeepSeek v4 pro | Jay's primary stack; cost-effective for portfolio |
| Deployment | Frontend (Vercel) + Backend (Railway), separate | Industry-standard pattern; no secrets on client |
| Battle depth | Standard (type + STAB + crit + accuracy + priority + 3 status) | Feels like real Pokemon without Showdown-level complexity |
| Roster size | 6 starters | Enough personality variety; manageable sprite asset workload |

## 6 Starter Pokemon

| # | Pokemon | Types | Personality | Aggression | Risk Tolerance | Playstyle |
|---|---------|-------|-------------|------------|----------------|-----------|
| 1 | Charmander | Fire | Brave | 0.8 | 0.7 | Aggressive, attacks even at type disadvantage |
| 2 | Squirtle | Water | Calm | 0.4 | 0.3 | Defensive, buffs before attacking |
| 3 | Bulbasaur | Grass/Poison | Clever | 0.5 | 0.5 | Tactical, status-first (Sleep Powder + Leech Seed) |
| 4 | Pikachu | Electric | Playful | 0.7 | 0.8 | Unpredictable, favors high-risk moves |
| 5 | Eevee | Normal | Timid | 0.3 | 0.2 | Extremely conservative, debuffs first |
| 6 | Gengar | Ghost/Poison | Mysterious | 0.8 | 0.9 | Status torment (Hypnosis + Confuse Ray → Shadow Ball) |

Each Pokemon has exactly 4 moves (~24 total move definitions).

## Architecture

### Frontend (Next.js 14 + Phaser.js, deployed on Vercel)

```
frontend/src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Pokemon select screen
│   └── battle/[id]/page.tsx    # Battle screen (dynamic route)
├── components/
│   ├── battle/
│   │   ├── BattleCanvas.tsx       # Phaser canvas mount point
│   │   ├── AgentMindPanel.tsx     # AI thinking panel (right side, always visible)
│   │   ├── MoveSelector.tsx       # 4 move buttons (bottom)
│   │   ├── PlayerPokemonCard.tsx  # HP/stats display (top of player area)
│   │   ├── OpponentPokemonCard.tsx# HP/stats display (above agent panel)
│   │   ├── BattleLog.tsx          # Scrolling turn event log
│   │   ├── TurnBanner.tsx         # "Turn X" overlay
│   │   └── BattleEndOverlay.tsx   # Winner/summary/replay UI
│   └── select/
│       ├── PokemonGrid.tsx        # 6-card grid
│       └── PokemonCard.tsx        # Individual selectable card
├── game/
│   ├── config.ts               # Phaser game config
│   ├── scenes/
│   │   └── BattleScene.ts      # Main battle scene (the game loop)
│   ├── objects/
│   │   ├── PokemonSprite.ts    # Pokemon sprite with animations
│   │   ├── HPBar.ts            # Animated HP bar (Phaser Graphics)
│   │   └── BattleBackground.ts # Static/dynamic background
│   └── effects/
│       ├── FireEffect.ts       # Ember/Flamethrower particles
│       ├── WaterEffect.ts      # Water Gun/Hydro Pump
│       ├── LeafEffect.ts       # Vine Whip/Razor Leaf
│       ├── ElectricEffect.ts   # Thunderbolt spark
│       ├── GhostEffect.ts      # Shadow Ball dark orb
│       └── NormalEffect.ts     # Tackle/Quick Attack dash
├── hooks/
│   └── useBattleSocket.ts      # WebSocket connection + reconnect
├── store/
│   └── battleStore.ts          # Zustand store (bridge Phaser ↔ React)
├── lib/
│   ├── api.ts                  # REST fetch wrappers
│   └── types.ts                # Shared TypeScript types
└── public/
    └── sprites/                # Pokemon pixel-art PNGs (6 front, 6 back)
```

### Backend (Python FastAPI, deployed on Railway)

```
backend/
├── app/
│   ├── main.py                 # FastAPI app with CORS + lifespan
│   ├── api/
│   │   ├── router.py           # Include all sub-routers
│   │   ├── pokemon.py          # GET /api/pokemon
│   │   └── battles.py          # POST /api/battles
│   ├── ws/
│   │   └── battle_ws.py        # WebSocket endpoint + state machine
│   ├── engine/
│   │   ├── battle.py           # Turn orchestration (speed → hit → damage → effects → faint)
│   │   ├── damage.py           # Damage formula (Gen 1 simplified)
│   │   ├── type_chart.py       # 18-type effectiveness matrix + dual-type resolver
│   │   └── effects.py          # Burn/Para/Sleep tick resolution
│   ├── agents/
│   │   ├── runner.py           # Orchestrates LLM call + parses decision
│   │   ├── prompt_builder.py   # Builds system + turn messages from state
│   │   └── personality.py      # Personality registry (loads JSON presets)
│   ├── models/
│   │   ├── pokemon.py          # Pydantic: PokemonDef, MoveDef, Stats
│   │   ├── battle.py           # Pydantic: BattleState, BattlePokemon, TurnResult
│   │   └── agent.py            # Pydantic: AgentDecision, MoveScore
│   └── data/
│       ├── pokemon.json        # 6 Pokemon definitions
│       ├── moves.json          # ~24 move definitions
│       └── personalities.json  # 6 personality presets
├── requirements.txt
└── Dockerfile
```

## Data Models

### Pokemon Definition
```python
class Stats(BaseModel):
    hp: int; attack: int; defense: int
    sp_attack: int; sp_defense: int; speed: int

class MoveDef(BaseModel):
    id: str             # "ember"
    name: str           # "Ember"
    type: str           # "fire"
    category: str       # "physical" | "special" | "status"
    power: int | None
    accuracy: int       # 0-100
    pp: int
    priority: int       # 0 default
    effect: str | None  # "burn:10" = 10% burn chance

class Personality(BaseModel):
    id: str             # "brave"
    name: str           # "勇敢"
    aggression: float   # 0.0-1.0
    risk_tolerance: float
    prompt_modifier: str
    narrative_voice: str

class PokemonDef(BaseModel):
    id: str; name: str; types: list[str]
    stats: Stats; moves: list[str]; personality: str
```

### Battle State
```python
class BattlePokemon(BaseModel):
    """Runtime instance of a Pokemon in battle."""
    def_id: str; name: str; types: list[str]
    stats: Stats; moves: list[MoveDef]; personality: Personality
    current_hp: int; max_hp: int
    status: str | None          # "burn" | "paralysis" | "sleep"
    status_turns: int           # remaining sleep turns

class AgentDecision(BaseModel):
    pokemon_name: str
    chosen_move_index: int
    chosen_move_name: str
    confidence: float           # 0.0-1.0
    reasoning: str              # 2-3 sentences in character
    move_scores: list[MoveScore]

class MoveScore(BaseModel):
    move_index: int; move_name: str
    score: float; reason: str   # one sentence

class TurnResult(BaseModel):
    turn: int
    player_move: str; agent_move: str
    player_damage: int; agent_damage: int
    events: list[str]           # log messages
    hp_after: dict[str, int]

class BattleState(BaseModel):
    battle_id: str
    player: BattlePokemon; agent: BattlePokemon
    current_turn: int
    phase: str                  # "select" | "thinking" | "resolving" | "finished" | "cancelled"
    winner: str | None
    history: list[TurnResult]
```

## API Design

### REST
```
GET  /api/pokemon          → list[PokemonDef] (6 items, light)
GET  /api/pokemon/:id      → PokemonDef (full, with move objects)
POST /api/battles           → {battle_id, ws_url}
     body: {player_pokemon_id: "charmander", agent_pokemon_id: "squirtle"}
```

### WebSocket (`ws://host/ws/battle/{battle_id}`)

**Client → Server:**
```json
{"type": "start_battle"}                  // begin
{"type": "player_move", "move_index": 0}  // player selects move
{"type": "rematch"}                       // start new battle with same Pokemon
{"type": "leave"}                         // disconnect
```

**Server → Client:**
```json
{"type": "battle_init", "data": {BattleState}}
{"type": "agent_thinking"}                          // show spinner in AI panel
{"type": "agent_decision", "data": {AgentDecision}}  // reveal thought process
{"type": "turn_animation", "data": {actions, timing}} // play animations
{"type": "turn_resolved", "data": {TurnResult}}       // update HP + log
{"type": "battle_ended", "data": {winner, history, decisions[]}}
{"type": "error", "data": {message, code}}
```

Due to PvE mode (player acts first, then agent responds), only ONE agent call per turn.

## Battle Mechanics

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
1. Compare speeds (paralysis halves speed)
2. Handle player move first (always first in PvE)
3. Check paralysis skip chance (25%)
4. Check sleep (skip action, 33% wake each turn)
5. Accuracy check → critical hit check → damage calculation
6. Apply status effects if triggered (e.g. 10% burn from Ember)
7. Repeat steps 3-6 for agent Pokemon
8. End-of-turn burn damage (1/8 max HP)
9. Check faint (HP ≤ 0 → battle ends)

### Type Effectiveness
Standard 18-type chart stored as 2D dict. Dual-type defense multipliers are multiplicative.
Key: Fire > Grass, Grass > Water, Water > Fire, Electric > Water, Ghost ↔ Normal immune.

## Agent Decision Flow

```
1. Build context:
   - Player Pokemon: visible HP%, type, status, personality
   - Agent Pokemon: own HP%, PP remaining, status
   - Turn number + last 3 turns history
   
2. Build prompt:
   - System: personality description + battle rules + response format
   - User: current turn state + move options with type matchups
   
3. Call 百炼 DeepSeek v4 pro:
   - Temperature: 0.7
   - Structured output via JSON mode
   - y response 500 tokens
   
4. Parse → AgentDecision:
   - Validate move_index in 0-3
   - Validate move has PP
   - Fallback: random valid move if parse fails
```

### Prompt Structure
```
SYSTEM:
You are {name}, a {type} Pokemon with {personality} personality.
{narrative_voice}
{personality_modifier}
Battle rules: type matchups, STAB, priority, status effects.
Always respond in Chinese with valid JSON.

USER (per turn):
Turn {n}. Your HP: {x}/{max}. Opponent ({name}, {type}): ~{hp%}%.
Your moves:
  [0] {name} ({type}, Power:{pwr}, Acc:{acc}%) — {effectiveness} vs opponent
  [1] ...
Type matchups: Fire hits 2x on Grass, 0.5x on Water...
Recent history: {last 3 turns}

Choose ONE move. Output JSON with chosen_move_index, confidence, reasoning, and move_scores for all 4.
```

## Frontend: Scene Layout (Battle)

```
┌─────────────────────────────────────────────────────────────┐
│  Turn 3                                              ? Help  │
├──────────┬──────────────────────────────┬───────────────────┤
│          │                              │                   │
│  🦎      │                              │    🐢             │
│ Charmander│     POKEMON BATTLE          │  Squirtle (AI)    │
│ Lv.50    │                              │  Lv.50            │
│ ████░░   │    [battle background]       │  ██████           │
│ 72/120   │    [animation area]          │  105/120          │
│          │    [particle effects]        │  🔥 BURN          │
│          │                              │                   │
├──────────┤                              ├───────────────────┤
│          │                              │ SQUIRTLE THINKING │
│ 🔥 Ember │                              │ ─────────────────│
│          │                              │ 💧 Water Gun  94% │
│ ✂ Scratch│                              │ ⭐ Tackle     62% │
│          │                              │ 🌀 Tail Whip  40% │
│ 😱 Growl │                              │ 🛡 Withdraw   78% │
│          │                              │                   │
│ 💨 Smoke │                              │ "水克火，Water    │
│          │                              │  Gun直接带走。但   │
│          │                              │ 对方烧伤了自己，  │
│          │                              │ 稳一点..."        │
├──────────┴──────────────────────────────┴───────────────────┤
│ ⚔ Squirtle used Water Gun! Critical hit! 90 damage! It's    │
│   super effective!                                         │
│ ⚔ Charmander used Ember! 38 damage.                        │
│ [scrollable battle log]                                     │
└─────────────────────────────────────────────────────────────┘
```

Key interaction: Player clicks move → button flashes → "agent_thinking" spinner in right panel → move scores animate in one by one (0.3s stagger) → chosen move glows → reasoning text typewriters in → animations play on canvas → HP bars drain → log updates.

## Deployment

- Frontend: Vercel (Next.js static export of React shell; Phaser canvas loaded client-side)
- Backend: Railway (Docker container, FastAPI + uvicorn)
- Environment: `BAILIAN_API_KEY` set in Railway env vars (never exposed to client)
- Local dev: Docker Compose (frontend + backend containers)

## Constraints

- Desktop only (1920x1080 or larger recommended for demo)
- Requires active 百炼 API key
- Battle latency target: < 2s per turn (LLM response is dominant factor)
- No persistence in Phase 1 (battles are ephemeral)
- Sprite assets: use open-source/fan-made pixel art (credit in README)

## Verification

1. Unit tests: `pytest` for damage formula, type chart, status effects, prompt builder
2. Agent quality: 10 simulated battles vs random-move baseline, verify agent wins > 70%
3. Manual E2E: open browser → select Pokemon → complete battle → view replay
4. Performance: single turn completes in < 3s (including LLM latency)
5. Demo video: record full battle as portfolio asset
