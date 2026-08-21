import * as core from "./gameplay-balance.js";
import { ABILITY_TEXT, CARD_MAP } from "../data/cards.js";

export * from "./gameplay-balance.js";

const COBALION_ATK = 6;
const COBALION_HP = 11;
const TERRAKION_HP = 6;
const RETALIATE_REDUCTION = 2;
const VIRIZION_TEMP_ABILITY = "__worryseed_lock_pending";

if (CARD_MAP.cobalion) {
  CARD_MAP.cobalion.atk = COBALION_ATK;
  CARD_MAP.cobalion.hp = COBALION_HP;
  CARD_MAP.cobalion.ability = "quickguard";
}
if (CARD_MAP.terrakion) {
  CARD_MAP.terrakion.hp = TERRAKION_HP;
  CARD_MAP.terrakion.ability = "retaliate";
}
if (CARD_MAP.virizion) {
  CARD_MAP.virizion.ability = "worryseed";
}

ABILITY_TEXT.quickguard =
  "퍼스트가드: 다른 아군 포켓몬이 기본 공격 또는 단일 대상 기술의 대상이 되면 항상 대신 대상이 되고, 그 피해를 2 줄인다.";
ABILITY_TEXT.retaliate =
  "원수갚기: 이 카드가 손에 있을 때 아군 포켓몬이 기절하면 다음 내 턴 동안 비용 -2, 돌진을 얻는다.";
ABILITY_TEXT.worryseed =
  "고민씨: 이 포켓몬이 필드에 있는 동안 상대는 기술 카드를 사용할 수 없다.";

function other(side) {
  return side === "player" ? "enemy" : "player";
}

function turnKey(game) {
  return `${game?.turnCount || 0}:${game?.turn || ""}`;
}

function hasAbility(unit, ability) {
  return !!unit &&
    (unit.ability === ability || unit.secondaryAbility === ability);
}

function fieldHasAbility(game, side, ability) {
  return !!game?.players?.[side]?.field?.some(
    (unit) => unit?.hp > 0 && hasAbility(unit, ability),
  );
}

function handInfo(game, side, handIdx) {
  const player = game?.players?.[side];
  const handCard = player?.hand?.[handIdx] || null;
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  return { player, handCard, card };
}

function isTechnique(card) {
  return card?.kind === "spell" && card.type === "기술";
}

function virizionLocksTechnique(game, side, card) {
  return isTechnique(card) && fieldHasAbility(game, other(side), "worryseed");
}

function isRetaliateActive(game, handCard) {
  return (
    handCard?.cardId === "terrakion" &&
    handCard._retaliateActiveTurnKey === turnKey(game)
  );
}

function withTerrakionReduction(game, handCard, callback) {
  if (!isRetaliateActive(game, handCard)) return callback();

  const activeKey = handCard._retaliateActiveTurnKey;
  const hadReduction = Object.prototype.hasOwnProperty.call(
    handCard,
    "costReduction",
  );
  const originalReduction = handCard.costReduction;

  // gameplay-balance의 기존 -3 처리를 끄고 여기서 정확히 -2만 적용한다.
  delete handCard._retaliateActiveTurnKey;
  handCard.costReduction =
    (Number(originalReduction) || 0) + RETALIATE_REDUCTION;

  try {
    return callback();
  } finally {
    handCard._retaliateActiveTurnKey = activeKey;
    if (hadReduction) handCard.costReduction = originalReduction;
    else delete handCard.costReduction;
  }
}

function quickGuardForTarget(game, attackingSide, targetUid) {
  if (!targetUid || targetUid === "hero") return null;
  const defender = game?.players?.[other(attackingSide)];
  const original = defender?.field?.find(
    (unit) => unit.uid === targetUid && unit.hp > 0,
  );
  if (!original) return null;

  return (
    defender.field.find(
      (unit) =>
        unit.uid !== original.uid &&
        unit.hp > 0 &&
        hasAbility(unit, "quickguard"),
    ) || null
  );
}

function withQuickGuardDamageReduction(guard, callback) {
  if (!guard) return callback();
  const originalMaxHp = guard.maxHp;
  guard.maxHp += 2;
  guard.hp += 2;
  try {
    return callback();
  } finally {
    guard.maxHp = originalMaxHp;
    guard.hp = Math.min(originalMaxHp, guard.hp);
  }
}

function announceQuickGuard(game, originalTargetUid, guard) {
  if (!guard) return;
  game.log.push(`${guard.name}의 퍼스트가드! 아군 대신 공격을 받아냈다!`);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cobalion-guard-redirect", {
        detail: {
          originalTargetUid,
          guardUid: guard.uid,
        },
      }),
    );
  }
}

function withVirizionSummonSuppressed(card, callback) {
  if (card?.id !== "virizion") return callback();
  const originalAbility = card.ability;
  card.ability = VIRIZION_TEMP_ABILITY;
  try {
    return callback();
  } finally {
    card.ability = originalAbility;
  }
}

function restorePlayedVirizion(player, previousFieldUids) {
  const unit = player?.field?.find(
    (entry) =>
      !previousFieldUids.has(entry.uid) && entry.cardId === "virizion",
  );
  if (!unit) return;
  unit.ability = "worryseed";
  unit.secondaryAbility = null;
}

function grantTerrakionRush(player, previousFieldUids) {
  const unit = player?.field?.find(
    (entry) =>
      !previousFieldUids.has(entry.uid) && entry.cardId === "terrakion",
  );
  if (!unit) return;
  unit.canAttack = true;
}

export function effectiveCost(card, game, side, handCard = null) {
  const cost = core.effectiveCost(card, game, side, handCard);
  return isRetaliateActive(game, handCard) ? cost + 1 : cost;
}

export function canPlayCard(game, side, handIdx) {
  const { handCard, card } = handInfo(game, side, handIdx);
  if (!handCard || !card) return false;
  if (virizionLocksTechnique(game, side, card)) return false;

  return withTerrakionReduction(game, handCard, () =>
    core.canPlayCard(game, side, handIdx),
  );
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const { player, handCard, card } = handInfo(game, side, handIdx);
  if (!player || !handCard || !card) return false;
  if (virizionLocksTechnique(game, side, card)) {
    game.log.push("비리디온의 고민씨! 기술 카드를 사용할 수 없다!");
    return false;
  }

  const previousFieldUids = new Set(player.field.map((unit) => unit.uid));
  const retaliateActive = isRetaliateActive(game, handCard);
  const originalTargetUid = target?.uid || null;
  const quickGuard =
    isTechnique(card) && originalTargetUid && originalTargetUid !== "hero"
      ? quickGuardForTarget(game, side, originalTargetUid)
      : null;
  const resolvedTarget = quickGuard
    ? { ...target, uid: quickGuard.uid }
    : target;

  const result = withTerrakionReduction(game, handCard, () =>
    withQuickGuardDamageReduction(quickGuard, () =>
      withVirizionSummonSuppressed(card, () =>
        core.playCard(game, side, handIdx, resolvedTarget, fieldIndex),
      ),
    ),
  );

  if (!result) return result;

  if (card.id === "virizion") {
    restorePlayedVirizion(player, previousFieldUids);
    game.pendingBattlecry =
      game.pendingBattlecry?.ability === "worryseed"
        ? null
        : game.pendingBattlecry;
  }

  if (card.id === "terrakion" && retaliateActive) {
    grantTerrakionRush(player, previousFieldUids);
    game.log.push("테라키온의 원수갚기! 즉시 공격할 수 있다!");
  }

  if (quickGuard) announceQuickGuard(game, originalTargetUid, quickGuard);
  return result;
}

export function attack(game, side, attackerUid, target) {
  const originalTargetUid = target?.uid || null;
  const quickGuard = quickGuardForTarget(game, side, originalTargetUid);
  const resolvedTarget = quickGuard
    ? { ...target, uid: quickGuard.uid }
    : target;

  const result = withQuickGuardDamageReduction(quickGuard, () =>
    core.attack(game, side, attackerUid, resolvedTarget),
  );

  if (result && quickGuard) {
    announceQuickGuard(game, originalTargetUid, quickGuard);
  }
  return result;
}

export function endTurn(game) {
  const logStart = game?.log?.length || 0;
  const result = core.endTurn(game);
  for (let i = logStart; i < (game?.log?.length || 0); i += 1) {
    if (typeof game.log[i] === "string") {
      game.log[i] = game.log[i].replace(
        "이번 턴 비용 -3, 돌진!",
        "이번 턴 비용 -2, 돌진!",
      );
    }
  }
  return result;
}
