import * as Phaser from "phaser";

import { destroyEmitterAfter, ensureParticleTexture } from "./particleTexture";

export function ElectricEffect(scene: Phaser.Scene, x: number, y: number) {
  const texture = ensureParticleTexture(scene, "particle-electric", "diamond");
  const points = [
    { x: x - 54, y: y - 42 },
    { x: x + 4, y: y - 14 },
    { x: x - 18, y: y + 8 },
    { x: x + 58, y: y + 42 },
  ];
  const emitters = points.map((point, index) => {
    const emitter = scene.add.particles(point.x, point.y, texture, {
      frequency: -1,
      quantity: 8,
      lifespan: { min: 130, max: 280 },
      speed: { min: 60, max: 170 },
      scale: { start: index % 2 === 0 ? 0.62 : 0.45, end: 0.05 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xfacc15, 0xfef08a],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.explode(10, point.x, point.y);
    destroyEmitterAfter(scene, emitter, 420);
    return emitter;
  });

  return emitters[0];
}
