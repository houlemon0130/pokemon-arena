type PlayerPokemonCardProps = {
  name: string;
  hp: number;
  maxHp: number;
  status?: string | null;
  fear?: number;
};

export function PlayerPokemonCard({ name, hp, maxHp, status, fear = 0 }: PlayerPokemonCardProps) {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const fearPct = Math.max(0, Math.min(100, fear * 100));

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{name}</h2>
          <p className="mt-1 text-xs text-zinc-400">Player active</p>
        </div>
        {status ? <span className="rounded bg-red-400/15 px-2 py-1 text-xs text-red-200">{status}</span> : null}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-zinc-400">
          <span>HP</span>
          <span>{hp}/{maxHp}</span>
        </div>
        <div className="h-2 rounded bg-zinc-800">
          <div className="h-2 rounded bg-emerald-400" style={{ width: `${hpPct}%` }} />
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-zinc-400">
          <span>Fear</span>
          <span>{Math.round(fearPct)}%</span>
        </div>
        <div className="h-2 rounded bg-zinc-800">
          <div className="h-2 rounded bg-amber-400" style={{ width: `${fearPct}%` }} />
        </div>
      </div>
    </section>
  );
}
