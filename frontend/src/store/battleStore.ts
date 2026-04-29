import { create } from "zustand";

import type {
  AgentDecision,
  BattleStateV2,
  ChatMessage,
  ReflectionResult,
  ToolCall,
  TurnAnimation,
} from "@/lib/types";

type BattleStore = {
  battleState: BattleStateV2 | null;
  turnAnimation: TurnAnimation | null;
  agentDecisions: AgentDecision[];
  toolCalls: ToolCall[];
  reflections: ReflectionResult[];
  chatMessages: ChatMessage[];
  battleLog: string[];
  isAgentThinking: boolean;
  selectedMove: number | null;
  // Feature 3: 流式 Agent 思考状态
  agentStreams: Record<string, string>;
  setBattleState: (battleState: BattleStateV2 | null) => void;
  setTurnAnimation: (turnAnimation: TurnAnimation | null) => void;
  addAgentDecision: (decision: AgentDecision) => void;
  addToolCall: (toolCall: ToolCall) => void;
  addReflection: (reflection: ReflectionResult) => void;
  addChatMessage: (message: ChatMessage) => void;
  addBattleLog: (message: string) => void;
  setAgentThinking: (isThinking: boolean) => void;
  setSelectedMove: (moveIndex: number | null) => void;
  // Issue 1: replace 参数防止流式 fallback 文本重复
  appendAgentStream: (agentId: string, chunk: string, replace?: boolean) => void;
  clearAgentStreams: () => void;
  resetBattle: () => void;
};

export const useBattleStore = create<BattleStore>((set) => ({
  battleState: null,
  turnAnimation: null,
  agentDecisions: [],
  toolCalls: [],
  reflections: [],
  chatMessages: [],
  battleLog: [],
  isAgentThinking: false,
  selectedMove: null,
  agentStreams: {},
  setBattleState: (battleState) => set({ battleState }),
  setTurnAnimation: (turnAnimation) => set({ turnAnimation }),
  addAgentDecision: (decision) =>
    set((state) => ({ agentDecisions: [...state.agentDecisions, decision] })),
  addToolCall: (toolCall) => set((state) => ({ toolCalls: [...state.toolCalls, toolCall] })),
  addReflection: (reflection) =>
    set((state) => ({ reflections: [...state.reflections, reflection] })),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  addBattleLog: (message) => set((state) => ({ battleLog: [...state.battleLog, message] })),
  setAgentThinking: (isAgentThinking) => set({ isAgentThinking }),
  setSelectedMove: (selectedMove) => set({ selectedMove }),
  // Issue 1 修复: replace=true 直接替换，replace=false(默认)追加
  appendAgentStream: (agentId, chunk, replace = false) =>
    set((state) => ({
      agentStreams: {
        ...state.agentStreams,
        [agentId]: replace ? chunk : (state.agentStreams[agentId] ?? "") + chunk,
      },
    })),
  clearAgentStreams: () => set({ agentStreams: {} }),
  resetBattle: () =>
    set({
      battleState: null,
      turnAnimation: null,
      agentDecisions: [],
      toolCalls: [],
      reflections: [],
      chatMessages: [],
      battleLog: [],
      isAgentThinking: false,
      selectedMove: null,
      agentStreams: {},
    }),
}));
