"use client";

import { useBattleStore } from "@/store/battleStore";
import type { PokemonAgentDecision } from "@/lib/types";

const obedienceStatusMap: Record<string, string> = {
  obeyed: "服从",
  modified: "调整",
  defied: "违抗",
};

export function ActivePokemonPanel() {
  const latest = useBattleStore((state) =>
    state.agentDecisions.findLast(
      (decision): decision is PokemonAgentDecision => decision.agent_type === "pokemon",
    ),
  );
  // Feature 3: 流式文本
  const streamText = useBattleStore((state) => state.agentStreams["pokemon"] ?? "");
  const displayText = streamText || latest?.reasoning || "等待宝可梦决策...";

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">上场宝可梦</h2>
      {latest && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
          {latest.chosen_move_name && (
            <span className="rounded bg-zinc-800 px-2 py-0.5">
              招式: {latest.chosen_move_name}
            </span>
          )}
          {latest.confidence != null && (
            <span className="rounded bg-zinc-800 px-2 py-0.5">
              信心: {(latest.confidence * 100).toFixed(0)}%
            </span>
          )}
          {latest.obedience_status && (
            <span className="rounded bg-zinc-800 px-2 py-0.5">
              服从: {obedienceStatusMap[latest.obedience_status] ?? latest.obedience_status}
            </span>
          )}
        </div>
      )}
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        {displayText}
        {streamText && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-400 align-middle" />}
      </p>
      {/* Issue 4 修复: ToolCallCard 已移至 TrainerMindPanel */}
    </section>
  );
}
