import Phaser from "phaser";

export class GrassEffect {
  static play(scene: Phaser.Scene, x: number, y: number) {
    const leaf = scene.add.triangle(x, y, 0, 20, 12, 0, 24, 20, 0x4ade80, 0.9);
    scene.tweens.add({ targets: leaf, angle: 180, y: y - 45, alpha: 0, duration: 500, onComplete: () => leaf.destroy() });
  }
}
