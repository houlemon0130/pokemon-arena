import Phaser from "phaser";

export class ElectricEffect {
  static play(scene: Phaser.Scene, x: number, y: number) {
    const bolt = scene.add.graphics();
    bolt.lineStyle(4, 0xfff200, 1);
    bolt.beginPath();
    bolt.moveTo(x - 30, y - 30);
    bolt.lineTo(x, y - 5);
    bolt.lineTo(x - 8, y - 5);
    bolt.lineTo(x + 30, y + 30);
    bolt.strokePath();
    scene.tweens.add({ targets: bolt, alpha: 0, duration: 320, onComplete: () => bolt.destroy() });
  }
}
