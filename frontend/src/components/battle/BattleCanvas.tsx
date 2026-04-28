"use client";

import { useEffect, useId, useRef } from "react";

export function BattleCanvas() {
  const id = useId().replaceAll(":", "");
  const gameRef = useRef<{ destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function mount() {
      const Phaser = (await import("phaser")).default;
      const { createBattleGameConfig } = await import("@/game/config");
      if (!mounted || gameRef.current) {
        return;
      }
      gameRef.current = new Phaser.Game(createBattleGameConfig(id));
    }

    mount();

    return () => {
      mounted = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [id]);

  return <div id={id} className="h-full min-h-[420px] w-full overflow-hidden rounded-lg bg-black" />;
}
