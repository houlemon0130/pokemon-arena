import * as Phaser from "phaser";

import { destroyEmitterAfter, ensureParticleTexture } from "./particleTexture";

export function LeafEffect(scene: Phaser.Scene, x: number, y: number) {
  const emitter = scene.add.particles(x, y - 80, ensureParticleTexture(scene, "particle-leaf", "leaf"), {
    frequency: 32,
    quantity: 2,
    lifespan: { min: 900, max: 1350 },
    speedX: { min: -70, max: 70 },
    speedY: { min: 55, max: 140 },
    accelerationX: { min: -35, max: 35 },
    rotate: { min: -220, max: 220 },
    scale: { start: 0.85, end: 0.22 },
    alpha: { start: 0.95, end: 0 },
    tint: [0xbbf7d0, 0x4ade80, 0x15803d],
    emitting: true,
  });

  emitter.stopAfter = 24;
  destroyEmitterAfter(scene, emitter, 1550);
  return emitter;
}

export const GrassEffect = LeafEffect;
