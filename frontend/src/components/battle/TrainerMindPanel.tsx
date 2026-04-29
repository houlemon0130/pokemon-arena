"use client";

import { motion } from "framer-motion";

import type { TrainerAgentDecision } from "@/lib/types";
import { useBattleStore } from "@/store/battleStore";

import { ToolCallCard } from "./ToolCallCard";

export function TrainerMindPanel() {
  const latest = useBattleStore((state) =>
    state.agentDecisions.findLast(
      (decision): decision is TrainerAgentDecision => decision.agent_type === "trainer",
    ),
  );
  // Feature 3: 流式文本
  const streamText = useBattleStore((state) => state.agentStreams["trainer"] ?? "");
  // Issue 4 修复: ToolCallCard 属于训练师面板，不放在上场宝可梦面板
  const tools = useBattleStore((state) => state.toolCalls.slice(-4));
  const displayText = streamText || latest?.reasoning || "等待训练师决策...";

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">训练师策略</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        {displayText}
        {streamText && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-400 align-middle" />}
      </p>
      {tools.length > 0 && (
        <div className="mt-3 space-y-2">
          {tools.map((tool, index) => (
            <ToolCallCard key={`${tool.tool_name}-${index}`} toolName={tool.tool_name} output={tool.output_result ?? {}} />
          ))}
        </div>
      )}
    </motion.section>
  );
}
