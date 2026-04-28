"use client";

import { useBattleStore } from "@/store/battleStore";

export function BenchPanel() {
  const benchMessages = useBattleStore((state) => state.chatMessages.filter((message) => message.channel === "bench" || message.from_agent?.startsWith("bench")));
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">Bench</h2>
      <div className="mt-3 space-y-2 text-sm text-zinc-300">
        {benchMessages.length ? benchMessages.map((message, index) => <p key={`${message.content}-${index}`}>{message.content}</p>) : <p className="text-zinc-500">Bench agents are watching.</p>}
      </div>
    </section>
  );
}
