import * as Phaser from "phaser";

import { destroyEmitterAfter, ensureParticleTexture } from "./particleTexture";

export function NormalEffect(scene: Phaser.Scene, x: number, y: number, direction = 1) {
  const emitter = scene.add.particles(x - 70 * direction, y, ensureParticleTexture(scene, "particle-normal", "streak"), {
    frequency: -1,
    quantity: 18,
    lifespan: { min: 210, max: 360 },
    speedX: { min: 360 * direction, max: 620 * direction },
    speedY: { min: -42, max: 42 },
    scaleX: { start: 0.9, end: 0.28 },
    scaleY: { start: 0.75, end: 0.16 },
    alpha: { start: 0.82, end: 0 },
    tint: [0xffffff, 0xd1d5db, 0x9ca3af],
    emitting: false,
  });

  emitter.explode(20, x - 70 * direction, y);
  destroyEmitterAfter(scene, emitter, 620);
  return emitter;
}
