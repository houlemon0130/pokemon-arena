"use client";

import type { MoveDef } from "@/lib/types";

type MoveSelectorProps = {
  moves: MoveDef[];
  selectedMove: number | null;
  onSelect: (moveIndex: number) => void;
};

export function MoveSelector({ moves, selectedMove, onSelect }: MoveSelectorProps) {
  const typeNames: Record<string, string> = {
    fire: "火", water: "水", grass: "草", electric: "电",
    normal: "一般", ghost: "幽灵", poison: "毒", psychic: "超能力",
    ground: "地面", flying: "飞行", bug: "虫", rock: "岩石",
    ice: "冰", dragon: "龙", dark: "恶", steel: "钢", fairy: "妖精",
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {moves.map((move, index) => (
        <button
          key={`${move.id}-${index}`}
          type="button"
          onClick={() => onSelect(index)}
          className={`min-h-16 rounded-lg border p-3 text-left transition ${
            selectedMove === index ? "border-emerald-400 bg-emerald-400/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
          }`}
        >
          <div className="text-sm font-semibold text-zinc-100">{move.name}</div>
          <div className="mt-1 text-xs text-zinc-400">
            {typeNames[move.type] ?? move.type} · PP {move.pp}
          </div>
        </button>
      ))}
    </div>
  );
}
