import Phaser from "phaser";

export class PokemonSprite {
  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, texture: string, x: number, y: number, flipX = false) {
    this.sprite = scene.add.image(x, y, texture);
    this.sprite.setScale(2.5);
    this.sprite.setFlipX(flipX);
    this.sprite.setOrigin(0.5, 1);
  }

  playHit() {
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.35,
      yoyo: true,
      repeat: 3,
      duration: 80,
    });
  }
}
