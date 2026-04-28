"use client";

import { useEffect, useRef } from "react";

export function BattleCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function mount() {
      const Phaser = (await import("phaser")).default;
      const { createBattleGameConfig } = await import("@/game/config");
      if (!mounted || gameRef.current || !containerRef.current) {
        return;
      }
      gameRef.current = new Phaser.Game(createBattleGameConfig(containerRef.current));
    }

    mount();

    return () => {
      mounted = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full min-h-[420px] w-full overflow-hidden rounded-lg bg-black" />;
}
