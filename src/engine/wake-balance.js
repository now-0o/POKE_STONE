import * as core from "./cynthia/balance.js";

export * from "./cynthia/balance.js";

const WAKE_GIMMICK = "rising_tide";
const FIELD_SLOT_COUNT = 6;
const FLOOD_TURNS = [4, 8, 12, 16];
// 바깥쪽부터 좌우로 잠겨 최종적으로 중앙 2칸만 남는다.
const FLOOD_ORDER = [0, 5, 1, 4];
const SLOT_PRIORITY = [2, 3, 1, 4, 0, 5];

function isWakeBattle(game) {
  return game?.trainer?.gimmick === WAKE_GIMMICK;
}

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

function isValidSlot(slot) {
  return Number.isInteger(slot) && slot >= 0 && slot < FIELD_SLOT_COUNT;
}

function floodCount(game) {
  return isWakeBattle(game)
    ? Math.max(0, Math.min(FLOOD_ORDER.length, Number(game._wakeFixedFloodCount) || 0))
    : 0;
}

function floodedSlots(game) {
  return FLOOD_ORDER.slice(0, floodCount(game));
}

function applyWakeCapacity(game) {
  if (!isWakeBattle(game)) return;
  game.players.player.fieldCapacity = FIELD_SLOT_COUNT - floodCount(game);
}

function normalizeWakeSlots(game) {
  if (!isWakeBattle(game)) return {};

  const player = game.players.player;
  const blocked = new Set(floodedSlots(game));
  const used = new Set();

  player._wakeFixedSlots = true;

  player.field.forEach((unit) => {
    const slot = Number(unit._wakeFieldSlot);
    if (!isValidSlot(slot) || blocked.has(slot) || used.has(slot)) {
      delete unit._wakeFieldSlot;
      return;
    }

    unit._wakeFieldSlot = slot;
    used.add(slot);
  });

  player.field
    .filter((unit) => !isValidSlot(unit._wakeFieldSlot))
    .forEach((unit) => {
      const slot = SLOT_PRIORITY.find(
        (candidate) => !blocked.has(candidate) && !used.has(candidate),
      );

      if (slot == null) return;
      unit._wakeFieldSlot = slot;
      used.add(slot);
    });

  return Object.fromEntries(
    player.field
      .filter((unit) => isValidSlot(unit._wakeFieldSlot))
      .map((unit) => [unit.uid, unit._wakeFieldSlot]),
  );
}

function syncWakeVisual(game) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const active = isWakeBattle(game);
  const count = active ? floodCount(game) : 0;
  const slots = active ? floodedSlots(game) : [];
  const unitSlots = active ? normalizeWakeSlots(game) : {};

  if (active) {
    document.body.dataset.wakeFlood = String(count);
    document.body.dataset.wakeFloodSlots = slots.join(",");
  } else {
    delete document.body.dataset.wakeFlood;
    delete document.body.dataset.wakeFloodSlots;
  }

  window.__pokeWakeSlots = unitSlots;
  window.__pokeWakeFloodSlots = slots;
  window.dispatchEvent(
    new CustomEvent("wake-flood-change", {
      detail: {
        active,
        count,
        slots,
        unitSlots,
        playerTurns: active ? game._wakeFixedPlayerTurns || 0 : 0,
      },
    }),
  );
}

function disableLegacyWakeCounter(game) {
  if (!isWakeBattle(game)) return;
  // 기존 sinnoh/index.js의 3/6턴 capacity 축소 로직을 발동하지 않게 한다.
  game._wakePlayerTurns = -100000;
}

function desiredFloodCount(playerTurns) {
  return FLOOD_TURNS.reduce(
    (count, turn) => count + (playerTurns >= turn ? 1 : 0),
    0,
  );
}

function floodNextSlot(game) {
  const current = floodCount(game);
  if (current >= FLOOD_ORDER.length) return false;

  // 새로 잠길 칸을 결정하기 전에 현재 포켓몬 위치를 확정한다.
  normalizeWakeSlots(game);

  const slot = FLOOD_ORDER[current];
  const victim = game.players.player.field.find(
    (unit) => Number(unit._wakeFieldSlot) === slot,
  );

  game._wakeFixedFloodCount = current + 1;
  applyWakeCapacity(game);

  pushLog(
    game,
    `들판체육관 수위 상승! ${slot + 1}번 필드가 수몰됐다.`,
  );

  if (victim) {
    const name = victim.name || "포켓몬";
    victim.hp = 0;
    pushLog(game, `수몰된 ${slot + 1}번 칸의 ${name}이(가) 기절했다!`);
    core.cleanupDeaths(game, true);
  }

  normalizeWakeSlots(game);
  syncWakeVisual(game);
  return true;
}

function applyWakeTurnMilestones(game) {
  if (!isWakeBattle(game)) return;

  const turns = Math.max(0, Number(game._wakeFixedPlayerTurns) || 0);
  const desired = desiredFloodCount(turns);

  while (floodCount(game) < desired && !game.winner) {
    floodNextSlot(game);
  }

  applyWakeCapacity(game);
  normalizeWakeSlots(game);
  syncWakeVisual(game);
}

export function createGame(playerDeckIds, trainer) {
  const game = core.createGame(playerDeckIds, trainer);

  if (!isWakeBattle(game)) {
    syncWakeVisual(game);
    return game;
  }

  disableLegacyWakeCounter(game);
  game._wakeFixedPlayerTurns = game.turn === "player" ? 1 : 0;
  game._wakeFixedFloodCount = 0;
  game.players.player.fieldCapacity = FIELD_SLOT_COUNT;
  normalizeWakeSlots(game);
  syncWakeVisual(game);
  return game;
}

export function canPlayCard(game, side, handIdx) {
  if (isWakeBattle(game) && side === "player") {
    applyWakeCapacity(game);
    normalizeWakeSlots(game);
  }

  return core.canPlayCard(game, side, handIdx);
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  if (isWakeBattle(game)) {
    disableLegacyWakeCounter(game);
    applyWakeCapacity(game);
  }

  const result = core.playCard(game, side, handIdx, target, fieldIndex);

  if (isWakeBattle(game)) {
    disableLegacyWakeCounter(game);
    applyWakeCapacity(game);
    normalizeWakeSlots(game);
    syncWakeVisual(game);
  }

  return result;
}

export function attack(game, side, attackerUid, target) {
  const result = core.attack(game, side, attackerUid, target);
  if (isWakeBattle(game)) syncWakeVisual(game);
  return result;
}

export function attackFieldObstacle(game, side, attackerUid, obstacleId) {
  const result = core.attackFieldObstacle(game, side, attackerUid, obstacleId);
  if (isWakeBattle(game)) syncWakeVisual(game);
  return result;
}

export function endTurn(game) {
  const endingSide = game.turn;

  if (isWakeBattle(game)) disableLegacyWakeCounter(game);

  const result = core.endTurn(game);

  if (!isWakeBattle(game)) return result;

  disableLegacyWakeCounter(game);

  if (!game.winner && endingSide === "enemy" && game.turn === "player") {
    game._wakeFixedPlayerTurns = (game._wakeFixedPlayerTurns || 0) + 1;
    applyWakeTurnMilestones(game);
  } else {
    applyWakeCapacity(game);
    normalizeWakeSlots(game);
    syncWakeVisual(game);
  }

  return result;
}

export function cleanupDeaths(game, ...args) {
  const result = core.cleanupDeaths(game, ...args);

  if (isWakeBattle(game)) {
    applyWakeCapacity(game);
    normalizeWakeSlots(game);
    syncWakeVisual(game);
  }

  return result;
}
