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
import { ToolCallCard } from "@/components/battle/ToolCallCard";
import { TrainerMindPanel } from "@/components/battle/TrainerMindPanel";
import { TurnBanner } from "@/components/battle/TurnBanner";
import type { MoveDef } from "@/lib/types";

const moves: MoveDef[] = [
  { id: "ember", name: "Ember", type: "fire", category: "special", power: 40, accuracy: 100, pp: 25 },
];

export function Task17Contract() {
  return (
    <>
      <TurnBanner turn={1} phase="player_select" />
      <PlayerPokemonCard name="Charmander" hp={72} maxHp={120} status="burn" fear={0.3} />
      <OpponentPokemonCard name="Gengar" hp={88} maxHp={115} status={null} />
      <MoveSelector moves={moves} selectedMove={0} onSelect={() => undefined} />
      <BattleLog events={["Charmander used Ember"]} />
      <TrainerMindPanel />
      <ActivePokemonPanel />
      <ToolCallCard toolName="check_type_effectiveness" output={{ multiplier: 2 }} />
      <BenchPanel />
      <TeamChatPanel />
      <CrossTalkPanel />
      <ReflectionCard />
      <BattleEndOverlay winner={null} onRematch={() => undefined} />
    </>
  );
}
