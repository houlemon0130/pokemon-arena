"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";

import { BattleEndOverlay } from "@/components/battle/BattleEndOverlay";
import { ActivePokemonPanel } from "@/components/battle/ActivePokemonPanel";
import { BattleCanvas } from "@/components/battle/BattleCanvas";
import { BattleLog } from "@/components/battle/BattleLog";
import { BenchPanel } from "@/components/battle/BenchPanel";
import { CrossTalkPanel } from "@/components/battle/CrossTalkPanel";
import { MoveSelector } from "@/components/battle/MoveSelector";
import { OpponentPokemonCard } from "@/components/battle/OpponentPokemonCard";
import { PlayerPokemonCard } from "@/components/battle/PlayerPokemonCard";
import { ReflectionCard } from "@/components/battle/ReflectionCard";
import { TeamChatPanel } from "@/components/battle/TeamChatPanel";
import { TrainerMindPanel } from "@/components/battle/TrainerMindPanel";
import { TurnBanner } from "@/components/battle/TurnBanner";
import { useBattleSocket } from "@/hooks/useBattleSocket";
import { useBattleStore } from "@/store/battleStore";

export default function BattlePage() {
  const params = useParams<{ id: string }>();
  const battleState = useBattleStore((state) => state.battleState);
  const selectedMove = useBattleStore((state) => state.selectedMove);
  const setSelectedMove = useBattleStore((state) => state.setSelectedMove);
  const battleLog = useBattleStore((state) => state.battleLog);
  const { sendMessage } = useBattleSocket(params.id);
  const playerPokemon = battleState?.player_team?.active;
  const opponentPokemon = battleState?.opponent_team?.active;
  const moves = playerPokemon?.moves ?? [];

  const handleSelectMove = useCallback(
    (index: number) => {
      if (!moves[index]) return;
      setSelectedMove(index);
      sendMessage({ type: "player_move", move_index: index });
    },
    [moves, sendMessage, setSelectedMove],
  );

  const handleSwitch = useCallback(
    (pokemonId: string) => {
      sendMessage({ type: "player_switch", pokemon_id: pokemonId });
    },
    [sendMessage],
  );

  const benchPokemon = battleState?.player_team?.bench ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <TurnBanner turn={battleState?.current_turn ?? 1} phase={battleState?.phase ?? "connecting"} />
      <div className="grid gap-4 p-4 lg:grid-cols-[320px_1fr_360px]">
        <aside className="space-y-4">
          <OpponentPokemonCard
            name={opponentPokemon?.name ?? "对手"}
            hp={opponentPokemon?.current_hp ?? 0}
            maxHp={opponentPokemon?.max_hp ?? 1}
            status={opponentPokemon?.status ?? null}
          />
          <PlayerPokemonCard
            name={playerPokemon?.name ?? "玩家"}
            hp={playerPokemon?.current_hp ?? 0}
            maxHp={playerPokemon?.max_hp ?? 1}
            status={playerPokemon?.status ?? null}
            fear={playerPokemon?.fear ?? 0}
          />
          <MoveSelector moves={moves} selectedMove={selectedMove} onSelect={handleSelectMove} />
          {benchPokemon.length > 0 && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">板凳宝可梦</h3>
              <div className="space-y-2">
                {benchPokemon.map((pokemon) => (
                  <button
                    key={pokemon.def_id}
                    type="button"
                    onClick={() => handleSwitch(pokemon.def_id)}
                    disabled={pokemon.current_hp <= 0}
                    className={`w-full rounded border p-2 text-left text-sm transition ${
                      pokemon.current_hp <= 0
                        ? "border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-emerald-500 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{pokemon.name}</span>
                      <span className="text-xs text-zinc-500">
                        HP: {pokemon.current_hp}/{pokemon.max_hp}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </aside>
        <section className="min-h-[520px] rounded-lg border border-zinc-800 bg-black">
          <BattleCanvas />
        </section>
        <aside className="space-y-4">
          <TrainerMindPanel />
          <ActivePokemonPanel />
          <TeamChatPanel />
          <CrossTalkPanel />
          <ReflectionCard />
          <BenchPanel />
          <BattleLog events={battleLog} />
        </aside>
      </div>
      <BattleEndOverlay winner={battleState?.winner ?? null} onRematch={() => window.location.reload()} />
    </main>
  );
}
