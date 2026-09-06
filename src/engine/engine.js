import * as rules from "./engine.rules.js";
import { CARD_MAP } from "../data/cards.js";
import {
  getOnlineBattleBridge,
  getOnlineBattleBridgeByMatchId,
} from "./onlineBattleBridge.js";
import { registerDamagePreviewGame } from "./damagePreviewRuntime.js";
import { registerKyuremSealRuntime } from "./kyuremSealRuntime.js";
import {
  getEvolutionExchangeInfo,
  performEvolutionExchange,
} from "./evolutionExchange.js";

export * from "./engine.rules.js";

const DISCARD_REDRAW_SENTINEL = "__discard_redraw__";
const LIGHT_SCREEN_REDUCTION = 2;
const DAMAGE_TECHNIQUE_EFFECTS = new Set([
  "execute",
  "all_field_damage",
  "aoe",
  "aoe_status",
  "multi_damage",
  "piercing_damage",
  "damage_bounce",
  "damage_recall_friendly",
  "damage_grant_rush",
  "acrobatics",
]);

const STATUS_TYPE_IMMUNITIES = {
  poison: new Set(["독", "강철"]),
  burn: new Set(["불꽃"]),
  para: new Set(["전기"]),
  ice: new Set(["얼음"]),
};

const STATUS_LABELS = {
  poison: "독",
  burn: "화상",
  para: "마비",
  ice: "얼음",
};

function normalizeStatusType(statusType) {
  return statusType === "paralyze" ? "para" : statusType;
}

function isTypeStatusImmune(unit, statusType) {
  if (!unit) return false;
  const normalized = normalizeStatusType(statusType);
  return STATUS_TYPE_IMMUNITIES[normalized]?.has(unit.type) || false;
}

function pushEngineLog(game, message) {
  if (!Array.isArray(game?.log) || !message) return;
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

function otherSide(side) {
  return side === "player" ? "enemy" : "player";
}

function withRecalledEvolutionAsBasic(game, side, handIdx, callback) {
  const handCard = game.players?.[side]?.hand?.[handIdx];
  const card = CARD_MAP[handCard?.cardId];
  if (!handCard?._fieldRecallEvolution || !card?.evolvesFrom) {
    return callback();
  }

  const originalEvolvesFrom = card.evolvesFrom;
  card.evolvesFrom = null;
  try {
    return callback();
  } finally {
    card.evolvesFrom = originalEvolvesFrom;
  }
}

function markRecalledEvolution(game, side, card, beforeHandUids, result) {
  if (
    result === false ||
    card?.kind !== "spell" ||
    card.spell?.effect !== "damage_recall_friendly"
  ) {
    return;
  }

  const player = game.players?.[side];
  if (!player) return;

  for (const handCard of player.hand || []) {
    if (beforeHandUids.has(handCard.uid)) continue;
    const recalled = CARD_MAP[handCard.cardId];
    if (recalled?.kind === "pokemon" && recalled.evolvesFrom) {
      handCard._fieldRecallEvolution = true;
      pushEngineLog(
        game,
        `${recalled.name}은(는) 필드에서 돌아온 진화체라 다시 바로 낼 수 있다.`,
      );
    }
  }
}

function damageTechniqueHeroHitCount(card, target) {
  if (
    !card ||
    card.kind !== "spell" ||
    card.type !== "기술" ||
    target?.uid !== "hero"
  ) {
    return 0;
  }

  const spell = card.spell || {};
  const isDamageTechnique =
    Number(spell.amount) > 0 || DAMAGE_TECHNIQUE_EFFECTS.has(spell.effect);

  if (!isDamageTechnique || spell.target === "enemy-pokemon") return 0;
  if (spell.effect === "multi_damage") {
    return Math.max(1, Number(spell.hits) || 2);
  }
  return 1;
}

function correctLightScreenHeroDamage(
  game,
  side,
  card,
  target,
  defenderHpBefore,
  screenChargesBefore,
  result,
) {
  if (result === false || screenChargesBefore <= 0) return;

  const hitCount = damageTechniqueHeroHitCount(card, target);
  if (hitCount <= 0) return;

  const defenderSide = otherSide(side);
  const defender = game.players?.[defenderSide];
  if (!defender) return;

  const rawDamage = Math.max(0, defenderHpBefore - defender.hp);
  if (rawDamage <= 0) return;

  const restored = Math.min(
    rawDamage,
    LIGHT_SCREEN_REDUCTION * hitCount,
  );
  defender.hp = Math.min(defender.maxHp ?? Number.POSITIVE_INFINITY, defender.hp + restored);

  let remainingRestore = restored;
  if (Array.isArray(game.lastAction?.impacts)) {
    for (const impact of game.lastAction.impacts) {
      if (remainingRestore <= 0) break;
      if (
        impact?.type !== "damage" ||
        impact.targetUid !== "hero" ||
        impact.side !== defenderSide
      ) {
        continue;
      }

      const amount = Math.max(0, Number(impact.amount) || 0);
      const reduction = Math.min(
        LIGHT_SCREEN_REDUCTION,
        amount,
        remainingRestore,
      );
      impact.amount = amount - reduction;
      remainingRestore -= reduction;
    }

    game.lastAction.impacts = game.lastAction.impacts.filter(
      (impact) =>
        !(
          impact?.type === "damage" &&
          impact.targetUid === "hero" &&
          (Number(impact.amount) || 0) <= 0
        ),
    );
  }

  if (game.winner === side && defender.hp > 0) {
    game.winner = null;
  }

  pushEngineLog(
    game,
    `${defender.name}의 빛의장막! 트레이너가 받는 기술 피해가 ${restored} 줄었다!`,
  );
}

function hasUnitAbility(unit, ability) {
  return !!unit &&
    (unit.ability === ability || unit.secondaryAbility === ability);
}

function normalizeTypeStatusImmunities(game) {
  if (!game?.players) return false;
  let changed = false;

  for (const side of ["player", "enemy"]) {
    for (const unit of game.players?.[side]?.field || []) {
      let statusType = normalizeStatusType(unit.status);

      if (!statusType && (unit.frozen || 0) > 0) statusType = "ice";
      if (!statusType || !isTypeStatusImmune(unit, statusType)) continue;

      unit.status = null;
      unit.statusTurns = 0;
      unit.frozen = 0;
      changed = true;

      const label = STATUS_LABELS[statusType] || statusType;
      pushEngineLog(
        game,
        `${unit.name}은(는) ${unit.type} 타입이라 ${label} 상태이상을 무효화했다!`,
      );
    }
  }

  return changed;
}

function isGlaciateSealActive(game, side, handCard) {
  const sourceUid = handCard?._glaciateSealedByUid;
  if (!sourceUid) return false;

  const source = game.players?.[otherSide(side)]?.field?.find(
    (unit) =>
      unit.uid === sourceUid &&
      unit.hp > 0 &&
      hasUnitAbility(unit, "glaciate"),
  );

  if (source) return true;
  delete handCard._glaciateSealedByUid;
  return false;
}

function refreshGlaciateSeals(game) {
  if (!game?.players) return;

  for (const side of ["player", "enemy"]) {
    for (const handCard of game.players?.[side]?.hand || []) {
      isGlaciateSealActive(game, side, handCard);
    }
  }

  const pending = game.pendingBattlecry;
  if (pending?.ability !== "glaciate") return;

  const source = game.players?.[pending.side]?.field?.find(
    (unit) =>
      unit.uid === pending.uid &&
      unit.hp > 0 &&
      hasUnitAbility(unit, "glaciate"),
  );
  if (!source) game.pendingBattlecry = null;
}

function setupKyuremSeal(game, side, unit) {
  if (!unit || !hasUnitAbility(unit, "glaciate")) return;

  const targetSide = otherSide(side);
  const targetPlayer = game.players?.[targetSide];
  if (!targetPlayer) return;

  const candidates = (targetPlayer.hand || []).filter(
    (handCard) => !isGlaciateSealActive(game, targetSide, handCard),
  );
  const count = Math.min(2, candidates.length);
  if (count <= 0) return;

  const needsHumanSelection = side === "player" || !!game?._onlineMatch?.id;

  if (needsHumanSelection) {
    game.pendingBattlecry = {
      side,
      uid: unit.uid,
      ability: "glaciate",
      targetSide,
      count,
      targets: candidates.map((handCard) => handCard.uid),
      selected: [],
    };
    pushEngineLog(
      game,
      `큐레무의 얼어붙은세계! 상대 손패에서 ${count}장을 선택해 봉인하세요.`,
    );
    return;
  }

  const picks = [...candidates]
    .sort(
      (a, b) =>
        (CARD_MAP[b.cardId]?.cost || 0) - (CARD_MAP[a.cardId]?.cost || 0),
    )
    .slice(0, count);

  for (const handCard of picks) {
    handCard._glaciateSealedByUid = unit.uid;
  }
  pushEngineLog(
    game,
    `큐레무의 얼어붙은세계! 상대 손패 ${count}장을 봉인했다!`,
  );
}

function resolveGlaciateSeal(game, side, handUid) {
  const pending = game?.pendingBattlecry;
  if (
    !pending ||
    pending.ability !== "glaciate" ||
    pending.side !== side ||
    pending.selected?.includes(handUid) ||
    !pending.targets?.includes(handUid)
  ) {
    return false;
  }

  const source = game.players?.[side]?.field?.find(
    (unit) =>
      unit.uid === pending.uid &&
      unit.hp > 0 &&
      hasUnitAbility(unit, "glaciate"),
  );
  const handCard = game.players?.[pending.targetSide]?.hand?.find(
    (entry) => entry.uid === handUid,
  );
  if (!source || !handCard) return false;

  handCard._glaciateSealedByUid = source.uid;
  pending.selected = [...(pending.selected || []), handUid];
  pushEngineLog(
    game,
    `큐레무의 얼어붙은세계! ${CARD_MAP[handCard.cardId]?.name || "카드"}을(를) 봉인했다!`,
  );

  if (pending.selected.length >= pending.count) {
    game.pendingBattlecry = null;
  }

  refreshGlaciateSeals(game);
  return true;
}

function runRulesAction(game, callback) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);
  const result = callback();
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);
  return result;
}

function rememberPreviewGame(game) {
  refreshGlaciateSeals(game);
  registerDamagePreviewGame(game);
  registerKyuremSealRuntime(game, (handUid) =>
    resolveMoldbreaker(game, "player", handUid),
  );
  return game;
}

function bridgeFor(game) {
  rememberPreviewGame(game);
  return getOnlineBattleBridge(game);
}

function canDispatch(game) {
  const bridge = bridgeFor(game);
  if (!bridge) return null;
  if (bridge.canAct && !bridge.canAct()) return false;
  return bridge;
}

function dispatch(game, command) {
  const bridge = canDispatch(game);
  if (!bridge) return false;

  if (bridge.tryDispatch) {
    return bridge.tryDispatch(command) !== false;
  }

  try {
    const result = bridge.dispatch?.(command);
    if (result === false) return false;
    Promise.resolve(result).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function finishPendingDispatch(sent, callback) {
  if (sent === null) return callback();
  return sent !== false;
}

function evolutionSource(game, side, card, target) {
  if (!card || !game?.players?.[side]) return null;

  const field = game.players[side].field || [];
  const evolvesFrom =
    card.kind === "pokemon" && card.evolvesFrom
      ? card.evolvesFrom
      : card.kind === "mega"
        ? card.megaFor
        : null;

  if (!evolvesFrom) return null;

  const unit = target?.uid
    ? field.find((entry) => entry.uid === target.uid && entry.cardId === evolvesFrom)
    : field.find((entry) => entry.cardId === evolvesFrom);

  if (!unit) return null;
  return {
    uid: unit.uid,
    cardId: unit.cardId,
    name: unit.name || CARD_MAP[unit.cardId]?.name || unit.cardId,
  };
}

function promoteLatestEvolutionLog(game, match, replacement) {
  if (!Array.isArray(game?.log)) return;

  for (let i = game.log.length - 1; i >= 0; i -= 1) {
    if (match(game.log[i])) game.log.splice(i, 1);
  }

  game.log.push(replacement);
  if (game.log.length > 60) game.log.shift();
}

function enrichEvolutionLog(game, side, card, source, result) {
  if (result === false || !card) return;

  const player = game.players?.[side];
  if (!player) return;

  const action = game.lastAction;
  const actionMatches =
    action?.kind === "play" && action?.cardId === card.id;
  const evolvedUid = source?.uid || (actionMatches ? action?.uid : null);
  const evolved = evolvedUid
    ? player.field?.find((unit) => unit.uid === evolvedUid)
    : null;
  const ownerName = player.name || (side === "player" ? "플레이어" : "상대");

  if (
    card.kind === "pokemon" &&
    card.evolvesFrom &&
    (action?.anim === "evolve" || evolved?.cardId === card.id)
  ) {
    const fromName =
      source?.name || CARD_MAP[card.evolvesFrom]?.name || card.evolvesFrom;
    const toName = evolved?.name || card.name || card.id;
    const replacement = `[진화] ${ownerName}: ${fromName} → ${toName}`;

    promoteLatestEvolutionLog(
      game,
      (line) =>
        typeof line === "string" &&
        (line === `${toName}(으)로 진화했다!` ||
          (line.startsWith("[진화]") &&
            line.includes(fromName) &&
            line.includes(toName))),
      replacement,
    );

    if (actionMatches) {
      action.evolution = { kind: "evolve", from: fromName, to: toName };
    }
    return;
  }

  if (
    card.kind === "mega" &&
    (action?.anim === "mega" || evolved?.mega)
  ) {
    const fromName = source?.name || CARD_MAP[card.megaFor]?.name || card.megaFor;
    const toName = evolved?.name || `메가 ${fromName}`;
    const replacement = `[메가진화] ${ownerName}: ${fromName} → ${toName}`;

    promoteLatestEvolutionLog(
      game,
      (line) =>
        typeof line === "string" &&
        (line === `${toName}(으)로 메가진화했다!!` ||
          (line.startsWith("[메가진화]") &&
            line.includes(fromName) &&
            line.includes(toName))),
      replacement,
    );

    if (actionMatches) {
      action.evolution = { kind: "mega", from: fromName, to: toName };
    }
  }
}

export function createGame(deck, trainer, deckShiny = {}) {
  if (trainer?.onlineBattle && trainer?.matchId) {
    const bridge = getOnlineBattleBridgeByMatchId(trainer.matchId);
    const sharedGame = bridge?.getGame?.();
    if (sharedGame) {
      normalizeTypeStatusImmunities(sharedGame);
      return rememberPreviewGame(sharedGame);
    }
  }

  let resolvedTrainer = trainer;
  if (
    trainer?.onlineBattle &&
    Array.isArray(trainer.deck) &&
    trainer.deck.includes("letsgo_eevee") &&
    !trainer.startingCard
  ) {
    resolvedTrainer = { ...trainer, startingCard: "letsgo_eevee" };
  }

  const game = rules.createGame(deck, resolvedTrainer, deckShiny);
  normalizeTypeStatusImmunities(game);
  return rememberPreviewGame(game);
}

export function canPlayCard(game, side, handIdx) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);

  const handCard = game.players?.[side]?.hand?.[handIdx];
  if (isGlaciateSealActive(game, side, handCard)) return false;

  const bridge = bridgeFor(game);
  if (bridge && bridge.canAct && !bridge.canAct()) return false;
  return withRecalledEvolutionAsBasic(game, side, handIdx, () =>
    rules.canPlayCard(game, side, handIdx),
  );
}

export function canAttack(game, side, attackerUid) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);
  const bridge = bridgeFor(game);
  if (bridge && bridge.canAct && !bridge.canAct()) return false;
  return rules.canAttack(game, side, attackerUid);
}

export function applyStatus(game, unit, statusType, sourceUnit = null) {
  const normalized = normalizeStatusType(statusType);
  if (isTypeStatusImmune(unit, normalized)) return false;

  return runRulesAction(game, () =>
    rules.applyStatus(game, unit, normalized, sourceUnit),
  );
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);

  const currentHandCard = game.players?.[side]?.hand?.[handIdx];
  if (isGlaciateSealActive(game, side, currentHandCard)) return false;

  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") {
    const handCard = game.players?.[side]?.hand?.[handIdx];
    const card = CARD_MAP[handCard?.cardId];
    const defender = game.players?.[otherSide(side)];
    const defenderHpBefore = defender?.hp ?? 0;
    const lightScreenChargesBefore = defender?._lightScreenCharges || 0;
    const source = evolutionSource(game, side, card, target);
    const beforeFieldUids = new Set(
      (game.players?.[side]?.field || []).map((unit) => unit.uid),
    );
    const beforeHandUids = new Set(
      (game.players?.[side]?.hand || []).map((entry) => entry.uid),
    );

    const result = runRulesAction(game, () =>
      withRecalledEvolutionAsBasic(game, side, handIdx, () =>
        rules.playCard(game, side, handIdx, target, fieldIndex),
      ),
    );

    markRecalledEvolution(game, side, card, beforeHandUids, result);
    correctLightScreenHeroDamage(
      game,
      side,
      card,
      target,
      defenderHpBefore,
      lightScreenChargesBefore,
      result,
    );
    enrichEvolutionLog(game, side, card, source, result);

    if (result !== false && card?.id === "kyurem") {
      const unit = game.players?.[side]?.field?.find(
        (entry) =>
          entry.cardId === "kyurem" &&
          !beforeFieldUids.has(entry.uid) &&
          entry.hp > 0,
      );
      if (unit) setupKyuremSeal(game, side, unit);
    }

    rememberPreviewGame(game);
    return result;
  }

  if (!bridge.canAct?.()) return false;
  const handCard = game.players?.player?.hand?.[handIdx];
  if (
    !handCard?.uid ||
    !withRecalledEvolutionAsBasic(game, side, handIdx, () =>
      rules.canPlayCard(game, side, handIdx),
    )
  ) return false;

  const command = { type: "play", handUid: handCard.uid };
  if (target?.uid) command.targetUid = target.uid;
  if (fieldIndex != null) command.fieldIndex = fieldIndex;

  return dispatch(game, command);
}

export function attack(game, side, attackerUid, target) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") {
    return runRulesAction(game, () =>
      rules.attack(game, side, attackerUid, target),
    );
  }
  if (!bridge.canAct?.() || !target?.uid || !rules.canAttack(game, side, attackerUid)) {
    return false;
  }

  return dispatch(game, {
    type: "attack",
    attackerUid,
    targetUid: target.uid,
  });
}

export function attackFieldObstacle(game, side, attackerUid, obstacleId) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") {
    return runRulesAction(game, () =>
      rules.attackFieldObstacle(game, side, attackerUid, obstacleId),
    );
  }
  if (!bridge.canAct?.() || !rules.canAttack(game, side, attackerUid)) return false;

  return dispatch(game, {
    type: "attack_obstacle",
    attackerUid,
    obstacleId,
  });
}

export function endTurn(game) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);
  const bridge = bridgeFor(game);
  if (!bridge) {
    return runRulesAction(game, () => rules.endTurn(game));
  }
  if (!bridge.canAct?.()) return false;

  return dispatch(game, { type: "end_turn" });
}

export function discardToDraw(game, side, handIdx) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);

  const info = getEvolutionExchangeInfo(game, side, handIdx);
  const bridge = bridgeFor(game);

  if (!bridge || side !== "player") {
    if (!info.canExchange) return false;

    const result = runRulesAction(game, () =>
      performEvolutionExchange(
        game,
        side,
        handIdx,
        (nextGame, nextSide, silent) =>
          rules.drawCard(nextGame, nextSide, silent),
      ),
    );
    rememberPreviewGame(game);
    return result;
  }

  if (!bridge.canAct?.() || !info.canExchange) return false;
  const handCard = game.players?.player?.hand?.[handIdx];
  if (!handCard?.uid) return false;

  return dispatch(game, {
    type: "play",
    handUid: handCard.uid,
    targetUid: DISCARD_REDRAW_SENTINEL,
  });
}

function dispatchPending(game, side, targetUid) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return null;
  if (!bridge.canAct?.()) return false;
  return dispatch(game, { type: "resolve_pending", targetUid });
}

export function resolveMoldbreaker(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () =>
      runRulesAction(game, () => {
        if (game.pendingBattlecry?.ability === "glaciate") {
          return resolveGlaciateSeal(game, side, targetUid);
        }
        return rules.resolveMoldbreaker(game, side, targetUid);
      }),
  );
}

export function resolveMew(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => runRulesAction(game, () => rules.resolveMew(game, side, targetUid)),
  );
}

export function resolveSpacialRend(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => runRulesAction(game, () => rules.resolveSpacialRend(game, side, targetUid)),
  );
}

export function resolveMagmaStorm(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => runRulesAction(game, () => rules.resolveMagmaStorm(game, side, targetUid)),
  );
}

export function resolvePhioneBraveCharge(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () =>
      runRulesAction(game, () =>
        rules.resolvePhioneBraveCharge(game, side, targetUid),
      ),
  );
}

export function resolveManaphyBraveCharge(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () =>
      runRulesAction(game, () =>
        rules.resolveManaphyBraveCharge(game, side, targetUid),
      ),
  );
}

function dispatchChoice(game, side, value) {
  normalizeTypeStatusImmunities(game);
  refreshGlaciateSeals(game);
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return null;
  if (!bridge.canAct?.()) return false;
  return dispatch(game, { type: "resolve_choose", value });
}

export function resolveHyperball(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => runRulesAction(game, () => rules.resolveHyperball(game, side, value)),
  );
}

export function resolveUxie(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => runRulesAction(game, () => rules.resolveUxie(game, side, value)),
  );
}

export function resolveWishmaker(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => runRulesAction(game, () => rules.resolveWishmaker(game, side, value)),
  );
}

export function resolveDeoxysForm(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => runRulesAction(game, () => rules.resolveDeoxysForm(game, side, value)),
  );
}

export function resolveShayminForm(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => runRulesAction(game, () => rules.resolveShayminForm(game, side, value)),
  );
}
