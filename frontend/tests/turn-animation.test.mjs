import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  module._compile(output, filename);
};

const {
  deriveTurnAnimation,
  normalizeTurnAnimation,
} = require("../src/hooks/battleAnimation.ts");

const move = (id, name, type, priority = 0) => ({
  id,
  name,
  type,
  priority,
  category: "physical",
  power: 40,
  accuracy: 100,
  pp: 30,
});

const battleState = {
  battle_id: "battle-1",
  current_turn: 1,
  player_team: {
    active: {
      def_id: "charmander",
      name: "小火龙",
      types: ["fire"],
      stats: { hp: 120, attack: 52, defense: 43, sp_attack: 60, sp_defense: 50, speed: 65 },
      moves: [move("tackle", "撞击", "normal")],
      current_hp: 120,
      max_hp: 120,
    },
    bench: [],
  },
  opponent_team: {
    active: {
      def_id: "gengar",
      name: "耿鬼",
      types: ["ghost"],
      stats: { hp: 120, attack: 65, defense: 60, sp_attack: 130, sp_defense: 75, speed: 110 },
      moves: [move("shadow-ball", "暗影球", "ghost")],
      current_hp: 120,
      max_hp: 120,
    },
    bench: [],
  },
};

test("normalizeTurnAnimation orders actions by used-move events", () => {
  const animation = normalizeTurnAnimation(
    {
      actions: [
        { actor: "player", move_name: "撞击" },
        { actor: "opponent", move_name: "暗影球" },
      ],
      events: ["耿鬼 used 暗影球.", "暗影球 dealt 30 damage.", "小火龙 used 撞击."],
    },
    battleState,
  );

  assert.deepEqual(animation?.actions.map((action) => action.actor), ["opponent", "player"]);
});

test("deriveTurnAnimation skips a pokemon fainted before it can move", () => {
  const animation = deriveTurnAnimation(battleState, {
    turn: 2,
    player_move: "撞击",
    agent_move: "暗影球",
    player_damage: 0,
    agent_damage: 120,
    events: ["耿鬼 used 暗影球.", "暗影球 dealt 120 damage.", "小火龙 fainted."],
    hp_after: { charmander: 0, gengar: 120 },
  });

  assert.deepEqual(animation.actions.map((action) => action.actor), ["opponent"]);
});
