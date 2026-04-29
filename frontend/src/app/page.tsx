"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PokemonGrid } from "@/components/select/PokemonGrid";
import { createBattle, fetchPokemonList } from "@/lib/api";
import type { PokemonDef } from "@/lib/types";

/** 性格ID到中文描述的映射 (从后端personalities.json同步) */
const PERSONALITY_INFO: Record<string, { name: string; voice: string }> = {
  brave: { name: "勇敢", voice: "大胆而自信 — 热爱进攻" },
  calm: { name: "沉稳", voice: "冷静而沉稳 — 防守反击" },
  clever: { name: "聪明", voice: "聪明而策略性 — 战术状态流" },
  playful: { name: "顽皮", voice: "顽皮而好动 — 高风险高回报" },
  timid: { name: "胆小", voice: "胆小犹豫 — 极度保守" },
  mysterious: { name: "神秘", voice: "阴森而神秘 — 状态折磨流" },
};

function getPersonalityDisplay(personalityId?: string): string {
  if (!personalityId || !PERSONALITY_INFO[personalityId]) return "未知";
  const info = PERSONALITY_INFO[personalityId];
  return `${info.name} · ${info.voice}`;
}

export default function Home() {
  const router = useRouter();
  const [pokemon, setPokemon] = useState<PokemonDef[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [opponentIds, setOpponentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetchPokemonList()
      .then((items) => {
        setPokemon(items);
        const playerPicks = items.slice(0, 3).map((item) => item.id);
        setSelectedIds(playerPicks);
        // 自动随机选择3只不同的宝可梦作为对手
        const remaining = items.filter((item) => !playerPicks.includes(item.id));
        if (remaining.length >= 3) {
          setOpponentIds(remaining.slice(0, 3).map((item) => item.id));
        } else {
          // 如果只剩不到3只，从剩余和前面凑
          const shuffled = [...items].sort(() => Math.random() - 0.5);
          setOpponentIds(shuffled.filter((item) => !playerPicks.includes(item.id) || Math.random() > 0.5).slice(0, 3).map((item) => item.id));
        }
      })
      .catch(() => setError("无法加载宝可梦列表。"));
  }, []);

  const activePokemon = useMemo(
    () => pokemon.find((item) => item.id === selectedIds[0]) ?? null,
    [pokemon, selectedIds],
  );

  const opponentPokemonList = useMemo(
    () => opponentIds.map((id) => pokemon.find((item) => item.id === id)).filter(Boolean) as PokemonDef[],
    [opponentIds, pokemon],
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

  const toggleOpponent = (pokemonId: string) => {
    setOpponentIds((current) => {
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
    if (selectedIds.length !== 3 || opponentIds.length !== 3) {
      return;
    }
    setIsStarting(true);
    setError(null);
    try {
      const battle = await createBattle(selectedIds[0], selectedIds.slice(1), opponentIds);
      router.push(`/battle/${battle.battle_id}`);
    } catch {
      setError("无法开始对战。");
      setIsStarting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-zinc-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50">宝可梦竞技场</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            选择三只宝可梦。第一只上场对战，其余两只在板凳上提供建议。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-400">
            上场: <span className="font-medium text-zinc-100">{activePokemon?.name ?? "无"}</span>
          </div>
          <button
            type="button"
            onClick={startBattle}
            disabled={selectedIds.length !== 3 || opponentIds.length !== 3 || isStarting}
            className="h-10 rounded bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isStarting ? "准备中..." : "开始对战"}
          </button>
        </div>
      </header>

      {error ? <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      {/* 玩家选宠 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">你的队伍</h2>
        <PokemonGrid pokemon={pokemon} selectedIds={selectedIds} onToggle={togglePokemon} />
      </section>

      {/* 对手阵容 */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-rose-400">对手队伍</h2>
          <span className="text-xs text-zinc-500">点击可更换对手</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {opponentPokemonList.map((item) => {
            const personalityDisplay = getPersonalityDisplay(item.personality);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleOpponent(item.id)}
                className="group flex min-h-[200px] flex-col items-start justify-between rounded-lg border border-rose-800 bg-rose-950/30 p-4 text-left transition hover:border-rose-600"
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-zinc-100">{item.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.types.map((type) => (
                        <span key={type} className="rounded bg-zinc-800 px-2 py-0.5 text-xs uppercase text-zinc-300">
                          {type}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{personalityDisplay}</p>
                  </div>
                </div>
                <div className="flex w-full items-end justify-between gap-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <dt>HP</dt>
                    <dd className="text-zinc-200">{item.stats.hp}</dd>
                    <dt>ATK</dt>
                    <dd className="text-zinc-200">{item.stats.attack}</dd>
                    <dt>SPD</dt>
                    <dd className="text-zinc-200">{item.stats.speed}</dd>
                  </dl>
                  <div className="text-xs text-zinc-500">对手</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
