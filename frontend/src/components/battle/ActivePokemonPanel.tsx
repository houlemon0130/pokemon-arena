"use client";

import { useBattleStore } from "@/store/battleStore";
import type { PokemonAgentDecision } from "@/lib/types";

import { ToolCallCard } from "./ToolCallCard";

export function ActivePokemonPanel() {
  const latest = useBattleStore((state) =>
    state.agentDecisions.findLast(
      (decision): decision is PokemonAgentDecision => decision.agent_type === "pokemon",
    ),
  );
  const tools = useBattleStore((state) => state.toolCalls.slice(-2));
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">上场宝可梦</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{latest?.chosen_move_name ?? "等待宝可梦决策..."}</p>
      <div className="mt-3 space-y-2">
        {tools.map((tool, index) => (
          <ToolCallCard key={`${tool.tool_name}-${index}`} toolName={tool.tool_name} output={tool.output_result ?? {}} />
        ))}
      </div>
    </section>
  );
}
