import type {
  BattleAnimationAction,
  BattleAnimationActor,
  BattlePokemon,
  BattleStateV2,
  BattleTeam,
  TurnAnimation,
  TurnResult,
} from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

type AnimationContext = {
  battleState: BattleStateV2 | null;
  events?: string[];
  hpAfter?: Record<string, number>;
  turnOrder?: BattleAnimationActor[];
};

function normalizeActor(value: unknown): BattleAnimationActor | null {
  const normalized = typeof value === "string" ? value.toLowerCase() : value;
  if (normalized === "player") {
    return "player";
  }
  if (normalized === "opponent" || normalized === "agent" || normalized === "enemy") {
    return "opponent";
  }
  return null;
}

function readString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function readNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return undefined;
}

function readBoolean(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

function readEvents(record: UnknownRecord) {
  const value = record.events;
  return Array.isArray(value) ? value.filter((event): event is string => typeof event === "string") : undefined;
}

function readHpAfter(record: UnknownRecord) {
  const value = record.hp_after ?? record.hpAfter;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value as UnknownRecord).flatMap(([key, hp]) => (typeof hp === "number" ? [[key, hp]] : [])),
  );
}

function readTurnOrder(record: UnknownRecord) {
  const value = record.turn_order ?? record.turnOrder ?? record.order;
  if (!Array.isArray(value)) {
    return undefined;
  }

  const actors = value.flatMap((entry): BattleAnimationActor[] => {
    if (typeof entry === "string") {
      const actor = normalizeActor(entry);
      return actor ? [actor] : [];
    }
    if (entry && typeof entry === "object") {
      const raw = entry as UnknownRecord;
      const actor = normalizeActor(raw.actor ?? raw.side ?? raw.source ?? raw.from);
      return actor ? [actor] : [];
    }
    return [];
  });

  return actors.length > 0 ? actors : undefined;
}

function applyHpToPokemon(pokemon: BattlePokemon, hpAfter: Record<string, number>) {
  const currentHp = hpAfter[pokemon.def_id];
  if (currentHp === undefined) {
    return pokemon;
  }
  return { ...pokemon, current_hp: currentHp };
}

function applyHpToTeam(team: BattleTeam | undefined, hpAfter: Record<string, number>) {
  if (!team) {
    return team;
  }
  return {
    ...team,
    active: applyHpToPokemon(team.active, hpAfter),
    bench: team.bench.map((pokemon) => applyHpToPokemon(pokemon, hpAfter)),
  };
}

function activePokemonForActor(battleState: BattleStateV2 | null, actor: BattleAnimationActor) {
  return actor === "player" ? battleState?.player_team?.active : battleState?.opponent_team?.active;
}

function moveTypeForName(pokemon: BattlePokemon | undefined, moveName: string) {
  const normalized = moveName.trim().toLowerCase();
  return pokemon?.moves.find((move) => {
    return move.name.toLowerCase() === normalized || move.id.toLowerCase() === normalized;
  })?.type;
}

function movePriorityForAction(battleState: BattleStateV2 | null, action: BattleAnimationAction) {
  const pokemon = activePokemonForActor(battleState, action.actor);
  const moveName = action.move_name?.trim().toLowerCase();
  if (!pokemon || !moveName) {
    return 0;
  }

  return (
    pokemon.moves.find((move) => move.name.toLowerCase() === moveName || move.id.toLowerCase() === moveName)
      ?.priority ?? 0
  );
}

function effectiveSpeed(pokemon: BattlePokemon | undefined) {
  if (!pokemon) {
    return 0;
  }
  return pokemon.status === "paralysis" ? Math.floor(pokemon.stats.speed / 2) : pokemon.stats.speed;
}

function actorForUsedMoveEvent(event: string, battleState: BattleStateV2 | null) {
  const player = battleState?.player_team?.active;
  const opponent = battleState?.opponent_team?.active;
  if (player && event.startsWith(`${player.name} used `)) {
    return "player";
  }
  if (opponent && event.startsWith(`${opponent.name} used `)) {
    return "opponent";
  }
  return null;
}

function actorForFaintEvent(event: string, battleState: BattleStateV2 | null) {
  const player = battleState?.player_team?.active;
  const opponent = battleState?.opponent_team?.active;
  if (player && event.startsWith(`${player.name} fainted`)) {
    return "player";
  }
  if (opponent && event.startsWith(`${opponent.name} fainted`)) {
    return "opponent";
  }
  return null;
}

function eventActorState(events: string[] | undefined, battleState: BattleStateV2 | null) {
  const usedActors = new Set<BattleAnimationActor>();
  const faintedBeforeMove = new Set<BattleAnimationActor>();

  events?.forEach((event) => {
    const usedActor = actorForUsedMoveEvent(event, battleState);
    if (usedActor) {
      usedActors.add(usedActor);
      return;
    }

    const faintedActor = actorForFaintEvent(event, battleState);
    if (faintedActor && !usedActors.has(faintedActor)) {
      faintedBeforeMove.add(faintedActor);
    }
  });

  return { usedActors, faintedBeforeMove };
}

function orderActionsByActors(actions: BattleAnimationAction[], actors: BattleAnimationActor[]) {
  const remaining = [...actions];
  const ordered: BattleAnimationAction[] = [];

  actors.forEach((actor) => {
    const index = remaining.findIndex((action) => action.actor === actor);
    if (index >= 0) {
      ordered.push(remaining.splice(index, 1)[0]);
    }
  });

  return [...ordered, ...remaining];
}

function orderActionsByBattleRules(actions: BattleAnimationAction[], battleState: BattleStateV2 | null) {
  return [...actions].sort((left, right) => {
    const leftPokemon = activePokemonForActor(battleState, left.actor);
    const rightPokemon = activePokemonForActor(battleState, right.actor);
    const leftRank = [movePriorityForAction(battleState, left), effectiveSpeed(leftPokemon)] as const;
    const rightRank = [movePriorityForAction(battleState, right), effectiveSpeed(rightPokemon)] as const;

    if (leftRank[0] !== rightRank[0]) {
      return rightRank[0] - leftRank[0];
    }
    if (leftRank[1] !== rightRank[1]) {
      return rightRank[1] - leftRank[1];
    }
    return left.actor === "player" ? -1 : 1;
  });
}

function orderActions(actions: BattleAnimationAction[], context: AnimationContext) {
  const eventActors = context.events
    ?.map((event) => actorForUsedMoveEvent(event, context.battleState))
    .filter((actor): actor is BattleAnimationActor => actor !== null);

  if (eventActors && eventActors.length > 0) {
    return orderActionsByActors(actions, eventActors);
  }
  if (context.turnOrder && context.turnOrder.length > 0) {
    return orderActionsByActors(actions, context.turnOrder);
  }
  return orderActionsByBattleRules(actions, context.battleState);
}

function filterUnableActors(actions: BattleAnimationAction[], context: AnimationContext) {
  const { usedActors, faintedBeforeMove } = eventActorState(context.events, context.battleState);
  return actions.filter((action) => {
    const pokemon = activePokemonForActor(context.battleState, action.actor);
    if (pokemon && pokemon.current_hp <= 0) {
      return false;
    }
    if (faintedBeforeMove.has(action.actor)) {
      return false;
    }
    if (usedActors.size > 0 && !usedActors.has(action.actor)) {
      const hpAfter = pokemon ? context.hpAfter?.[pokemon.def_id] : undefined;
      if (hpAfter !== undefined && hpAfter <= 0) {
        return false;
      }
    }
    return true;
  });
}

function normalizeActions(actions: BattleAnimationAction[], context: AnimationContext) {
  return filterUnableActors(orderActions(actions, context), context);
}

function actionCanMove(record: UnknownRecord) {
  if (readBoolean(record, ["skipped", "skip", "fainted"]) === true) {
    return false;
  }
  if (readBoolean(record, ["can_move", "canMove"]) === false) {
    return false;
  }
  return true;
}

export function deriveTurnAnimation(battleState: BattleStateV2 | null, result: TurnResult): TurnAnimation {
  const player = battleState?.player_team?.active;
  const opponent = battleState?.opponent_team?.active;
  const actions = normalizeActions(
    [
      {
        actor: "player",
        target: "opponent",
        move_name: result.player_move,
        move_type: moveTypeForName(player, result.player_move),
      },
      {
        actor: "opponent",
        target: "player",
        move_name: result.agent_move,
        move_type: moveTypeForName(opponent, result.agent_move),
      },
    ],
    { battleState, events: result.events, hpAfter: result.hp_after },
  );

  return {
    id: `turn-result-${result.turn}-${Date.now()}`,
    actions,
    timing: { delay_ms: 520 },
  };
}

export function normalizeTurnAnimation(
  data: unknown,
  battleState: BattleStateV2 | null = null,
): TurnAnimation | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as UnknownRecord;
  const rawActions = Array.isArray(record.actions) ? record.actions : record.action ? [record.action] : [];
  const actions = rawActions.flatMap((rawAction): BattleAnimationAction[] => {
    if (!rawAction || typeof rawAction !== "object") {
      return [];
    }

    const action = rawAction as UnknownRecord;
    if (!actionCanMove(action)) {
      return [];
    }

    const actor = normalizeActor(action.actor ?? action.source ?? action.from);
    if (!actor) {
      return [];
    }

    return [
      {
        actor,
        target: normalizeActor(action.target ?? action.to) ?? (actor === "player" ? "opponent" : "player"),
        move_name: readString(action, ["move_name", "moveName", "move", "name"]),
        move_type: readString(action, ["move_type", "moveType", "type", "element"]),
      },
    ];
  });

  if (actions.length === 0) {
    return null;
  }

  const timing = record.timing && typeof record.timing === "object" ? (record.timing as UnknownRecord) : {};
  const delay = readNumber(timing, ["delay_ms", "delayMs", "delayBetweenActions"]);

  return {
    id: readString(record, ["id"]) ?? `turn-animation-${Date.now()}`,
    actions: normalizeActions(actions, {
      battleState,
      events: readEvents(record),
      hpAfter: readHpAfter(record),
      turnOrder: readTurnOrder(record),
    }),
    timing: delay === undefined ? undefined : { delay_ms: delay },
  };
}

export function applyTurnResultToBattleState(
  battleState: BattleStateV2 | null,
  result: TurnResult,
): BattleStateV2 | null {
  if (!battleState) {
    return battleState;
  }
  return {
    ...battleState,
    current_turn: result.turn,
    history: [...(battleState.history ?? []), result],
    player_team: applyHpToTeam(battleState.player_team, result.hp_after),
    opponent_team: applyHpToTeam(battleState.opponent_team, result.hp_after),
  };
}
