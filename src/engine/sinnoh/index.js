import * as base from "../engine.js?base";
import { CARD_MAP } from "../../data/cards.js";
import {
  beginCandicePlayerTurn,
  getCandiceWhiteoutAttackBonus,
  initCandiceBattle,
  isCandiceWhiteoutUnit,
  syncCandiceVisual,
} from "./candice.js";
import {
  ageFantinaGhosts,
  applyFantinaSpiritPressure,
  captureFantinaPlayerField,
  fantinaGhostUids,
  initFantinaBattle,
  normalizeFantinaGhosts,
  spawnFantinaGhostsFromDeaths,
} from "./fantina.js";
import {
  ensureByronArmor,
  flushByronArmorLogs,
  getByronArmor,
  handleByronMetalBurst,
  initByronBattle,
  regenByronBastiodonArmor,
  syncByronArmorVisual,
} from "./byron.js";
import {
  captureGardeniaVines,
  preserveRemovedGardeniaVineSlots,
  releaseGardeniaAnchorForSummon,
  releaseGardeniaAnchors,
  restoreGardeniaAnchor,
  restoreUnusedGardeniaAnchors,
} from "./gardenia.js";
import {
  applyVolknerTurnStart,
  getVolknerCardDiscount,
  initVolknerBattle,
  markVolknerElectricCardPlayed,
  resolveVolknerPlayerManaPenalty,
  resolveVolknerTurnEnd,
  shouldReserveVolknerMana,
  syncVolknerVisual,
} from "./volkner.js";

export * from "../engine.js?base";

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

function syncBattleTurnVisual(game) {
  if (typeof document === "undefined") return;

  const turn = game?.turn;
  if (turn === "player" || turn === "enemy") {
    document.body.dataset.battleTurn = turn;
  } else {
    delete document.body.dataset.battleTurn;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("battle-turn-change", {
        detail: { turn: turn || null },
      }),
    );
  }
}

function syncMayleneComboVisual(game) {
  if (typeof document === "undefined") return;

  const active = game?.trainer?.gimmick === "dojo_combo";
  const combo = active ? Math.max(0, game._mayleneCombo || 0) : 0;

  if (active) document.body.dataset.mayleneCombo = String(combo);
  else delete document.body.dataset.mayleneCombo;

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("maylene-combo-change", {
        detail: { combo, active },
      }),
    );
  }
}

function isFantinaEnemyAction(game, side) {
  return game?.trainer?.gimmick === "haunted_echoes" && side === "enemy";
}

function isFantinaGhost(unit) {
  return Boolean(unit?._fantinaGhost);
}

export function canAttack(game, side, unitUid) {
  if (!base.canAttack(game, side, unitUid)) return false;

  if (
    game.turn === "player" &&
    isCandiceWhiteoutUnit(game, side, unitUid)
  ) {
    return false;
  }

  return true;
}

export function validAttackTargets(game, side, attackerUid) {
  if (!canAttack(game, side, attackerUid)) {
    return { units: [], hero: false };
  }

  const targets = base.validAttackTargets(game, side, attackerUid);

  if (!isFantinaEnemyAction(game, side)) return targets;

  return {
    ...targets,
    units: targets.units.filter((unit) => !isFantinaGhost(unit)),
  };
}

function redirectFantinaGhostTarget(
  game,
  side,
  target,
  { attackerUid = null, cardId = null } = {},
) {
  if (!isFantinaEnemyAction(game, side) || !target || target.uid === "hero") {
    return target;
  }

  const selected = game.players.player.field.find((unit) => unit.uid === target.uid);
  if (!isFantinaGhost(selected)) return target;

  if (attackerUid) {
    const legal = validAttackTargets(game, side, attackerUid);
    if (legal.hero) return { uid: "hero" };
    if (legal.units.length > 0) return { uid: legal.units[0].uid };
    return null;
  }

  const card = cardId ? CARD_MAP[cardId] : null;
  const nonGhost = game.players.player.field.find(
    (unit) => unit.hp > 0 && !isFantinaGhost(unit),
  );

  if (card?.spell?.target === "enemy-any") return { uid: "hero" };
  return nonGhost ? { uid: nonGhost.uid } : null;
}

function enemyUnitIds(game) {
  return new Set(game.players.enemy.field.map((unit) => unit.uid));
}

function didEnemyPokemonDie(game, beforeIds) {
  if (!beforeIds) return false;

  return [...beforeIds].some((uid) => {
    const unit = game.players.enemy.field.find((entry) => entry.uid === uid);
    return !unit || unit.hp <= 0;
  });
}

function resetMayleneComboIfNeeded(game, beforeIds) {
  if (game.trainer?.gimmick !== "dojo_combo") return;
  if (!didEnemyPokemonDie(game, beforeIds)) return;

  if ((game._mayleneCombo || 0) > 0) {
    pushLog(
      game,
      "자두의 포켓몬이 쓰러졌다! 격투도장의 연속공격 콤보가 초기화됐다!",
    );
  }

  game._mayleneCombo = 0;
  syncMayleneComboVisual(game);
}

function setWakeFloodVisual(level) {
  if (typeof document === "undefined") return;
  if (level > 0) document.body.dataset.wakeFlood = String(level);
  else delete document.body.dataset.wakeFlood;
}

function advanceWakeFlood(game) {
  if (game.trainer?.gimmick !== "rising_tide") return;

  game._wakePlayerTurns = (game._wakePlayerTurns || 0) + 1;

  let nextLevel = game._wakeFloodLevel || 0;
  if (game._wakePlayerTurns >= 6) nextLevel = 2;
  else if (game._wakePlayerTurns >= 3) nextLevel = 1;

  if (nextLevel === game._wakeFloodLevel) return;

  game._wakeFloodLevel = nextLevel;
  game.players.player.fieldCapacity = nextLevel === 1 ? 5 : 4;
  setWakeFloodVisual(nextLevel);

  pushLog(
    game,
    nextLevel === 1
      ? "들판체육관의 수위가 상승했다! 플레이어 필드가 5칸으로 줄어든다!"
      : "들판체육관의 수위가 다시 상승했다! 플레이어 필드가 4칸으로 줄어든다!",
  );
}

function findNewestUnitByCardId(game, side, cardId) {
  const units = game.players[side].field.filter((unit) => unit.cardId === cardId);
  return units[units.length - 1] || null;
}

function enableSignatureRush(game, side, cardId) {
  const card = CARD_MAP[cardId];
  if (!card) return;

  const rushNames = {
    maylene_aurasphere: "파동탄",
    wake_aquajet: "아쿠아제트",
  };

  const skillName = rushNames[card.ability];
  if (!skillName) return;

  const unit = findNewestUnitByCardId(game, side, cardId);
  if (!unit) return;

  unit.canAttack = true;
  pushLog(game, `${unit.name}의 ${skillName}! 바로 공격할 수 있다!`);
}

function addImpactDamage(game, targetSide, targetUid, amount) {
  if (amount <= 0 || !game.lastAction) return;
  if (!Array.isArray(game.lastAction.impacts)) game.lastAction.impacts = [];

  const existing = game.lastAction.impacts.find(
    (impact) =>
      impact.type === "damage" &&
      impact.side === targetSide &&
      impact.targetUid === targetUid,
  );

  if (existing) existing.amount += amount;
  else {
    game.lastAction.impacts.push({
      type: "damage",
      side: targetSide,
      targetUid,
      amount,
    });
  }
}

function applyAttackBonus(game, side, target, targetRef, beforeHp, bonus) {
  if (bonus <= 0 || beforeHp == null) return 0;

  const targetSide = base.other(side);

  if (target.uid === "hero") {
    const foe = game.players[targetSide];
    const baseDealt = Math.max(0, beforeHp - foe.hp);
    if (baseDealt <= 0 || foe.hp <= 0) return 0;

    const dealt = Math.min(bonus, foe.hp);
    foe.hp = Math.max(0, foe.hp - dealt);
    addImpactDamage(game, targetSide, "hero", dealt);

    if (foe.hp <= 0 && !game.winner) game.winner = side;
    return dealt;
  }

  if (!targetRef) return 0;

  const baseDealt = Math.max(0, beforeHp - targetRef.hp);
  if (baseDealt <= 0 || targetRef.hp <= 0) return 0;

  const dealt = Math.min(bonus, targetRef.hp);
  targetRef.hp = Math.max(0, targetRef.hp - dealt);
  addImpactDamage(game, targetSide, targetRef.uid, dealt);

  if (targetRef.hp <= 0) base.cleanupDeaths(game, true);
  return dealt;
}

function withVolknerDiscount(game, side, handIdx, callback) {
  const handCard = game.players[side]?.hand?.[handIdx];
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  const discount = getVolknerCardDiscount(game, side, card);

  if (!handCard || discount <= 0) return callback();

  const hadReduction = Object.prototype.hasOwnProperty.call(
    handCard,
    "costReduction",
  );
  const originalReduction = handCard.costReduction;
  handCard.costReduction = (Number(originalReduction) || 0) + discount;

  try {
    return callback();
  } finally {
    if (hadReduction) handCard.costReduction = originalReduction;
    else delete handCard.costReduction;
  }
}

export function effectiveCost(card, game, side = null, handCard = null) {
  const baseCost = base.effectiveCost(card, game, side, handCard);
  return Math.max(0, baseCost - getVolknerCardDiscount(game, side, card));
}

export function canPlayCard(game, side, handIdx) {
  const handCard = game.players[side]?.hand?.[handIdx];
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  if (!card) return false;

  const playable = withVolknerDiscount(game, side, handIdx, () =>
    base.canPlayCard(game, side, handIdx),
  );

  if (!playable) return false;

  if (shouldReserveVolknerMana(game, side)) {
    const manaAfterPlay =
      game.players[side].mana - effectiveCost(card, game, side, handCard);

    if (manaAfterPlay < 2) return false;
  }

  return true;
}

function syncSinnohMechanics(game) {
  normalizeFantinaGhosts(game);
  ensureByronArmor(game);
  flushByronArmorLogs(game);
  syncByronArmorVisual(game);
  syncCandiceVisual(game);
  syncVolknerVisual(game);
  syncBattleTurnVisual(game);
}

export function createGame(playerDeckIds, trainer, playerDeckShiny = null) {
  const game = base.createGame(playerDeckIds, trainer, playerDeckShiny);

  if (trainer?.gimmick === "dojo_combo") game._mayleneCombo = 0;
  syncMayleneComboVisual(game);

  if (trainer?.gimmick === "rising_tide") {
    game._wakePlayerTurns = game.turn === "player" ? 1 : 0;
    game._wakeFloodLevel = 0;
    game.players.player.fieldCapacity = 6;
    setWakeFloodVisual(0);
  } else {
    setWakeFloodVisual(0);
  }

  initFantinaBattle(game);
  initByronBattle(game);
  initCandiceBattle(game);
  initVolknerBattle(game);
  syncSinnohMechanics(game);
  return game;
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const enemyBefore = enemyUnitIds(game);
  const fantinaBefore = captureFantinaPlayerField(game);
  const handCard = game.players[side].hand[handIdx] || null;
  const cardId = handCard?.cardId || null;
  const card = cardId ? CARD_MAP[cardId] : null;

  if (!card || !canPlayCard(game, side, handIdx)) return false;

  const volknerDiscount = getVolknerCardDiscount(game, side, card);
  const gardeniaAnchor = releaseGardeniaAnchorForSummon(game, side, card);
  const resolvedTarget = redirectFantinaGhostTarget(game, side, target, { cardId });
  const result = withVolknerDiscount(game, side, handIdx, () =>
    base.playCard(game, side, handIdx, resolvedTarget, fieldIndex),
  );

  if (!result && gardeniaAnchor) restoreGardeniaAnchor(game, gardeniaAnchor);

  if (result && cardId) {
    enableSignatureRush(game, side, cardId);

    if (volknerDiscount > 0) {
      markVolknerElectricCardPlayed(game, side, card);
    }
  }

  spawnFantinaGhostsFromDeaths(game, fantinaBefore);
  resetMayleneComboIfNeeded(game, enemyBefore);
  syncSinnohMechanics(game);
  return result;
}

export function attackFieldObstacle(game, side, attackerUid, obstacleId) {
  if (!canAttack(game, side, attackerUid)) return false;

  const beforeVines = captureGardeniaVines(game);
  const result = base.attackFieldObstacle(game, side, attackerUid, obstacleId);

  if (result) {
    preserveRemovedGardeniaVineSlots(game, beforeVines);
  }

  syncSinnohMechanics(game);
  return result;
}

export function attack(game, side, attackerUid, target) {
  if (!canAttack(game, side, attackerUid)) {
    syncSinnohMechanics(game);
    return false;
  }

  const resolvedTarget = redirectFantinaGhostTarget(game, side, target, {
    attackerUid,
  });

  if (!resolvedTarget) {
    syncSinnohMechanics(game);
    return false;
  }

  const enemyBefore = enemyUnitIds(game);
  const fantinaBefore = captureFantinaPlayerField(game);
  const attacker = game.players[side].field.find((unit) => unit.uid === attackerUid);
  const targetSide = base.other(side);
  const targetRef =
    resolvedTarget.uid === "hero"
      ? null
      : game.players[targetSide].field.find(
          (unit) => unit.uid === resolvedTarget.uid,
        ) || null;
  const beforeHp =
    resolvedTarget.uid === "hero"
      ? game.players[targetSide].hp
      : targetRef?.hp ?? null;
  const armorBefore = getByronArmor(targetRef);

  let comboBefore = 0;
  let comboBonus = 0;
  let lucarioBonus = 0;
  let floatzelBonus = 0;
  const candiceBonus = getCandiceWhiteoutAttackBonus(
    game,
    attacker,
    targetRef,
  );

  if (game.trainer?.gimmick === "dojo_combo" && side === "enemy") {
    comboBefore = game._mayleneCombo || 0;
    comboBonus = Math.min(3, comboBefore);

    if (attacker?.ability === "maylene_aurasphere") {
      lucarioBonus = Math.min(2, comboBefore);
    }
  }

  if (
    game.trainer?.gimmick === "rising_tide" &&
    side === "enemy" &&
    attacker?.ability === "wake_aquajet"
  ) {
    floatzelBonus = Math.min(2, game._wakeFloodLevel || 0);
  }

  const result = base.attack(game, side, attackerUid, resolvedTarget);
  if (!result) {
    syncSinnohMechanics(game);
    return false;
  }

  const totalBonus =
    comboBonus + lucarioBonus + floatzelBonus + candiceBonus;

  applyAttackBonus(
    game,
    side,
    resolvedTarget,
    targetRef,
    beforeHp,
    totalBonus,
  );

  if (game.trainer?.gimmick === "dojo_combo" && side === "enemy") {
    game._mayleneCombo = comboBefore + 1;
    syncMayleneComboVisual(game);

    if (comboBonus > 0) {
      pushLog(
        game,
        `격투도장 콤보! ${comboBefore + 1}번째 공격의 피해 +${comboBonus}!`,
      );
    }

    if (lucarioBonus > 0) {
      pushLog(game, `파동탄! 이어진 공격 흐름으로 추가 피해 +${lucarioBonus}!`);
    }
  }

  if (floatzelBonus > 0) {
    pushLog(
      game,
      `아쿠아제트! 수몰된 필드 ${floatzelBonus}칸으로 추가 피해 +${floatzelBonus}!`,
    );
  }

  if (candiceBonus > 0) {
    pushLog(
      game,
      `화이트아웃! 눈보라 지역의 ${targetRef.name}에게 얼음 포켓몬 공격 피해 +${candiceBonus}!`,
    );
  }

  if (handleByronMetalBurst(game, attacker, targetRef, armorBefore)) {
    base.cleanupDeaths(game, true);
  }

  spawnFantinaGhostsFromDeaths(game, fantinaBefore);
  resetMayleneComboIfNeeded(game, enemyBefore);
  syncSinnohMechanics(game);
  return true;
}

export function endTurn(game) {
  const enemyBefore = enemyUnitIds(game);
  const fantinaBefore = captureFantinaPlayerField(game);
  const existingGhosts = fantinaGhostUids(game);
  const endingSide = game.turn;
  const releasedGardeniaAnchors =
    endingSide === "enemy" ? releaseGardeniaAnchors(game) : [];

  if (endingSide === "player") {
    resolveVolknerPlayerManaPenalty(game);

    if (game.winner) {
      syncSinnohMechanics(game);
      return true;
    }
  }

  if (endingSide === "enemy") {
    resolveVolknerTurnEnd(game);
  }

  const result = base.endTurn(game);

  restoreUnusedGardeniaAnchors(game, releasedGardeniaAnchors);
  spawnFantinaGhostsFromDeaths(game, fantinaBefore);
  resetMayleneComboIfNeeded(game, enemyBefore);

  if (game.trainer?.gimmick === "dojo_combo" && endingSide === "enemy") {
    game._mayleneCombo = 0;
    syncMayleneComboVisual(game);
  }

  if (
    game.trainer?.gimmick === "rising_tide" &&
    !game.winner &&
    game.turn === "player"
  ) {
    advanceWakeFlood(game);
  }

  if (endingSide === "player") {
    ageFantinaGhosts(game, existingGhosts);
  }

  if (endingSide === "enemy" && game.turn === "player" && !game.winner) {
    applyFantinaSpiritPressure(game);
    beginCandicePlayerTurn(game);
  }

  if (endingSide === "enemy") {
    regenByronBastiodonArmor(game);
  }

  if (!game.winner && game.turn !== endingSide) {
    applyVolknerTurnStart(game, game.turn);
  }

  syncSinnohMechanics(game);
  return result;
}

export function cleanupDeaths(game, ...args) {
  const enemyBefore = enemyUnitIds(game);
  const fantinaBefore = captureFantinaPlayerField(game);
  const result = base.cleanupDeaths(game, ...args);

  spawnFantinaGhostsFromDeaths(game, fantinaBefore);
  resetMayleneComboIfNeeded(game, enemyBefore);
  syncSinnohMechanics(game);
  return result;
}
