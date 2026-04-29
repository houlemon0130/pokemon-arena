import Phaser from "phaser";

export class HPBar {
  private readonly bar: Phaser.GameObjects.Graphics;
  private value: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    value = 1,
  ) {
    this.value = value;
    this.bar = scene.add.graphics();
    this.draw();
  }

  setValue(value: number) {
    this.value = Phaser.Math.Clamp(value, 0, 1);
    this.draw();
  }

  animateTo(targetValue: number, durationMs: number) {
    const clampedTarget = Phaser.Math.Clamp(targetValue, 0, 1);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      value: clampedTarget,
      duration: durationMs,
      ease: "Sine.easeOut",
      onUpdate: () => this.draw(),
    });
  }

  private draw() {
    this.bar.clear();
    this.bar.fillStyle(0x111827, 1);
    this.bar.fillRoundedRect(this.x, this.y, this.width, this.height, 4);
    this.bar.fillStyle(this.value > 0.45 ? 0x34d399 : this.value > 0.2 ? 0xfbbf24 : 0xfb7185, 1);
    this.bar.fillRoundedRect(this.x, this.y, this.width * this.value, this.height, 4);
  }
}
