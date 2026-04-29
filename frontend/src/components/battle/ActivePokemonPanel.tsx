"use client";

import type { AgentDecision, ToolCall } from "@/lib/types";

const obedienceStatusMap: Record<string, string> = {
  obeyed: "服从",
  modified: "调整",
  defied: "违抗",
};

type ActivePokemonPanelProps = {
  latest: AgentDecision | null;
  streamText: string;
};

export function ActivePokemonPanel({ latest, streamText }: ActivePokemonPanelProps) {
  const displayText = streamText || (latest && 'reasoning' in latest ? latest.reasoning : undefined) || "等待宝可梦决策...";
  const pokemonDecision = latest?.agent_type === "pokemon" ? latest : null;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">上场宝可梦</h2>
      {pokemonDecision && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
          {pokemonDecision.chosen_move_name && (
            <span className="rounded bg-zinc-800 px-2 py-0.5">招式: {pokemonDecision.chosen_move_name}</span>
          )}
          {pokemonDecision.confidence != null && (
            <span className="rounded bg-zinc-800 px-2 py-0.5">信心: {(pokemonDecision.confidence * 100).toFixed(0)}%</span>
          )}
          {pokemonDecision.obedience_status && (
            <span className="rounded bg-zinc-800 px-2 py-0.5">服从: {obedienceStatusMap[pokemonDecision.obedience_status] ?? pokemonDecision.obedience_status}</span>
          )}
        </div>
      )}
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        {displayText}
        {streamText ? <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-400 align-middle" /> : null}
      </p>
    </section>
  );
}
