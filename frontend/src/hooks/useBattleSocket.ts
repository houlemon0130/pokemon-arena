"use client";

import { useCallback, useEffect, useRef } from "react";

import type {
  AgentDecision,
  BattleAnimationAction,
  BenchOpinion,
  BattlePokemon,
  BattleStateV2,
  BattleTeam,
  BattleSocketMessage,
  ChatMessage,
  ReflectionResult,
  TurnAnimation,
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

function normalizeActor(value: unknown): BattleAnimationAction["actor"] | null {
  const normalized = typeof value === "string" ? value.toLowerCase() : value;
  if (normalized === "player") {
    return "player";
  }
  if (normalized === "opponent" || normalized === "agent" || normalized === "enemy") {
    return "opponent";
  }
  return null;
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function moveTypeForName(pokemon: BattlePokemon | undefined, moveName: string) {
  const normalized = moveName.trim().toLowerCase();
  return pokemon?.moves.find((move) => {
    return move.name.toLowerCase() === normalized || move.id.toLowerCase() === normalized;
  })?.type;
}

function deriveTurnAnimation(battleState: BattleStateV2 | null, result: TurnResult): TurnAnimation {
  const player = battleState?.player_team?.active;
  const opponent = battleState?.opponent_team?.active;

  return {
    id: `turn-result-${result.turn}-${Date.now()}`,
    actions: [
      {
        actor: "player",
        target: "opponent",
        move_name: result.player_move,
        move_type: moveTypeForName(player, result.player_move),
      },
      {
        actor: "opponent",
        target: "player",
        move_name: result.agent_move,
        move_type: moveTypeForName(opponent, result.agent_move),
      },
    ],
    timing: { delay_ms: 520 },
  };
}

function normalizeTurnAnimation(data: unknown): TurnAnimation | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const rawActions = Array.isArray(record.actions) ? record.actions : record.action ? [record.action] : [];
  const actions = rawActions.flatMap((rawAction): BattleAnimationAction[] => {
    if (!rawAction || typeof rawAction !== "object") {
      return [];
    }

    const action = rawAction as Record<string, unknown>;
    const actor = normalizeActor(action.actor ?? action.source ?? action.from);
    if (!actor) {
      return [];
    }

    return [
      {
        actor,
        target: normalizeActor(action.target ?? action.to) ?? (actor === "player" ? "opponent" : "player"),
        move_name: readString(action, ["move_name", "moveName", "move", "name"]),
        move_type: readString(action, ["move_type", "moveType", "type", "element"]),
      },
    ];
  });

  if (actions.length === 0) {
    return null;
  }

  const timing = record.timing && typeof record.timing === "object" ? (record.timing as Record<string, unknown>) : {};
  const delay = timing.delay_ms ?? timing.delayMs ?? timing.delayBetweenActions;

  return {
    id: readString(record, ["id"]) ?? `turn-animation-${Date.now()}`,
    actions,
    timing: typeof delay === "number" ? { delay_ms: delay } : undefined,
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
            s.addChatMessage(message.data as ChatMessage);
            break;
          case "bench_opinion":
            s.addChatMessage(benchOpinionToChatMessage(message.data as BenchOpinion));
            break;
          case "battle_started":
            s.setBattleState(message.data as BattleStateV2);
            s.addBattleLog("Battle started");
            break;
          case "turn_animation":
            s.setTurnAnimation(normalizeTurnAnimation(message.data));
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
