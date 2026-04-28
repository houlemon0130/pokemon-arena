"use client";

import type { PokemonDef } from "@/lib/types";

import { PokemonCard } from "./PokemonCard";

type PokemonGridProps = {
  pokemon: PokemonDef[];
  selectedIds: string[];
  onToggle: (pokemonId: string) => void;
  renderCard?: (pokemon: PokemonDef) => React.ReactNode;
};

export function PokemonGrid({ pokemon, selectedIds, onToggle, renderCard }: PokemonGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {pokemon.map((item) => {
        const selectedIndex = selectedIds.indexOf(item.id);
        if (renderCard) {
          return <div key={item.id}>{renderCard(item)}</div>;
        }
        return (
          <PokemonCard
            key={item.id}
            pokemon={item}
            selected={selectedIndex !== -1}
            selectedOrder={selectedIndex === -1 ? undefined : selectedIndex + 1}
            onToggle={() => onToggle(item.id)}
          />
        );
      })}
    </div>
  );
}
