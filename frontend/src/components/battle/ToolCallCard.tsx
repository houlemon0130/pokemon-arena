"use client";

import { useState } from "react";

type ToolCallCardProps = {
  toolName: string;
  output: Record<string, unknown>;
};

export function ToolCallCard({ toolName, output }: ToolCallCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-zinc-800 bg-zinc-950">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between p-3 text-left">
        <span className="text-sm font-medium text-zinc-100">{toolName}</span>
        <span className="text-xs text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <pre className="overflow-auto border-t border-zinc-800 p-3 text-xs text-zinc-300">{JSON.stringify(output, null, 2)}</pre> : null}
    </div>
  );
}
