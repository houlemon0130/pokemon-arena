"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PokemonGrid } from "@/components/select/PokemonGrid";
import { createBattle, fetchPokemonList } from "@/lib/api";
import type { PokemonDef } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [pokemon, setPokemon] = useState<PokemonDef[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetchPokemonList()
      .then((items) => {
        setPokemon(items);
        setSelectedIds(items.slice(0, 3).map((item) => item.id));
      })
      .catch(() => setError("Unable to load Pokemon roster."));
  }, []);

  const activePokemon = useMemo(
    () => pokemon.find((item) => item.id === selectedIds[0]) ?? null,
    [pokemon, selectedIds],
  );

  const togglePokemon = (pokemonId: string) => {
    setSelectedIds((current) => {
      if (current.includes(pokemonId)) {
        return current.filter((id) => id !== pokemonId);
      }
      if (current.length >= 3) {
        return [current[1], current[2], pokemonId].filter(Boolean);
      }
      return [...current, pokemonId];
    });
  };

  const startBattle = async () => {
    if (selectedIds.length !== 3) {
      return;
    }
    setIsStarting(true);
    setError(null);
    try {
      const battle = await createBattle(selectedIds[0], selectedIds.slice(1), ["gengar", "pikachu", "eevee"]);
      router.push(`/battle/${battle.battle_id}`);
    } catch {
      setError("Unable to start battle.");
      setIsStarting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-zinc-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50">Pokemon Arena</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Choose three Pokemon. The first selected Pokemon starts on the field; the other two advise from the bench.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-400">
            Active: <span className="font-medium text-zinc-100">{activePokemon?.name ?? "None"}</span>
          </div>
          <button
            type="button"
            onClick={startBattle}
            disabled={selectedIds.length !== 3 || isStarting}
            className="h-10 rounded bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isStarting ? "Starting..." : "Start Battle"}
          </button>
        </div>
      </header>

      {error ? <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      <PokemonGrid pokemon={pokemon} selectedIds={selectedIds} onToggle={togglePokemon} />
    </main>
  );
}
