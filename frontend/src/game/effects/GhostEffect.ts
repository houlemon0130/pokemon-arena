import Phaser from "phaser";

export class GhostEffect {
  static play(scene: Phaser.Scene, x: number, y: number) {
    const haze = scene.add.circle(x, y, 30, 0xa78bfa, 0.35);
    scene.tweens.add({ targets: haze, scale: 2, alpha: 0, duration: 560, onComplete: () => haze.destroy() });
  }
}
