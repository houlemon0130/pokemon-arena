import Phaser from "phaser";

export class FireEffect {
  static play(scene: Phaser.Scene, x: number, y: number) {
    const flame = scene.add.circle(x, y, 18, 0xfb923c, 0.9);
    scene.tweens.add({ targets: flame, y: y - 60, scale: 0.2, alpha: 0, duration: 500, onComplete: () => flame.destroy() });
  }
}
