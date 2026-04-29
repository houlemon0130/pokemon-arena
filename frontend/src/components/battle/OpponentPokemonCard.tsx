const statusMap: Record<string, string> = {
  burn: "烧伤",
  paralysis: "麻痹",
  sleep: "睡眠",
  poison: "中毒",
  confusion: "混乱",
};

type OpponentPokemonCardProps = {
  name: string;
  hp: number;
  maxHp: number;
  status?: string | null;
};

export function OpponentPokemonCard({ name, hp, maxHp, status }: OpponentPokemonCardProps) {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{name}</h2>
          <p className="mt-1 text-xs text-zinc-400">对手上场宝可梦</p>
        </div>
        {status ? <span className="rounded bg-violet-400/15 px-2 py-1 text-xs text-violet-200">{statusMap[status] ?? status}</span> : null}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-zinc-400">
          <span>HP</span>
          <span>{hp}/{maxHp}</span>
        </div>
        <div className="h-2 rounded bg-zinc-800">
          <div className="h-2 rounded bg-rose-400" style={{ width: `${hpPct}%` }} />
        </div>
      </div>
    </section>
  );
}
