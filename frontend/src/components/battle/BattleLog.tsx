type BattleLogProps = {
  events: string[];
};

export function BattleLog({ events }: BattleLogProps) {
  return (
    <section className="min-h-40 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">Battle Log</h2>
      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm text-zinc-300">
        {events.length ? events.map((event, index) => <p key={`${event}-${index}`}>{event}</p>) : <p className="text-zinc-500">等待战斗...</p>}
      </div>
    </section>
  );
}
