import * as Phaser from "phaser";

import { destroyEmitterAfter, ensureParticleTexture } from "./particleTexture";

export function FireEffect(scene: Phaser.Scene, x: number, y: number) {
  const emitter = scene.add.particles(x, y, ensureParticleTexture(scene, "particle-fire", "circle"), {
    frequency: 24,
    quantity: 3,
    lifespan: { min: 420, max: 720 },
    speedX: { min: -42, max: 42 },
    speedY: { min: -210, max: -95 },
    accelerationY: { min: -80, max: -30 },
    scale: { start: 0.9, end: 0.05 },
    alpha: { start: 0.95, end: 0 },
    tint: [0xfff1a8, 0xff9f1c, 0xef4444],
    blendMode: Phaser.BlendModes.ADD,
    emitting: true,
  });

  emitter.stopAfter = 36;
  destroyEmitterAfter(scene, emitter, 900);
  return emitter;
}
