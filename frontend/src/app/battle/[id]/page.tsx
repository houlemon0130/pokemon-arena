"use client";

import { useCallback, useMemo } from "react";
import { useParams } from "next/navigation";

import { ActivePokemonPanel } from "@/components/battle/ActivePokemonPanel";
import { BattleCanvas } from "@/components/battle/BattleCanvas";
import { BattleEndOverlay } from "@/components/battle/BattleEndOverlay";
import { BattleLog } from "@/components/battle/BattleLog";
import { MoveSelector } from "@/components/battle/MoveSelector";
import { OpponentPokemonCard } from "@/components/battle/OpponentPokemonCard";
import { PlayerPokemonCard } from "@/components/battle/PlayerPokemonCard";
import { TrainerMindPanel } from "@/components/battle/TrainerMindPanel";
import { TurnBanner } from "@/components/battle/TurnBanner";
import { useBattleSocket } from "@/hooks/useBattleSocket";
import { useBattleStore } from "@/store/battleStore";

export default function BattlePage() {
  const params = useParams<{ id: string }>();

  // Single subscription point — all child components are pure presentational
  const battleState = useBattleStore((state) => state.battleState);
  const selectedMove = useBattleStore((state) => state.selectedMove);
  const setSelectedMove = useBattleStore((state) => state.setSelectedMove);
  const battleLog = useBattleStore((state) => state.battleLog);
  const agentDecisions = useBattleStore((state) => state.agentDecisions);
  const agentStreams = useBattleStore((state) => state.agentStreams);
  const toolCalls = useBattleStore((state) => state.toolCalls);

  const { sendMessage } = useBattleSocket(params.id);

  const playerPokemon = battleState?.player_team?.active;
  const opponentPokemon = battleState?.opponent_team?.active;
  const moves = useMemo(() => playerPokemon?.moves ?? [], [playerPokemon?.moves]);

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

  const benchPokemon = useMemo(() => battleState?.player_team?.bench ?? [], [battleState?.player_team?.bench]);

  // Derived data for child components
  const lastTrainerDecision = useMemo(() => agentDecisions.findLast((d) => d.agent_type === "trainer") ?? null, [agentDecisions]);
  const lastPokemonDecision = useMemo(() => agentDecisions.findLast((d) => d.agent_type === "pokemon") ?? null, [agentDecisions]);
  const lastTools = useMemo(() => toolCalls.slice(-4), [toolCalls]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <TurnBanner turn={battleState?.current_turn ?? 1} phase={battleState?.phase ?? "connecting"} />
      <div className="flex gap-4 p-4">
        {/* 左侧 flex-1: 对战主区域 */}
        <div className="flex-1 space-y-4 min-w-0">
          <OpponentPokemonCard
            name={opponentPokemon?.name ?? "对手"}
            hp={opponentPokemon?.current_hp ?? 0}
            maxHp={opponentPokemon?.max_hp ?? 1}
            status={opponentPokemon?.status ?? null}
          />
          <section className="min-h-[420px] rounded-lg border border-zinc-800 bg-black">
            <BattleCanvas />
          </section>
          <PlayerPokemonCard
            name={playerPokemon?.name ?? "玩家"}
            hp={playerPokemon?.current_hp ?? 0}
            maxHp={playerPokemon?.max_hp ?? 1}
            status={playerPokemon?.status ?? null}
            fear={playerPokemon?.fear ?? 0}
          />
          <MoveSelector moves={moves} selectedMove={selectedMove} onSelect={handleSelectMove} />
          {/* 内联板凳换人按钮 */}
          {benchPokemon.length > 0 && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">板凳宝可梦</h3>
              <div className="flex flex-wrap gap-2">
                {benchPokemon.map((pokemon) => (
                  <button
                    key={pokemon.def_id}
                    type="button"
                    onClick={() => handleSwitch(pokemon.def_id)}
                    disabled={pokemon.current_hp <= 0}
                    className={`rounded border px-3 py-2 text-left text-sm transition ${
                      pokemon.current_hp <= 0
                        ? "border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-emerald-500 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
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
        </div>

        {/* 右侧 320px 固定宽度: Agent 思考面板 + 战斗日志 */}
        <aside className="w-80 space-y-4 shrink-0">
          <TrainerMindPanel latest={lastTrainerDecision} streamText={agentStreams["trainer"] ?? ""} tools={lastTools} />
          <ActivePokemonPanel latest={lastPokemonDecision} streamText={agentStreams["pokemon"] ?? ""} />
          <BattleLog events={battleLog} />
        </aside>
      </div>
      <BattleEndOverlay winner={battleState?.winner ?? null} onRematch={() => window.location.reload()} />
    </main>
  );
}
