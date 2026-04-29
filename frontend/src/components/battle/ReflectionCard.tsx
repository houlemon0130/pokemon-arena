"use client";

import type { ReflectionResult } from "@/lib/types";

type ReflectionCardProps = {
  reflection: ReflectionResult | null;
};

export function ReflectionCard({ reflection }: ReflectionCardProps) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">复盘</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{reflection?.narrative ?? "暂无复盘"}</p>
    </section>
  );
}
