import Phaser from "phaser";

import { destroyEmitterAfter, ensureParticleTexture } from "./particleTexture";

export function GhostEffect(scene: Phaser.Scene, x: number, y: number) {
  const emitter = scene.add.particles(x, y, ensureParticleTexture(scene, "particle-ghost", "circle"), {
    frequency: 48,
    quantity: 2,
    lifespan: { min: 1100, max: 1650 },
    speedX: { min: -38, max: 38 },
    speedY: { min: -45, max: 22 },
    scale: { start: 0.75, end: 1.8 },
    alpha: { start: 0.45, end: 0 },
    tint: [0xc4b5fd, 0x8b5cf6, 0x581c87],
    blendMode: Phaser.BlendModes.ADD,
    emitting: true,
  });

  emitter.stopAfter = 24;
  destroyEmitterAfter(scene, emitter, 1900);
  return emitter;
}
