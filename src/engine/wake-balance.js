import * as core from "./cynthia/balance.js";
import { CARD_MAP } from "../data/cards.js";

export * from "./cynthia/balance.js";

const WAKE_GIMMICK = "rising_tide";
const CANDICE_GIMMICK = "whiteout";
const FIELD_SLOT_COUNT = 6;
const FIXED_DROP_MAX_AGE_MS = 1200;
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

function isBasicPokemon(card) {
  return card?.kind === "pokemon" && !card.evolvesFrom;
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
  const count = floodCount(game);
  game._wakeFloodLevel = count;
  game.players.player.fieldCapacity = FIELD_SLOT_COUNT - count;
}

function consumePreferredWakeSlot(blocked, used) {
  if (typeof window === "undefined") return null;

  const pending = window.__pokeWakePreferredSlot;
  if (!pending) return null;
  delete window.__pokeWakePreferredSlot;

  const slot = Number(pending.slot);
  const age = Date.now() - Number(pending.at || 0);

  if (
    !isValidSlot(slot) ||
    age < 0 ||
    age > FIXED_DROP_MAX_AGE_MS ||
    blocked.has(slot) ||
    used.has(slot)
  ) {
    return null;
  }

  return slot;
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

  const unassigned = player.field.filter(
    (unit) => !isValidSlot(unit._wakeFieldSlot),
  );
  let preferredSlot =
    unassigned.length > 0 ? consumePreferredWakeSlot(blocked, used) : null;

  unassigned.forEach((unit) => {
    const slot =
      preferredSlot ??
      SLOT_PRIORITY.find(
        (candidate) => !blocked.has(candidate) && !used.has(candidate),
      );

    preferredSlot = null;
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

    // 수몰은 공격/기술 연출을 기다리는 피해가 아니다.
    // 즉시 사망 처리를 확정해 기절한 포켓몬이 다른 빈 슬롯으로 재배치되는 프레임을 막는다.
    core.cleanupDeaths(game);
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

function occupiedCandiceSlot(game, slot) {
  return game.players.player.field.some(
    (unit) => Number(unit._candiceFieldSlot) === slot,
  );
}

function occupiedWakeSlot(game, slot) {
  return game.players.player.field.some(
    (unit) => Number(unit._wakeFieldSlot) === slot,
  );
}

function consumeFixedFieldDrop(game, side, card) {
  if (typeof window === "undefined") {
    return { requested: false, valid: true, gimmick: null };
  }

  const pending = window.__pokeFixedFieldPreferredDrop;
  if (!pending) {
    return { requested: false, valid: true, gimmick: null };
  }

  delete window.__pokeFixedFieldPreferredDrop;

  if (side !== "player" || !isBasicPokemon(card)) {
    return { requested: false, valid: true, gimmick: null };
  }

  const gimmick = game?.trainer?.gimmick || null;
  const slot = Number(pending.slot);
  const age = Date.now() - Number(pending.at || 0);

  if (
    pending.gimmick !== gimmick ||
    ![CANDICE_GIMMICK, WAKE_GIMMICK].includes(gimmick) ||
    !isValidSlot(slot) ||
    age < 0 ||
    age > FIXED_DROP_MAX_AGE_MS
  ) {
    return { requested: false, valid: true, gimmick: null };
  }

  if (gimmick === CANDICE_GIMMICK) {
    if (occupiedCandiceSlot(game, slot)) {
      return { requested: true, valid: false, gimmick };
    }

    window.__pokeCandicePreferredSlot = { slot, at: Date.now() };
    return { requested: true, valid: true, gimmick };
  }

  const blocked = new Set(floodedSlots(game));
  if (blocked.has(slot) || occupiedWakeSlot(game, slot)) {
    return { requested: true, valid: false, gimmick };
  }

  window.__pokeWakePreferredSlot = { slot, at: Date.now() };
  return { requested: true, valid: true, gimmick };
}

function clearFixedFieldPreferredSlot(gimmick) {
  if (typeof window === "undefined") return;

  if (gimmick === CANDICE_GIMMICK) {
    delete window.__pokeCandicePreferredSlot;
  } else if (gimmick === WAKE_GIMMICK) {
    delete window.__pokeWakePreferredSlot;
  }
}

// cynthia 계열 래퍼가 세 번째 createGame 인자를 버리는 구버전 세이브/엔진 경로에서도
// 최종 진입점에서 덱의 이로치 수를 다시 확정한다. 카드 ID가 같은 일반/이로치 복사본은
// 덱 배열에서는 동일하므로, 시작 손패에 먼저 배정하고 나머지를 이후 드로우용 카운터로 둔다.
function restorePlayerShinyDeck(game, playerDeckShiny) {
  const player = game?.players?.player;
  if (!player) return;

  const available = {};
  for (const entry of [...(player.hand || []), ...(player.deck || [])]) {
    const cardId = typeof entry === "string" ? entry : entry?.cardId;
    if (!cardId || CARD_MAP[cardId]?.kind !== "pokemon") continue;
    available[cardId] = (available[cardId] || 0) + 1;
  }

  const remaining = {};
  for (const [cardId, rawCount] of Object.entries(playerDeckShiny || {})) {
    if (CARD_MAP[cardId]?.kind !== "pokemon") continue;
    const count = Math.max(
      0,
      Math.min(available[cardId] || 0, Math.floor(Number(rawCount) || 0)),
    );
    if (count > 0) remaining[cardId] = count;
  }

  for (const handCard of player.hand || []) {
    if (CARD_MAP[handCard?.cardId]?.kind !== "pokemon") continue;
    handCard.shiny = false;
    const count = remaining[handCard.cardId] || 0;
    if (count <= 0) continue;
    handCard.shiny = true;
    if (count === 1) delete remaining[handCard.cardId];
    else remaining[handCard.cardId] = count - 1;
  }

  player._shinyDeckRemaining = { ...remaining };
}

export function createGame(playerDeckIds, trainer, playerDeckShiny = null) {
  // 하위 래퍼가 아직 3번째 인자를 받지 않는 경우가 있어도, 최종 생성 후 복원한다.
  const game = core.createGame(playerDeckIds, trainer, playerDeckShiny);
  restorePlayerShinyDeck(game, playerDeckShiny);

  if (!isWakeBattle(game)) {
    syncWakeVisual(game);
    return game;
  }

  disableLegacyWakeCounter(game);
  game._wakeFixedPlayerTurns = game.turn === "player" ? 1 : 0;
  game._wakeFixedFloodCount = 0;
  applyWakeCapacity(game);
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

  const handCard = game.players[side]?.hand?.[handIdx] || null;
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  const fixedDrop = consumeFixedFieldDrop(game, side, card);

  if (fixedDrop.requested && !fixedDrop.valid) {
    clearFixedFieldPreferredSlot(fixedDrop.gimmick);
    return false;
  }

  const result = core.playCard(game, side, handIdx, target, fieldIndex);

  if (!result) {
    clearFixedFieldPreferredSlot(fixedDrop.gimmick);
  }

  if (isWakeBattle(game)) {
    disableLegacyWakeCounter(game);
    applyWakeCapacity(game);
    normalizeWakeSlots(game);
    syncWakeVisual(game);
  }

  clearFixedFieldPreferredSlot(fixedDrop.gimmick);
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
