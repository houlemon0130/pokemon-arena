import Phaser from "phaser";

export class NormalEffect {
  static play(scene: Phaser.Scene, x: number, y: number) {
    const hit = scene.add.circle(x, y, 20, 0xe5e7eb, 0.8);
    scene.tweens.add({ targets: hit, scale: 1.8, alpha: 0, duration: 260, onComplete: () => hit.destroy() });
  }
}
