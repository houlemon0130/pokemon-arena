import { PokemonCard } from "@/components/select/PokemonCard";
import { PokemonGrid } from "@/components/select/PokemonGrid";
import type { PokemonDef } from "@/lib/types";

const pokemon: PokemonDef = {
  id: "pikachu",
  name: "Pikachu",
  types: ["electric"],
  stats: { hp: 100, attack: 90, defense: 70, sp_attack: 100, sp_defense: 80, speed: 130 },
  moves: ["thunderbolt", "quick_attack", "thunder_wave", "thunder_shock"],
  personality: "playful",
};

export function Task16Contract() {
  return (
    <PokemonGrid
      pokemon={[pokemon]}
      selectedIds={["pikachu"]}
      onToggle={() => undefined}
      renderCard={(item) => (
        <PokemonCard pokemon={item} selected selectedOrder={1} onToggle={() => undefined} />
      )}
    />
  );
}
