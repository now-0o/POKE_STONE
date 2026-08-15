const FIELD_SLOT_COUNT = 6;
const BASE_WHITEOUT_TARGETS = 2;
const SNOW_WARNING_TARGETS = 3;
const WHITEOUT_BONUS_DAMAGE = 2;
const SLOT_PRIORITY = [2, 3, 1, 4, 0, 5];
const PREFERRED_SLOT_MAX_AGE_MS = 900;

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

export function isCandiceBattle(game) {
  return game?.trainer?.gimmick === "whiteout";
}

function hasCandiceAbomasnow(game) {
  return game.players.enemy.field.some(
    (unit) => unit.hp > 0 && unit.ability === "candice_snow_warning",
  );
}

function shuffled(values) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function isValidSlot(slot) {
  return Number.isInteger(slot) && slot >= 0 && slot < FIELD_SLOT_COUNT;
}

function consumePreferredPlayerSlot(used) {
  if (typeof window === "undefined") return null;

  const pending = window.__pokeCandicePreferredSlot;
  if (!pending) return null;

  delete window.__pokeCandicePreferredSlot;

  const slot = Number(pending.slot);
  const age = Date.now() - Number(pending.at || 0);

  if (
    !isValidSlot(slot) ||
    age < 0 ||
    age > PREFERRED_SLOT_MAX_AGE_MS ||
    used.has(slot)
  ) {
    return null;
  }

  return slot;
}

function activeWhiteoutSlots(game) {
  if (!isCandiceBattle(game)) return [];

  const slots = Array.isArray(game._candiceWhiteoutSlots)
    ? game._candiceWhiteoutSlots
    : [];

  return [...new Set(slots.filter(isValidSlot))];
}

function normalizeCandiceFieldSlots(game) {
  if (!isCandiceBattle(game)) return {};

  const player = game.players.player;
  const used = new Set();

  player._candiceFixedSlots = true;

  player.field.forEach((unit) => {
    const slot = Number(unit._candiceFieldSlot);

    if (!isValidSlot(slot) || used.has(slot)) {
      delete unit._candiceFieldSlot;
      return;
    }

    unit._candiceFieldSlot = slot;
    used.add(slot);
  });

  const unassigned = player.field.filter(
    (unit) => !isValidSlot(unit._candiceFieldSlot),
  );
  let preferredSlot =
    unassigned.length > 0 ? consumePreferredPlayerSlot(used) : null;

  unassigned.forEach((unit) => {
    const slot =
      preferredSlot ?? SLOT_PRIORITY.find((candidate) => !used.has(candidate));

    preferredSlot = null;
    if (slot == null) return;

    unit._candiceFieldSlot = slot;
    used.add(slot);
  });

  return Object.fromEntries(
    player.field
      .filter((unit) => isValidSlot(unit._candiceFieldSlot))
      .map((unit) => [unit.uid, unit._candiceFieldSlot]),
  );
}

function chooseRotatingWhiteoutSlots(game, targetCount) {
  const allSlots = Array.from({ length: FIELD_SLOT_COUNT }, (_, index) => index);
  const previous = new Set(activeWhiteoutSlots(game));
  const freshSlots = shuffled(allSlots.filter((slot) => !previous.has(slot)));
  const repeatedSlots = shuffled(allSlots.filter((slot) => previous.has(slot)));

  return [...freshSlots, ...repeatedSlots]
    .slice(0, Math.min(targetCount, FIELD_SLOT_COUNT))
    .sort((a, b) => a - b);
}

function applyWhiteoutFlags(game) {
  if (!isCandiceBattle(game)) return;

  const selectedSlots = new Set(activeWhiteoutSlots(game));
  normalizeCandiceFieldSlots(game);

  game.players.player.field.forEach((unit) => {
    const affected = selectedSlots.has(unit._candiceFieldSlot);
    unit._candiceWhiteout = affected;

    if (affected && game.turn === "player") {
      unit.canAttack = false;
    }
  });
}

export function syncCandiceVisual(game) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const active = isCandiceBattle(game);
  const unitSlots = active ? normalizeCandiceFieldSlots(game) : {};
  const slots = active ? activeWhiteoutSlots(game) : [];
  const selectedSlots = new Set(slots);
  const targets = Object.fromEntries(
    Object.entries(unitSlots)
      .filter(([, slot]) => selectedSlots.has(slot))
      .map(([uid]) => [uid, true]),
  );
  const boosted = active && hasCandiceAbomasnow(game);

  if (active) {
    applyWhiteoutFlags(game);
    document.body.dataset.candiceWhiteoutCount = String(slots.length);
    document.body.dataset.candiceWhiteoutSlots = slots.join(",");
    document.body.dataset.candiceSnowWarning = boosted ? "1" : "0";
  } else {
    delete document.body.dataset.candiceWhiteoutCount;
    delete document.body.dataset.candiceWhiteoutSlots;
    delete document.body.dataset.candiceSnowWarning;
  }

  window.__pokeCandiceWhiteout = targets;
  window.__pokeCandiceSlots = unitSlots;
  window.__pokeCandiceWhiteoutSlots = slots;
  window.dispatchEvent(
    new CustomEvent("candice-whiteout-change", {
      detail: {
        active,
        slots,
        unitSlots,
        uids: Object.keys(targets),
        boosted,
      },
    }),
  );
}

export function beginCandicePlayerTurn(game) {
  if (!isCandiceBattle(game) || game.winner || game.turn !== "player") {
    return false;
  }

  normalizeCandiceFieldSlots(game);

  const targetCount = hasCandiceAbomasnow(game)
    ? SNOW_WARNING_TARGETS
    : BASE_WHITEOUT_TARGETS;
  const selectedSlots = chooseRotatingWhiteoutSlots(game, targetCount);

  game._candiceWhiteoutSlots = selectedSlots;
  applyWhiteoutFlags(game);

  pushLog(
    game,
    `화이트아웃! 고정 필드 6칸 중 ${selectedSlots
      .map((slot) => slot + 1)
      .join(", ")}번 칸이 눈보라 지역이 됐다!`,
  );

  if (targetCount === SNOW_WARNING_TARGETS) {
    pushLog(
      game,
      "무청의 눈설왕이 눈퍼뜨리기를 유지해 화이트아웃 범위가 3칸으로 넓어졌다!",
    );
  }

  syncCandiceVisual(game);
  return true;
}

export function initCandiceBattle(game) {
  game._candiceWhiteoutSlots = [];

  if (!isCandiceBattle(game)) {
    syncCandiceVisual(game);
    return;
  }

  game.players.player._candiceFixedSlots = true;
  normalizeCandiceFieldSlots(game);

  game.players.player.field.forEach((unit) => {
    unit._candiceWhiteout = false;
  });

  if (game.turn === "player") {
    beginCandicePlayerTurn(game);
  } else {
    syncCandiceVisual(game);
  }
}

export function isCandiceWhiteoutUnit(game, side, unitUid) {
  if (!isCandiceBattle(game) || side !== "player") return false;

  normalizeCandiceFieldSlots(game);

  const unit = game.players.player.field.find((entry) => entry.uid === unitUid);
  if (!unit || !isValidSlot(unit._candiceFieldSlot)) return false;

  return activeWhiteoutSlots(game).includes(unit._candiceFieldSlot);
}

export function getCandiceWhiteoutAttackBonus(game, attacker, target) {
  if (!isCandiceBattle(game)) return 0;
  if (!attacker || attacker.side !== "enemy" || attacker.type !== "얼음") {
    return 0;
  }
  if (!target || target.side !== "player" || target.hp <= 0) return 0;

  return isCandiceWhiteoutUnit(game, "player", target.uid)
    ? WHITEOUT_BONUS_DAMAGE
    : 0;
}
