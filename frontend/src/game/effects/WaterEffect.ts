import * as Phaser from "phaser";

import { destroyEmitterAfter, ensureParticleTexture } from "./particleTexture";

export function WaterEffect(scene: Phaser.Scene, x: number, y: number, direction = 1) {
  const emitter = scene.add.particles(x, y, ensureParticleTexture(scene, "particle-water", "circle"), {
    frequency: -1,
    quantity: 26,
    lifespan: { min: 360, max: 620 },
    speedX: { min: 180 * direction, max: 410 * direction },
    speedY: { min: -95, max: 95 },
    gravityY: 260,
    scale: { start: 0.6, end: 0.12 },
    alpha: { start: 0.95, end: 0 },
    tint: [0x7dd3fc, 0x22d3ee, 0x2563eb],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });

  emitter.explode(30, x, y);
  destroyEmitterAfter(scene, emitter, 820);
  return emitter;
}
