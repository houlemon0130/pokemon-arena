"use client";

import { useCallback, useEffect, useRef } from "react";
import { unstable_batchedUpdates } from "react-dom";

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

const WS_URL = "ws://localhost:8000";

export function useBattleSocket(battleId: string | null | undefined) {
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!battleId) return;

    let shouldReconnect = true;

    const connect = () => {
      const socket = new WebSocket(`${WS_URL}/ws/battles/${battleId}`);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "start_battle" }));
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as BattleSocketMessage;
        unstable_batchedUpdates(() => {
        const store = useBattleStore.getState();

        switch (message.type) {
          case "phase_change": {
            const phase = (message.data as { phase?: string })?.phase ?? "unknown";
            useBattleStore.setState({
              battleLog: [...store.battleLog, `Phase: ${phase}`],
              isAgentThinking: true,
              agentStreams: {},
            });
            break;
          }
          case "agent_stream": {
            const data = message.data as { agent_id: string; chunk: string; replace?: boolean };
            const prev = store.agentStreams[data.agent_id] ?? "";
            useBattleStore.setState({
              agentStreams: {
                ...store.agentStreams,
                [data.agent_id]: data.replace ? data.chunk : prev + data.chunk,
              },
            });
            break;
          }
          case "agent_decision": {
            const decision = message.data as AgentDecision;
            const isAgent = decision.agent_type === "trainer" || decision.agent_type === "pokemon";
            useBattleStore.setState({
              agentDecisions: isAgent ? [...store.agentDecisions, decision] : store.agentDecisions,
              isAgentThinking: false,
            });
            break;
          }
          case "tool_call":
            useBattleStore.setState({
              toolCalls: [...store.toolCalls, message.data as ToolCall],
            });
            break;
          case "reflection_result":
            useBattleStore.setState({
              reflections: [...store.reflections, message.data as ReflectionResult],
            });
            break;
          case "chat_message":
            useBattleStore.setState({
              chatMessages: [...store.chatMessages, message.data as ChatMessage],
            });
            break;
          case "bench_opinion":
            useBattleStore.setState({
              chatMessages: [...store.chatMessages, benchOpinionToChatMessage(message.data as BenchOpinion)],
            });
            break;
          case "battle_started":
            useBattleStore.setState({
              battleState: message.data as BattleStateV2,
              battleLog: [...store.battleLog, "对战开始"],
            });
            break;
          case "turn_animation":
            useBattleStore.setState({
              turnAnimation: normalizeTurnAnimation(message.data, store.battleState),
            });
            break;
          case "turn_result": {
            const result = message.data as TurnResult | undefined;
            if (result) {
              const currentState = store.battleState;
              const newBattleState = applyTurnResultToBattleState(currentState, result);
              const newAnimation = deriveTurnAnimation(currentState, result);
              useBattleStore.setState({
                isAgentThinking: false,
                turnAnimation: newAnimation,
                battleState: newBattleState,
                battleLog: [...store.battleLog, ...result.events],
              });
            }
            break;
          }
          case "battle_ended": {
            const endedState = message.data as BattleStateV2 | undefined;
            useBattleStore.setState({
              battleState: endedState ?? store.battleState,
              battleLog: [...store.battleLog, `Winner: ${endedState?.winner ?? "unknown"}`],
            });
            break;
          }
          case "error":
            useBattleStore.setState({
              battleLog: [...store.battleLog, message.message ?? "WebSocket error"],
            });
            break;
          default:
            break;
        }
        }); // unstable_batchedUpdates
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
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
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
