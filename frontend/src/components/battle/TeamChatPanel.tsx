"use client";

import type { ChatMessage } from "@/lib/types";

type TeamChatPanelProps = {
  messages: ChatMessage[];
};

export function TeamChatPanel({ messages }: TeamChatPanelProps) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">队内聊天</h2>
      <div className="mt-3 space-y-2 text-sm text-zinc-300">
        {messages.length ? (
          messages.map((message, index) => (
            <p key={`${message.content}-${index}`}>
              <span className="text-xs text-zinc-500">
                {message.from_agent?.replace("bench:", "") ?? "未知"}:
              </span>{" "}
              {message.content}
            </p>
          ))
        ) : (
          <p className="text-zinc-500">暂无队内聊天</p>
        )}
      </div>
    </section>
  );
}
