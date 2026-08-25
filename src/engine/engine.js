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

function finishPendingDispatch(sent, callback) {
  // 오프라인/AI는 기존처럼 즉시 엔진을 실행한다.
  if (sent === null) return callback();

  // 온라인은 명령 전송만 하고, 실제 게임 상태/이펙트는 호스트가 확정한
  // revision을 수신했을 때 한 번만 반영한다. 같은 행동을 로컬에서도 실행하면
  // optimistic -> rollback -> commit 순서로 lastAction이 왕복하며 연출이 중복된다.
  return sent !== false;
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

  // 온라인에서는 로컬 state를 먼저 mutate하지 않는다.
  // 45ms polling/active confirm 뒤 도착하는 확정 revision만 Battle에 먹인다.
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

  // 날씨/턴 시작 효과까지 포함한 전체 endTurn은 호스트에서 단 한 번 실행한다.
  // 로컬에서 turn만 먼저 뒤집어도 한 클라이언트만 턴 효과를 본 것처럼 보일 수 있다.
  return dispatch(game, { type: "end_turn" });
}

export function discardToDraw(game, side, handIdx) {
  const bridge = bridgeFor(game);
  if (!bridge || side !== "player") return rules.discardToDraw(game, side, handIdx);
  if (!bridge.canAct?.()) return false;
  const handCard = game.players?.player?.hand?.[handIdx];
  if (!handCard?.uid) return false;

  // 구버전 EC2도 이미 지원하는 play 명령에 sentinel을 실어 보낸다.
  // 따라서 백엔드가 discard_redraw whitelist 반영 전이어도 동일하게 처리 가능하다.
  return dispatch(game, {
    type: "play",
    handUid: handCard.uid,
    targetUid: DISCARD_REDRAW_SENTINEL,
  });
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