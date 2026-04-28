import Phaser from "phaser";

import { ElectricEffect } from "../effects/ElectricEffect";
import { FireEffect } from "../effects/FireEffect";
import { GhostEffect } from "../effects/GhostEffect";
import { BattleBackground } from "../objects/BattleBackground";
import { HPBar } from "../objects/HPBar";
import { PokemonSprite } from "../objects/PokemonSprite";

export class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  preload() {
    this.load.image("charmander", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png");
    this.load.image("gengar", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png");
  }

  create() {
    new BattleBackground(this);
    const player = new PokemonSprite(this, "charmander", 260, 410);
    const opponent = new PokemonSprite(this, "gengar", 640, 240, true);
    new HPBar(this, 92, 436, 280, 12, 1);
    new HPBar(this, 528, 266, 280, 12, 1);
    this.add.text(92, 404, "Charmander", { color: "#f4f4f5", fontSize: "16px" });
    this.add.text(528, 234, "Gengar", { color: "#f4f4f5", fontSize: "16px" });

    this.time.addEvent({
      delay: 1300,
      loop: true,
      callback: () => {
        FireEffect.play(this, 310, 330);
        GhostEffect.play(this, 610, 220);
        ElectricEffect.play(this, 450, 260);
        player.playHit();
        opponent.playHit();
      },
    });
  }
}
