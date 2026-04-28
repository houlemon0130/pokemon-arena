"use client";

import { useBattleStore } from "@/store/battleStore";

export function CrossTalkPanel() {
  const messages = useBattleStore((state) => state.chatMessages.filter((message) => message.channel === "cross_team"));
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">Cross Talk</h2>
      <div className="mt-3 space-y-2 text-sm text-zinc-300">
        {messages.length ? messages.map((message, index) => <p key={`${message.content}-${index}`}>{message.content}</p>) : <p className="text-zinc-500">No cross-team chatter.</p>}
      </div>
    </section>
  );
}
