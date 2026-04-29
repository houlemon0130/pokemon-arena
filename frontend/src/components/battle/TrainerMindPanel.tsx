"use client";

import { motion } from "framer-motion";

import type { TrainerAgentDecision } from "@/lib/types";
import { useBattleStore } from "@/store/battleStore";

export function TrainerMindPanel() {
  const latest = useBattleStore((state) =>
    state.agentDecisions.findLast(
      (decision): decision is TrainerAgentDecision => decision.agent_type === "trainer",
    ),
  );
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">训练师策略</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{latest?.reasoning ?? "等待训练师决策..."}</p>
    </motion.section>
  );
}
