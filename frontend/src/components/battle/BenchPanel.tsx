"use client";

import type { ChatMessage } from "@/lib/types";

type BenchPanelProps = {
  messages: ChatMessage[];
};

export function BenchPanel({ messages }: BenchPanelProps) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">板凳席</h2>
      <div className="mt-3 space-y-2 text-sm text-zinc-300">
        {messages.length ? messages.map((message, index) => <p key={`${message.content}-${index}`}>{message.content}</p>) : <p className="text-zinc-500">板凳宝可梦正在观战...</p>}
      </div>
    </section>
  );
}
