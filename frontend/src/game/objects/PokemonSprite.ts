import Phaser from "phaser";

type PokemonSpriteSide = "front" | "back";

const BASE_SCALE = 2.3;
const MAX_WIDTH = 220;
const MAX_HEIGHT = 190;

const SHOWDOWN_NAME_OVERRIDES: Record<string, string> = {
  "mr. mime": "mrmime",
  "mr mime": "mrmime",
  "mime jr.": "mimejr",
  "mime jr": "mimejr",
  "nidoran♀": "nidoranf",
  "nidoran female": "nidoranf",
  "nidoran♂": "nidoranm",
  "nidoran male": "nidoranm",
  "farfetch'd": "farfetchd",
  "sirfetch'd": "sirfetchd",
  "ho-oh": "hooh",
};

function toShowdownSpriteId(name: string) {
  const normalized = name.trim().toLowerCase();
  return SHOWDOWN_NAME_OVERRIDES[normalized] ?? normalized.replace(/[^a-z0-9]/g, "");
}

function textureKey(name: string, side: PokemonSpriteSide) {
  return `pokemon-${side}-${toShowdownSpriteId(name)}`;
}

function spriteUrl(name: string, side: PokemonSpriteSide) {
  const directory = side === "back" ? "ani-back" : "ani";
  return `https://play.pokemonshowdown.com/sprites/${directory}/${toShowdownSpriteId(name)}.gif`;
}

export class PokemonSprite {
  readonly sprite: Phaser.GameObjects.Image;

  private pokemonName = "";
  private side: PokemonSpriteSide;
  private readonly baseY: number;

  constructor(
    private readonly scene: Phaser.Scene,
    pokemonName: string,
    x: number,
    y: number,
    side: PokemonSpriteSide,
  ) {
    this.side = side;
    this.baseY = y;
    this.sprite = scene.add.image(x, y, "__DEFAULT");
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setVisible(false);
    this.setPokemon(pokemonName, side);
  }

  setPokemon(pokemonName: string, side = this.side) {
    if (this.pokemonName === pokemonName && this.side === side) {
      return;
    }

    this.pokemonName = pokemonName;
    this.side = side;
    const key = textureKey(pokemonName, side);

    if (this.scene.textures.exists(key)) {
      this.applyTexture(key);
      this.onAppear();
      return;
    }

    this.sprite.setVisible(false);
    this.scene.load.setCORS("anonymous");
    this.scene.load.image(key, spriteUrl(pokemonName, side));
    this.scene.load.once(`filecomplete-image-${key}`, () => {
      if (this.sprite.scene && this.pokemonName === pokemonName && this.side === side) {
        this.applyTexture(key);
        this.onAppear();
      }
    });

    if (!this.scene.load.isLoading()) {
      this.scene.load.start();
    }
  }

  onHit() {
    if (!this.sprite.visible) {
      return;
    }

    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAlpha(1);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.28,
      yoyo: true,
      repeat: 3,
      duration: 70,
      onComplete: () => this.sprite.setAlpha(1),
    });
  }

  onFaint() {
    if (!this.sprite.visible) {
      return;
    }

    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.baseY + 54,
      alpha: 0,
      duration: 520,
      ease: "Quad.easeIn",
      onComplete: () => this.sprite.setVisible(false),
    });
  }

  onAppear() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setVisible(true);
    this.sprite.setY(this.baseY + 24);
    this.sprite.setAlpha(0);
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.baseY,
      alpha: 1,
      duration: 360,
      ease: "Sine.easeOut",
    });
  }

  private applyTexture(key: string) {
    this.sprite.setTexture(key);
    const scale = Math.min(BASE_SCALE, MAX_WIDTH / this.sprite.width, MAX_HEIGHT / this.sprite.height);
    this.sprite.setScale(scale);
  }
}
