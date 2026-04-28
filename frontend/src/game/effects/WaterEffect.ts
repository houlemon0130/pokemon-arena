import Phaser from "phaser";

export class WaterEffect {
  static play(scene: Phaser.Scene, x: number, y: number) {
    const drop = scene.add.circle(x, y, 16, 0x38bdf8, 0.9);
    scene.tweens.add({ targets: drop, x: x + 90, scale: 0.4, alpha: 0, duration: 420, onComplete: () => drop.destroy() });
  }
}
