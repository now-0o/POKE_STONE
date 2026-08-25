import * as rules from "./engine.rules.js";
import { CARD_MAP } from "../data/cards.js";
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
    if (!match(game.log[i])) continue;

    // 진화 직후 전투의 함성/특성 로그가 여러 줄 붙어도 좌측 전투 로그에서
    // 진화 이벤트가 묻히지 않도록 기존 짧은 문구를 제거한 뒤 최신 항목으로 올린다.
    game.log.splice(i, 1);
    game.log.push(replacement);
    if (game.log.length > 60) game.log.shift();
    return;
  }

  // 구형/특수 엔진 경로에서 짧은 진화 문구가 없더라도 진화 자체는 로그에 남긴다.
  game.log.push(replacement);
  if (game.log.length > 60) game.log.shift();
}

function enrichEvolutionLog(game, side, card, source, result) {
  if (!result || !card || !source) return;

  const player = game.players?.[side];
  const evolved = player?.field?.find((unit) => unit.uid === source.uid);
  if (!evolved) return;

  const ownerName = player?.name || (side === "player" ? "플레이어" : "상대");

  if (card.kind === "pokemon" && card.evolvesFrom && evolved.cardId === card.id) {
    const oldLog = `${evolved.name}(으)로 진화했다!`;
    promoteLatestEvolutionLog(
      game,
      (line) => line === oldLog,
      `[진화] ${ownerName}: ${source.name} → ${evolved.name}`,
    );
    return;
  }

  if (card.kind === "mega" && evolved.mega) {
    const oldLog = `${evolved.name}(으)로 메가진화했다!!`;
    promoteLatestEvolutionLog(
      game,
      (line) => line === oldLog,
      `[메가진화] ${ownerName}: ${source.name} → ${evolved.name}`,
    );
  }
}

export function createGame(deck, trainer, deckShiny = {}) {
  if (trainer?.onlineBattle && trainer?.matchId) {
    const bridge = getOnlineBattleBridgeByMatchId(trainer.matchId);
    const sharedGame = bridge?.getGame?.();
    if (sharedGame) return sharedGame;
  }

  // 온라인 배틀에서는 상대 덱이 trainer(enemy) 경로로 생성된다.
  // player 쪽 퀘스트는 base 엔진이 이미 첫 손패에 강제하지만 enemy 쪽은
  // trainer.startingCard를 통해서만 보장되므로 같은 규칙을 연결한다.
  let resolvedTrainer = trainer;
  if (
    trainer?.onlineBattle &&
    Array.isArray(trainer.deck) &&
    trainer.deck.includes("letsgo_eevee") &&
    !trainer.startingCard
  ) {
    resolvedTrainer = { ...trainer, startingCard: "letsgo_eevee" };
  }

  return rules.createGame(deck, resolvedTrainer, deckShiny);
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
    const handCard = game.players?.[side]?.hand?.[handIdx];
    const card = CARD_MAP[handCard?.cardId];
    const source = evolutionSource(game, side, card, target);
    const result = rules.playCard(game, side, handIdx, target, fieldIndex);
    enrichEvolutionLog(game, side, card, source, result);
    return result;
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
