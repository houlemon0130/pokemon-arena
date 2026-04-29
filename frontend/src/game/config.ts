import * as Phaser from "phaser";

import { BattleScene } from "./scenes/BattleScene";

export function createBattleGameConfig(parent: string | HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 900,
    height: 540,
    backgroundColor: "#050505",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BattleScene],
  };
}
