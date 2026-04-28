"use client";

import Image from "next/image";

import type { PokemonDef } from "@/lib/types";

const SPRITE_IDS: Record<string, number> = {
  bulbasaur: 1,
  charmander: 4,
  squirtle: 7,
  pikachu: 25,
  gengar: 94,
  eevee: 133,
};

type PokemonCardProps = {
  pokemon: PokemonDef;
  selected: boolean;
  selectedOrder?: number;
  onToggle: () => void;
};

export function PokemonCard({ pokemon, selected, selectedOrder, onToggle }: PokemonCardProps) {
  const spriteId = SPRITE_IDS[pokemon.id] ?? 25;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex min-h-[244px] flex-col items-start justify-between rounded-lg border p-4 text-left transition ${
        selected
          ? "border-emerald-400 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
      }`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-zinc-100">{pokemon.name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {pokemon.types.map((type) => (
              <span key={type} className="rounded bg-zinc-800 px-2 py-0.5 text-xs uppercase text-zinc-300">
                {type}
              </span>
            ))}
          </div>
        </div>
        {selectedOrder ? (
          <span className="grid h-7 w-7 place-items-center rounded bg-emerald-400 text-sm font-bold text-zinc-950">
            {selectedOrder}
          </span>
        ) : null}
      </div>

      <div className="flex w-full items-end justify-between gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
          <dt>HP</dt>
          <dd className="text-zinc-200">{pokemon.stats.hp}</dd>
          <dt>ATK</dt>
          <dd className="text-zinc-200">{pokemon.stats.attack}</dd>
          <dt>SPD</dt>
          <dd className="text-zinc-200">{pokemon.stats.speed}</dd>
        </dl>
        <Image
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${spriteId}.gif`}
          alt={pokemon.name}
          width={96}
          height={96}
          unoptimized
          className="h-24 w-24 object-contain [image-rendering:pixelated]"
        />
      </div>
    </button>
  );
}
