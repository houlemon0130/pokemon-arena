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
  setBattleState: (battleState: BattleStateV2 | null) => void;
  setTurnAnimation: (turnAnimation: TurnAnimation | null) => void;
  addAgentDecision: (decision: AgentDecision) => void;
  addToolCall: (toolCall: ToolCall) => void;
  addReflection: (reflection: ReflectionResult) => void;
  addChatMessage: (message: ChatMessage) => void;
  addBattleLog: (message: string) => void;
  setAgentThinking: (isThinking: boolean) => void;
  setSelectedMove: (moveIndex: number | null) => void;
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
    }),
}));
