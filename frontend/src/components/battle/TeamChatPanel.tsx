"use client";

import { useBattleStore } from "@/store/battleStore";

export function TeamChatPanel() {
  // Issue: 改为 channel === "team" 精确匹配队内聊天
  const messages = useBattleStore((state) =>
    state.chatMessages.filter((message) => message.channel === "team"),
  );
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
