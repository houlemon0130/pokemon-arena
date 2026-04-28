"use client";

import { useParams } from "next/navigation";

import { ActivePokemonPanel } from "@/components/battle/ActivePokemonPanel";
import { BattleEndOverlay } from "@/components/battle/BattleEndOverlay";
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
import type { MoveDef } from "@/lib/types";
import { useBattleStore } from "@/store/battleStore";

const DEFAULT_MOVES: MoveDef[] = [
  { id: "ember", name: "Ember", type: "fire", category: "special", power: 40, accuracy: 100, pp: 25 },
  { id: "flamethrower", name: "Flamethrower", type: "fire", category: "special", power: 90, accuracy: 100, pp: 15 },
  { id: "scratch", name: "Scratch", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 35 },
  { id: "growl", name: "Growl", type: "normal", category: "status", accuracy: 100, pp: 40 },
];

export default function BattlePage() {
  const params = useParams<{ id: string }>();
  const battleState = useBattleStore((state) => state.battleState);
  const selectedMove = useBattleStore((state) => state.selectedMove);
  const setSelectedMove = useBattleStore((state) => state.setSelectedMove);
  const battleLog = useBattleStore((state) => state.battleLog);
  useBattleSocket(params.id);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <TurnBanner turn={battleState?.current_turn ?? 1} phase={battleState?.phase ?? "connecting"} />
      <div className="grid gap-4 p-4 lg:grid-cols-[320px_1fr_360px]">
        <aside className="space-y-4">
          <OpponentPokemonCard name="Gengar" hp={115} maxHp={115} status={null} />
          <PlayerPokemonCard name="Charmander" hp={120} maxHp={120} status={null} fear={0} />
          <MoveSelector moves={DEFAULT_MOVES} selectedMove={selectedMove} onSelect={setSelectedMove} />
        </aside>
        <section className="min-h-[520px] rounded-lg border border-zinc-800 bg-black" />
        <aside className="space-y-4">
          <TrainerMindPanel />
          <ActivePokemonPanel />
          <BenchPanel />
          <TeamChatPanel />
          <CrossTalkPanel />
          <ReflectionCard />
          <BattleLog events={battleLog} />
        </aside>
      </div>
      <BattleEndOverlay winner={battleState?.winner ?? null} onRematch={() => window.location.reload()} />
    </main>
  );
}
