"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";

import { BattleEndOverlay } from "@/components/battle/BattleEndOverlay";
import { BattleCanvas } from "@/components/battle/BattleCanvas";
import { BattleLog } from "@/components/battle/BattleLog";
import { MoveSelector } from "@/components/battle/MoveSelector";
import { OpponentPokemonCard } from "@/components/battle/OpponentPokemonCard";
import { PlayerPokemonCard } from "@/components/battle/PlayerPokemonCard";
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
            fear={0}
          />
          <MoveSelector moves={moves} selectedMove={selectedMove} onSelect={handleSelectMove} />
        </aside>
        <section className="min-h-[520px] rounded-lg border border-zinc-800 bg-black">
          <BattleCanvas />
        </section>
        <aside className="space-y-4">
          <BattleLog events={battleLog} />
        </aside>
      </div>
      <BattleEndOverlay winner={battleState?.winner ?? null} onRematch={() => window.location.reload()} />
    </main>
  );
}
