"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  applyTurnResultToBattleState,
  deriveTurnAnimation,
  normalizeTurnAnimation,
} from "./battleAnimation";
import type {
  AgentDecision,
  BenchOpinion,
  BattleStateV2,
  BattleSocketMessage,
  ChatMessage,
  ReflectionResult,
  TurnResult,
  ToolCall,
} from "@/lib/types";
import { useBattleStore } from "@/store/battleStore";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function useBattleSocket(battleId: string | null | undefined) {
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!battleId) {
      return;
    }

    let shouldReconnect = true;

    const connect = () => {
      const socket = new WebSocket(`${WS_URL}/ws/battles/${battleId}`);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "start_battle" }));
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as BattleSocketMessage;
        const s = useBattleStore.getState();
        switch (message.type) {
          case "phase_change":
            s.addBattleLog(`Phase: ${(message.data as { phase?: string })?.phase ?? "unknown"}`);
            s.setAgentThinking(true);
            // Clear previous agent streams when entering a new phase
            s.clearAgentStreams();
            break;
          case "agent_stream":
            {
              const data = message.data as { agent_id: string; chunk: string; replace?: boolean };
              s.appendAgentStream(data.agent_id, data.chunk, data.replace ?? false);
            }
            break;
          case "agent_decision":
            {
              const decision = message.data as AgentDecision;
              if (decision.agent_type === "trainer" || decision.agent_type === "pokemon") {
                s.addAgentDecision(decision);
              }
            }
            break;
          case "tool_call":
            s.addToolCall(message.data as ToolCall);
            break;
          case "reflection_result":
            s.addReflection(message.data as ReflectionResult);
            break;
          case "chat_message":
            s.addChatMessage(message.data as ChatMessage);
            break;
          case "bench_opinion":
            s.addChatMessage(benchOpinionToChatMessage(message.data as BenchOpinion));
            break;
          case "battle_started":
            s.setBattleState(message.data as BattleStateV2);
            s.addBattleLog("对战开始");
            break;
          case "turn_animation":
            s.setTurnAnimation(normalizeTurnAnimation(message.data, useBattleStore.getState().battleState));
            break;
          case "turn_result":
            s.setAgentThinking(false);
            {
              const result = message.data as TurnResult | undefined;
              if (result) {
                const currentState = useBattleStore.getState().battleState;
                s.setTurnAnimation(deriveTurnAnimation(currentState, result));
                s.setBattleState(applyTurnResultToBattleState(currentState, result));
                result.events.forEach((event) => s.addBattleLog(event));
              }
            }
            break;
          case "battle_ended":
            {
              const endedState = message.data as BattleStateV2 | undefined;
              if (endedState) {
                s.setBattleState(endedState);
              }
              s.addBattleLog(`Winner: ${endedState?.winner ?? "unknown"}`);
            }
            break;
          case "error":
            s.addBattleLog(message.message ?? "WebSocket error");
            break;
          default:
            break;
        }
      };

      socket.onclose = () => {
        if (shouldReconnect) {
          reconnectTimer.current = setTimeout(connect, 1000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      socketRef.current?.close();
    };
  }, [battleId]);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { sendMessage, socketRef };
}

export function benchOpinionToChatMessage(opinion: BenchOpinion): ChatMessage {
  return {
    turn: opinion.turn,
    from_agent: `bench:${opinion.pokemon_id}`,
    channel: "bench",
    content: opinion.message,
    emotion: `battle_lust:${opinion.battle_lust.toFixed(2)}`,
  };
}
