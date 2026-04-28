import Phaser from "phaser";

import { ElectricEffect } from "../effects/ElectricEffect";
import { FireEffect } from "../effects/FireEffect";
import { GhostEffect } from "../effects/GhostEffect";
import { LeafEffect } from "../effects/GrassEffect";
import { NormalEffect } from "../effects/NormalEffect";
import { WaterEffect } from "../effects/WaterEffect";
import { BattleBackground } from "../objects/BattleBackground";
import { HPBar } from "../objects/HPBar";
import { PokemonSprite } from "../objects/PokemonSprite";
import type {
  BattleAnimationAction,
  BattleAnimationActor,
  BattlePokemon,
  BattleStateV2,
  TurnAnimation,
} from "@/lib/types";
import { useBattleStore } from "@/store/battleStore";

const PLAYER_POSITION = { x: 250, y: 430 };
const OPPONENT_POSITION = { x: 650, y: 255 };

type BattleSide = {
  sprite: PokemonSprite;
  hpBar: HPBar;
  nameText: Phaser.GameObjects.Text;
  previousDefId: string | null;
  previousHp: number | null;
};

export class BattleScene extends Phaser.Scene {
  private playerSide?: BattleSide;
  private opponentSide?: BattleSide;
  private unsubscribeStore?: () => void;
  private currentBattleState: BattleStateV2 | null = null;

  constructor() {
    super("BattleScene");
  }

  preload() {
    this.load.setCORS("anonymous");
  }

  create() {
    new BattleBackground(this);

    this.playerSide = this.createBattleSide("Charmander", "back", PLAYER_POSITION.x, PLAYER_POSITION.y, 92, 436);
    this.opponentSide = this.createBattleSide("Gengar", "front", OPPONENT_POSITION.x, OPPONENT_POSITION.y, 528, 266);

    const initialStore = useBattleStore.getState();
    this.syncBattleState(initialStore.battleState);
    if (initialStore.turnAnimation) {
      this.playTurnAnimation(initialStore.turnAnimation);
    }

    this.unsubscribeStore = useBattleStore.subscribe((state, previousState) => {
      if (state.battleState !== previousState.battleState) {
        this.syncBattleState(state.battleState);
      }
      if (state.turnAnimation && state.turnAnimation.id !== previousState.turnAnimation?.id) {
        this.playTurnAnimation(state.turnAnimation);
      }
    });

    this.events.once("shutdown", this.destroyScene, this);
    this.events.once("destroy", this.destroyScene, this);
  }

  private createBattleSide(
    name: string,
    side: "front" | "back",
    spriteX: number,
    spriteY: number,
    barX: number,
    barY: number,
  ): BattleSide {
    return {
      sprite: new PokemonSprite(this, name, spriteX, spriteY, side),
      hpBar: new HPBar(this, barX, barY, 280, 12, 1),
      nameText: this.add.text(barX, barY - 32, name, { color: "#f4f4f5", fontSize: "16px" }),
      previousDefId: null,
      previousHp: null,
    };
  }

  private syncBattleState(battleState: BattleStateV2 | null) {
    this.currentBattleState = battleState;
    this.syncSide(this.playerSide, battleState?.player_team?.active, "back");
    this.syncSide(this.opponentSide, battleState?.opponent_team?.active, "front");
  }

  private syncSide(
    side: BattleSide | undefined,
    pokemon: BattlePokemon | undefined,
    spriteSide: "front" | "back",
  ) {
    if (!side || !pokemon) {
      return;
    }

    const hpValue = pokemon.max_hp > 0 ? pokemon.current_hp / pokemon.max_hp : 0;
    side.sprite.setPokemon(pokemon.name, spriteSide);
    side.hpBar.setValue(hpValue);
    side.nameText.setText(pokemon.name);

    if (side.previousDefId && side.previousDefId !== pokemon.def_id) {
      side.sprite.onAppear();
    }
    if (side.previousHp !== null && side.previousHp > 0 && pokemon.current_hp <= 0) {
      this.time.delayedCall(480, () => side.sprite.onFaint());
    }
    if (side.previousHp !== null && side.previousHp <= 0 && pokemon.current_hp > 0) {
      side.sprite.onAppear();
    }

    side.previousDefId = pokemon.def_id;
    side.previousHp = pokemon.current_hp;
  }

  private playTurnAnimation(animation: TurnAnimation) {
    const delay = animation.timing?.delay_ms ?? 520;
    animation.actions.forEach((action, index) => {
      this.time.delayedCall(index * delay, () => this.playActionEffect(action));
    });
  }

  private playActionEffect(action: BattleAnimationAction) {
    const actor = action.actor;
    const target = action.target ?? (actor === "player" ? "opponent" : "player");
    const sourcePoint = this.positionFor(actor);
    const targetPoint = this.positionFor(target);
    const direction = actor === "player" ? 1 : -1;
    const moveType = this.resolveMoveType(action).toLowerCase();

    if (moveType === "fire") {
      FireEffect(this, targetPoint.x, targetPoint.y - 86);
    } else if (moveType === "water") {
      WaterEffect(this, sourcePoint.x + 56 * direction, sourcePoint.y - 96, direction);
    } else if (moveType === "grass" || moveType === "leaf") {
      LeafEffect(this, targetPoint.x, targetPoint.y - 22);
    } else if (moveType === "electric") {
      ElectricEffect(this, targetPoint.x, targetPoint.y - 104);
    } else if (moveType === "ghost") {
      GhostEffect(this, targetPoint.x, targetPoint.y - 96);
    } else {
      NormalEffect(this, targetPoint.x, targetPoint.y - 84, direction);
    }

    this.time.delayedCall(160, () => this.sideFor(target)?.sprite.onHit());
  }

  private resolveMoveType(action: BattleAnimationAction) {
    if (action.move_type) {
      return action.move_type;
    }

    const pokemon =
      action.actor === "player"
        ? this.currentBattleState?.player_team?.active
        : this.currentBattleState?.opponent_team?.active;
    const moveName = action.move_name?.trim().toLowerCase();
    const move = moveName
      ? pokemon?.moves.find((candidate) => {
          return candidate.name.toLowerCase() === moveName || candidate.id.toLowerCase() === moveName;
        })
      : undefined;

    return move?.type ?? "normal";
  }

  private sideFor(actor: BattleAnimationActor) {
    return actor === "player" ? this.playerSide : this.opponentSide;
  }

  private positionFor(actor: BattleAnimationActor) {
    return actor === "player" ? PLAYER_POSITION : OPPONENT_POSITION;
  }

  private destroyScene() {
    this.unsubscribeStore?.();
    this.unsubscribeStore = undefined;
  }
}
