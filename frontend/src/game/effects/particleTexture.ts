import Phaser from "phaser";

type ParticleShape = "circle" | "diamond" | "streak" | "leaf";

export function ensureParticleTexture(scene: Phaser.Scene, key: string, shape: ParticleShape) {
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.add.graphics();
  graphics.clear();
  graphics.fillStyle(0xffffff, 1);

  if (shape === "circle") {
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture(key, 16, 16);
  } else if (shape === "diamond") {
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(8, 0),
        new Phaser.Geom.Point(16, 8),
        new Phaser.Geom.Point(8, 16),
        new Phaser.Geom.Point(0, 8),
      ],
      true,
    );
    graphics.generateTexture(key, 16, 16);
  } else if (shape === "leaf") {
    graphics.fillEllipse(10, 6, 18, 9);
    graphics.generateTexture(key, 20, 12);
  } else {
    graphics.fillRoundedRect(0, 3, 28, 6, 3);
    graphics.generateTexture(key, 28, 12);
  }

  graphics.destroy();
  return key;
}

export function destroyEmitterAfter(
  scene: Phaser.Scene,
  emitter: Phaser.GameObjects.Particles.ParticleEmitter,
  delay: number,
) {
  scene.time.delayedCall(delay, () => {
    if (emitter.scene) {
      emitter.destroy();
    }
  });
}
