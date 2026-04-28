import Phaser from "phaser";

export class BattleBackground {
  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    scene.add.rectangle(width / 2, height / 2, width, height, 0x111827);
    scene.add.ellipse(width * 0.28, height * 0.72, 280, 74, 0x1f2937, 0.9);
    scene.add.ellipse(width * 0.72, height * 0.34, 240, 64, 0x374151, 0.75);
    scene.add.rectangle(width / 2, height * 0.52, width, 2, 0x34d399, 0.3);
  }
}
