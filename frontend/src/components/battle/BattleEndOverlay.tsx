type BattleEndOverlayProps = {
  winner: string | null;
  onRematch: () => void;
};

export function BattleEndOverlay({ winner, onRematch }: BattleEndOverlayProps) {
  if (!winner) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-950 p-5 text-center">
        <h2 className="text-xl font-semibold text-zinc-100">{winner} wins</h2>
        <button type="button" onClick={onRematch} className="mt-4 h-10 rounded bg-emerald-400 px-4 text-sm font-semibold text-zinc-950">
          Rematch
        </button>
      </div>
    </div>
  );
}
