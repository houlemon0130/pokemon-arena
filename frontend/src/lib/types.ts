export type Stats = {
  hp: number;
  attack: number;
  defense: number;
  sp_attack: number;
  sp_defense: number;
  speed: number;
};

export type MoveDef = {
  id: string;
  name: string;
  type: string;
  category: "physical" | "special" | "status" | string;
  power?: number | null;
  accuracy: number;
  pp: number;
  priority?: number;
  effect?: string | null;
};

export type Personality = {
  id: string;
  name: string;
  aggression: number;
  risk_tolerance: number;
  obedience_mult: number;
  fear_mult: number;
  battle_lust_base: number;
  prompt_modifier: string;
  narrative_voice: string;
};

export type PokemonDef = {
  id: string;
  name: string;
  types: string[];
  stats: Stats;
  moves: string[];
  personality: string;
};

export type BattlePokemon = {
  def_id: string;
  name: string;
  types: string[];
  stats: Stats;
  moves: MoveDef[];
  personality?: Personality | null;
  current_hp: number;
  max_hp: number;
  status?: string | null;
  status_turns?: number;
};

export type BattleTeam = {
  active: BattlePokemon;
  bench: BattlePokemon[];
};

export type TurnResult = {
  turn: number;
  player_move: string;
  agent_move: string;
  player_damage: number;
  agent_damage: number;
  events: string[];
  hp_after: Record<string, number>;
};

export type BattleStateV2 = {
  battle_id: string;
  player_active_id?: string;
  player_bench_ids?: string[];
  opponent_team_ids?: string[];
  player_team?: BattleTeam;
  opponent_team?: BattleTeam;
  player_team_id?: string;
  opponent_team_id?: string;
  current_turn: number;
  phase?: string;
  winner?: string | null;
  history?: TurnResult[];
  chat_history?: ChatMessage[];
  tool_call_history?: ToolCall[];
  reflection_history?: ReflectionResult[];
};

export type MoveScore = {
  move_index: number;
  move_name: string;
  score: number;
  reason: string;
};

export type AgentDecision = {
  pokemon_name: string;
  chosen_move_index?: number;
  chosen_move_name?: string;
  confidence?: number;
  reasoning?: string;
  move_scores?: MoveScore[];
  obedience_status?: "obeyed" | "modified" | "defied" | string;
};

export type AgentInternalState = {
  pokemon_id: string;
  fear: number;
  battle_lust: number;
  obedience_last_turn?: string | null;
  obedience_streak?: number;
  last_emotion?: string;
};

export type BenchOpinion = {
  pokemon_id: string;
  message: string;
  battle_lust: number;
  turn?: number;
};

export type ReflectionResult = {
  agent_id: string;
  turn?: number;
  decision_was_correct?: boolean;
  alternative_would_be_better?: string | null;
  learned_insight?: string;
  confidence_adjustment?: number;
  narrative?: string;
};

export type ChatMessage = {
  turn?: number;
  from_agent?: string;
  to_agent?: string;
  channel?: string;
  content: string;
  emotion?: string;
};

export type ToolCall = {
  turn?: number;
  agent_id?: string;
  tool_name: string;
  input_params?: Record<string, unknown>;
  output_result?: Record<string, unknown>;
  agent_comment?: string;
};

export type CreateBattleResponse = {
  battle_id: string;
  ws_url: string;
};

export type BattleSocketMessage = {
  type: string;
  data?: unknown;
  battle_id?: string;
  message_type?: string;
  message?: string;
};
