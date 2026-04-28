"use client";

import { useEffect, useRef } from "react";

import type {
  AgentDecision,
  BattleSocketMessage,
  ChatMessage,
  ReflectionResult,
  ToolCall,
} from "@/lib/types";
import { useBattleStore } from "@/store/battleStore";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function useBattleSocket(battleId: string | null | undefined) {
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const {
    addAgentDecision,
    addToolCall,
    addReflection,
    addChatMessage,
    addBattleLog,
    setAgentThinking,
  } = useBattleStore();

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
        switch (message.type) {
          case "phase_change":
            addBattleLog(`Phase: ${(message.data as { phase?: string })?.phase ?? "unknown"}`);
            setAgentThinking(true);
            break;
          case "agent_decision":
            addAgentDecision(message.data as AgentDecision);
            setAgentThinking(false);
            break;
          case "tool_call":
            addToolCall(message.data as ToolCall);
            break;
          case "reflection_result":
            addReflection(message.data as ReflectionResult);
            break;
          case "chat_message":
          case "bench_opinion":
            addChatMessage(message.data as ChatMessage);
            break;
          case "battle_started":
            addBattleLog("Battle started");
            break;
          case "error":
            addBattleLog(message.message ?? "WebSocket error");
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
  }, [
    battleId,
    addAgentDecision,
    addToolCall,
    addReflection,
    addChatMessage,
    addBattleLog,
    setAgentThinking,
  ]);

  return socketRef;
}
