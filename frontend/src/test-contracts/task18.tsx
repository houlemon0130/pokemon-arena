import { BattleCanvas } from "@/components/battle/BattleCanvas";
import { createBattleGameConfig } from "@/game/config";
import { BattleBackground } from "@/game/objects/BattleBackground";
import { HPBar } from "@/game/objects/HPBar";
import { PokemonSprite } from "@/game/objects/PokemonSprite";
import { BattleScene } from "@/game/scenes/BattleScene";
import { ElectricEffect } from "@/game/effects/ElectricEffect";
import { FireEffect } from "@/game/effects/FireEffect";
import { GhostEffect } from "@/game/effects/GhostEffect";
import { GrassEffect } from "@/game/effects/GrassEffect";
import { NormalEffect } from "@/game/effects/NormalEffect";
import { WaterEffect } from "@/game/effects/WaterEffect";

export function task18Contract() {
  const config = createBattleGameConfig("battle-canvas");
  return {
    config,
    scene: BattleScene,
    objects: [BattleBackground, HPBar, PokemonSprite],
    effects: [ElectricEffect, FireEffect, GhostEffect, GrassEffect, NormalEffect, WaterEffect],
  };
}

export function Task18ComponentContract() {
  return <BattleCanvas />;
}
