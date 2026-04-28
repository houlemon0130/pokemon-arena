type TurnBannerProps = {
  turn: number;
  phase: string;
};

export function TurnBanner({ turn, phase }: TurnBannerProps) {
  return (
    <div className="flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4">
      <span className="text-sm font-semibold text-zinc-100">第 {turn} 回合</span>
      <span className="rounded bg-zinc-800 px-2 py-1 text-xs uppercase tracking-wide text-zinc-300">{phase}</span>
    </div>
  );
}
