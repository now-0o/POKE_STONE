import * as rules from "./engine.rules.js";
import {
  getOnlineBattleBridge,
  getOnlineBattleBridgeByMatchId,
} from "./onlineBattleBridge.js";

export * from "./engine.rules.js";

const DISCARD_REDRAW_SENTINEL = "__discard_redraw__";

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

function optimisticApply(callback) {
  try {
    callback();
  } catch {
    // 서버 권위 상태가 곧 다시 동기화되므로 화면 선반영 실패는 무시한다.
  }
}

function finishPendingDispatch(sent, callback) {
  if (sent === null) return callback();
  if (!sent) return false;
  optimisticApply(callback);
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

  const accepted = dispatch(game, command);
  if (!accepted) return false;

  optimisticApply(() =>
    rules.playCard(game, side, handIdx, target, fieldIndex),
  );
  return true;
}

export function attack(game, side, attackerUid, target) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") {
    return rules.attack(game, side, attackerUid, target);
  }
  if (!bridge.canAct?.() || !target?.uid || !rules.canAttack(game, side, attackerUid)) {
    return false;
  }

  const accepted = dispatch(game, {
    type: "attack",
    attackerUid,
    targetUid: target.uid,
  });
  if (!accepted) return false;

  optimisticApply(() => rules.attack(game, side, attackerUid, target));
  return true;
}

export function attackFieldObstacle(game, side, attackerUid, obstacleId) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") {
    return rules.attackFieldObstacle(game, side, attackerUid, obstacleId);
  }
  if (!bridge.canAct?.() || !rules.canAttack(game, side, attackerUid)) return false;

  const accepted = dispatch(game, {
    type: "attack_obstacle",
    attackerUid,
    obstacleId,
  });
  if (!accepted) return false;

  optimisticApply(() =>
    rules.attackFieldObstacle(game, side, attackerUid, obstacleId),
  );
  return true;
}

export function endTurn(game) {
  const bridge = bridgeFor(game);
  if (!bridge) return rules.endTurn(game);
  if (!bridge.canAct?.()) return false;

  const accepted = dispatch(game, { type: "end_turn" });
  if (!accepted) return false;

  // 비호스트는 상대 덱/손패가 가려져 있어 전체 endTurn을 로컬에서 실행하면
  // 숨김 정보가 깨질 수 있다. 버튼/조작감만 즉시 바뀌도록 턴 표시만 선반영한다.
  if (game.turn === "player") game.turn = "enemy";
  return true;
}

export function discardToDraw(game, side, handIdx) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return rules.discardToDraw(game, side, handIdx);
  if (!bridge.canAct?.()) return false;
  const handCard = game.players?.player?.hand?.[handIdx];
  if (!handCard?.uid) return false;

  // 구버전 EC2도 이미 지원하는 play 명령에 sentinel을 실어 보낸다.
  // 따라서 백엔드가 discard_redraw whitelist 반영 전이어도 동일하게 처리 가능하다.
  const accepted = dispatch(game, {
    type: "play",
    handUid: handCard.uid,
    targetUid: DISCARD_REDRAW_SENTINEL,
  });
  if (!accepted) return false;

  optimisticApply(() => rules.discardToDraw(game, side, handIdx));
  return true;
}

function dispatchPending(game, side, targetUid) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return null;
  if (!bridge.canAct?.()) return false;
  return dispatch(game, { type: "resolve_pending", targetUid });
}

export function resolveMoldbreaker(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => rules.resolveMoldbreaker(game, side, targetUid),
  );
}

export function resolveMew(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => rules.resolveMew(game, side, targetUid),
  );
}

export function resolveSpacialRend(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => rules.resolveSpacialRend(game, side, targetUid),
  );
}

export function resolveMagmaStorm(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => rules.resolveMagmaStorm(game, side, targetUid),
  );
}

export function resolvePhioneBraveCharge(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => rules.resolvePhioneBraveCharge(game, side, targetUid),
  );
}

export function resolveManaphyBraveCharge(game, side, targetUid) {
  return finishPendingDispatch(
    dispatchPending(game, side, targetUid),
    () => rules.resolveManaphyBraveCharge(game, side, targetUid),
  );
}

function dispatchChoice(game, side, value) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return null;
  if (!bridge.canAct?.()) return false;
  return dispatch(game, { type: "resolve_choose", value });
}

export function resolveHyperball(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => rules.resolveHyperball(game, side, value),
  );
}

export function resolveUxie(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => rules.resolveUxie(game, side, value),
  );
}

export function resolveWishmaker(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => rules.resolveWishmaker(game, side, value),
  );
}

export function resolveDeoxysForm(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => rules.resolveDeoxysForm(game, side, value),
  );
}

export function resolveShayminForm(game, side, value) {
  return finishPendingDispatch(
    dispatchChoice(game, side, value),
    () => rules.resolveShayminForm(game, side, value),
  );
}
