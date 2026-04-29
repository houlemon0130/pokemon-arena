import { createBattle, fetchPokemonDetail, fetchPokemonList } from "@/lib/api";
import type {
  AgentDecision,
  BattleStateV2,
  ChatMessage,
  PokemonDef,
  ReflectionResult,
  ToolCall,
} from "@/lib/types";
import { useBattleSocket } from "@/hooks/useBattleSocket";
import { useBattleStore } from "@/store/battleStore";

export async function task15Contract() {
  const pokemon: PokemonDef[] = await fetchPokemonList();
  const detail: PokemonDef = await fetchPokemonDetail(pokemon[0].id);
  const battle = await createBattle(detail.id, ["squirtle", "bulbasaur"], ["gengar", "pikachu", "eevee"]);

  const state = useBattleStore.getState();
  state.setBattleState({ battle_id: battle.battle_id, current_turn: 1 } as BattleStateV2);
  state.addAgentDecision({
    agent_type: "trainer",
    reasoning: "保持压制。",
    suggested_move: "火花",
    strategy: "aggressive",
  } satisfies AgentDecision);
  state.addAgentDecision({
    agent_type: "pokemon",
    pokemon_name: detail.name,
    chosen_move_name: "火花",
    confidence: 0.85,
    reasoning: "听从训练师并进攻。",
    obedience_status: "obeyed",
  } satisfies AgentDecision);
  state.addToolCall({ tool_name: "check_type_effectiveness" } as ToolCall);
  state.addReflection({ agent_id: detail.id } as ReflectionResult);
  state.addChatMessage({ content: "go" } as ChatMessage);
  state.setSelectedMove(0);
}

export function Task15HookContract({ battleId }: { battleId: string }) {
  useBattleSocket(battleId);
  return null;
}
