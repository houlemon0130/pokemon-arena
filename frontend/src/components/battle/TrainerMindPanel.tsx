"use client";

import type { AgentDecision, ToolCall } from "@/lib/types";
import { ToolCallCard } from "./ToolCallCard";

type TrainerMindPanelProps = {
  latest: AgentDecision | null;
  streamText: string;
  tools: ToolCall[];
};

export function TrainerMindPanel({ latest, streamText, tools }: TrainerMindPanelProps) {
  const displayText = streamText || (latest && 'reasoning' in latest ? latest.reasoning : undefined) || "等待训练师决策...";

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">训练师策略</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        {displayText}
        {streamText ? <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-400 align-middle" /> : null}
      </p>
      {tools.length > 0 && (
        <div className="mt-3 space-y-2">
          {tools.map((tool, index) => (
            <ToolCallCard key={`${tool.tool_name}-${index}`} toolName={tool.tool_name} output={tool.output_result ?? {}} />
          ))}
        </div>
      )}
    </section>
  );
}
