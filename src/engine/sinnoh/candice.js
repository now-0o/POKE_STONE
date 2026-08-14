const BASE_WHITEOUT_TARGETS = 2;
const SNOW_WARNING_TARGETS = 3;
const WHITEOUT_BONUS_DAMAGE = 2;

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

function activeWhiteoutUids(game) {
  if (!isCandiceBattle(game)) return [];

  const alive = new Set(
    game.players.player.field
      .filter((unit) => unit.hp > 0)
      .map((unit) => unit.uid),
  );

  const current = Array.isArray(game._candiceWhiteoutUids)
    ? game._candiceWhiteoutUids
    : [];

  return current.filter((uid) => alive.has(uid));
}

export function syncCandiceVisual(game) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const active = isCandiceBattle(game);
  const uids = active ? activeWhiteoutUids(game) : [];
  const targets = Object.fromEntries(uids.map((uid) => [uid, true]));
  const boosted = active && hasCandiceAbomasnow(game);

  if (active) {
    document.body.dataset.candiceWhiteoutCount = String(uids.length);
    document.body.dataset.candiceSnowWarning = boosted ? "1" : "0";
  } else {
    delete document.body.dataset.candiceWhiteoutCount;
    delete document.body.dataset.candiceSnowWarning;
  }

  window.__pokeCandiceWhiteout = targets;
  window.dispatchEvent(
    new CustomEvent("candice-whiteout-change", {
      detail: { active, uids, boosted },
    }),
  );
}

export function beginCandicePlayerTurn(game) {
  if (!isCandiceBattle(game) || game.winner || game.turn !== "player") {
    return false;
  }

  const playerUnits = game.players.player.field.filter((unit) => unit.hp > 0);
  const targetCount = hasCandiceAbomasnow(game)
    ? SNOW_WARNING_TARGETS
    : BASE_WHITEOUT_TARGETS;
  const selected = shuffled(playerUnits)
    .slice(0, Math.min(targetCount, playerUnits.length))
    .map((unit) => unit.uid);
  const selectedSet = new Set(selected);

  game._candiceWhiteoutUids = selected;
  game.players.player.field.forEach((unit) => {
    const affected = selectedSet.has(unit.uid);
    unit._candiceWhiteout = affected;
    if (affected) unit.canAttack = false;
  });

  if (selected.length > 0) {
    pushLog(
      game,
      `화이트아웃! 플레이어 필드 ${selected.length}곳이 눈보라 지역이 되어 이번 턴 공격할 수 없다!`,
    );
  } else {
    pushLog(game, "화이트아웃이 휘몰아쳤지만 얼어붙을 포켓몬이 없다.");
  }

  if (targetCount === SNOW_WARNING_TARGETS) {
    pushLog(
      game,
      "무청의 눈설왕이 눈퍼뜨리기를 유지해 화이트아웃 범위가 3곳으로 넓어졌다!",
    );
  }

  syncCandiceVisual(game);
  return selected.length > 0;
}

export function initCandiceBattle(game) {
  game._candiceWhiteoutUids = [];

  if (!isCandiceBattle(game)) {
    syncCandiceVisual(game);
    return;
  }

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
  return activeWhiteoutUids(game).includes(unitUid);
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
