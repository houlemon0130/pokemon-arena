"use client";

import { useCallback, useEffect, useRef } from "react";

import type {
  AgentDecision,
  BattlePokemon,
  BattleStateV2,
  BattleTeam,
  BattleSocketMessage,
  ChatMessage,
  ReflectionResult,
  TurnResult,
  ToolCall,
} from "@/lib/types";
import { useBattleStore } from "@/store/battleStore";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

function applyHpToPokemon(pokemon: BattlePokemon, hpAfter: Record<string, number>) {
  const currentHp = hpAfter[pokemon.def_id];
  if (currentHp === undefined) {
    return pokemon;
  }
  return { ...pokemon, current_hp: currentHp };
}

function applyHpToTeam(team: BattleTeam | undefined, hpAfter: Record<string, number>) {
  if (!team) {
    return team;
  }
  return {
    ...team,
    active: applyHpToPokemon(team.active, hpAfter),
    bench: team.bench.map((pokemon) => applyHpToPokemon(pokemon, hpAfter)),
  };
}

export function applyTurnResultToBattleState(
  battleState: BattleStateV2 | null,
  result: TurnResult,
): BattleStateV2 | null {
  if (!battleState) {
    return battleState;
  }
  return {
    ...battleState,
    current_turn: result.turn,
    history: [...(battleState.history ?? []), result],
    player_team: applyHpToTeam(battleState.player_team, result.hp_after),
    opponent_team: applyHpToTeam(battleState.opponent_team, result.hp_after),
  };
}

export function useBattleSocket(battleId: string | null | undefined) {
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  // Get actions from the store directly — they are stable references
  const storeActions = useRef(useBattleStore.getState());
  useEffect(() => { storeActions.current = useBattleStore.getState(); });
  const getStore = () => storeActions.current;

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
        const s = getStore();
        const message = JSON.parse(event.data) as BattleSocketMessage;
        switch (message.type) {
          case "phase_change":
            s.addBattleLog(`Phase: ${(message.data as { phase?: string })?.phase ?? "unknown"}`);
            s.setAgentThinking(true);
            break;
          case "agent_decision":
            s.addAgentDecision(message.data as AgentDecision);
            s.setAgentThinking(false);
            break;
          case "tool_call":
            s.addToolCall(message.data as ToolCall);
            break;
          case "reflection_result":
            s.addReflection(message.data as ReflectionResult);
            break;
          case "chat_message":
          case "bench_opinion":
            s.addChatMessage(message.data as ChatMessage);
            break;
          case "battle_started":
            s.setBattleState(message.data as BattleStateV2);
            s.addBattleLog("Battle started");
            break;
          case "turn_result":
            s.setAgentThinking(false);
            {
              const result = message.data as TurnResult | undefined;
              if (result) {
                const currentState = useBattleStore.getState().battleState;
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
