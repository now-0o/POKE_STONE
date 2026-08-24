import * as rules from "./engine.rules.js";
import {
  getOnlineBattleBridge,
  getOnlineBattleBridgeByMatchId,
} from "./onlineBattleBridge.js";

export * from "./engine.rules.js";

function bridgeFor(game) {
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
  Promise.resolve(bridge.dispatch(command)).catch(() => {});
  return true;
}

export function createGame(deck, trainer, deckShiny = {}) {
  if (trainer?.onlineBattle && trainer?.matchId) {
    const bridge = getOnlineBattleBridgeByMatchId(trainer.matchId);
    const sharedGame = bridge?.getGame?.();
    if (sharedGame) return sharedGame;
  }
  return rules.createGame(deck, trainer, deckShiny);
}

export function canPlayCard(game, side, handIdx) {
  const bridge = bridgeFor(game);
  if (bridge && bridge.canAct && !bridge.canAct()) return false;
  return rules.canPlayCard(game, side, handIdx);
}

export function canAttack(game, side, attackerUid) {
  const bridge = bridgeFor(game);
  if (bridge && bridge.canAct && !bridge.canAct()) return false;
  return rules.canAttack(game, side, attackerUid);
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") {
    return rules.playCard(game, side, handIdx, target, fieldIndex);
  }

  if (!bridge.canAct?.()) return false;
  const handCard = game.players?.player?.hand?.[handIdx];
  if (!handCard?.uid || !rules.canPlayCard(game, side, handIdx)) return false;

  const command = { type: "play", handUid: handCard.uid };
  if (target?.uid) command.targetUid = target.uid;
  if (fieldIndex != null) command.fieldIndex = fieldIndex;
  return dispatch(game, command);
}

export function attack(game, side, attackerUid, target) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") {
    return rules.attack(game, side, attackerUid, target);
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
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") {
    return rules.attackFieldObstacle(game, side, attackerUid, obstacleId);
  }
  if (!bridge.canAct?.() || !rules.canAttack(game, side, attackerUid)) return false;
  return dispatch(game, {
    type: "attack_obstacle",
    attackerUid,
    obstacleId,
  });
}

export function endTurn(game) {
  const bridge = bridgeFor(game);
  if (!bridge) return rules.endTurn(game);
  if (!bridge.canAct?.()) return false;
  return dispatch(game, { type: "end_turn" });
}

export function discardToDraw(game, side, handIdx) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return rules.discardToDraw(game, side, handIdx);
  if (!bridge.canAct?.()) return false;
  const handCard = game.players?.player?.hand?.[handIdx];
  if (!handCard?.uid) return false;
  return dispatch(game, { type: "discard_redraw", handUid: handCard.uid });
}

function dispatchPending(game, side, targetUid) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return null;
  if (!bridge.canAct?.()) return false;
  return dispatch(game, { type: "resolve_pending", targetUid });
}

export function resolveMoldbreaker(game, side, targetUid) {
  const sent = dispatchPending(game, side, targetUid);
  return sent === null ? rules.resolveMoldbreaker(game, side, targetUid) : sent;
}

export function resolveMew(game, side, targetUid) {
  const sent = dispatchPending(game, side, targetUid);
  return sent === null ? rules.resolveMew(game, side, targetUid) : sent;
}

export function resolveSpacialRend(game, side, targetUid) {
  const sent = dispatchPending(game, side, targetUid);
  return sent === null ? rules.resolveSpacialRend(game, side, targetUid) : sent;
}

export function resolveMagmaStorm(game, side, targetUid) {
  const sent = dispatchPending(game, side, targetUid);
  return sent === null ? rules.resolveMagmaStorm(game, side, targetUid) : sent;
}

export function resolvePhioneBraveCharge(game, side, targetUid) {
  const sent = dispatchPending(game, side, targetUid);
  return sent === null ? rules.resolvePhioneBraveCharge(game, side, targetUid) : sent;
}

export function resolveManaphyBraveCharge(game, side, targetUid) {
  const sent = dispatchPending(game, side, targetUid);
  return sent === null ? rules.resolveManaphyBraveCharge(game, side, targetUid) : sent;
}

function dispatchChoice(game, side, value) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return null;
  if (!bridge.canAct?.()) return false;
  return dispatch(game, { type: "resolve_choose", value });
}

export function resolveHyperball(game, side, value) {
  const sent = dispatchChoice(game, side, value);
  return sent === null ? rules.resolveHyperball(game, side, value) : sent;
}

export function resolveUxie(game, side, value) {
  const sent = dispatchChoice(game, side, value);
  return sent === null ? rules.resolveUxie(game, side, value) : sent;
}

export function resolveWishmaker(game, side, value) {
  const sent = dispatchChoice(game, side, value);
  return sent === null ? rules.resolveWishmaker(game, side, value) : sent;
}

export function resolveDeoxysForm(game, side, value) {
  const sent = dispatchChoice(game, side, value);
  return sent === null ? rules.resolveDeoxysForm(game, side, value) : sent;
}

export function resolveShayminForm(game, side, value) {
  const sent = dispatchChoice(game, side, value);
  return sent === null ? rules.resolveShayminForm(game, side, value) : sent;
}
