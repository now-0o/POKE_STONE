import * as cynthia from "./index.js";
import { CYNTHIA_RECALL_CARD_ID } from "../../data/cards/cynthia.js";

export * from "./index.js";

function generatedSupportEntries(game) {
  if (!cynthia.isCynthiaBattle(game)) return [];
  return game.players.enemy.hand.filter((entry) => entry.cynthiaGenerated);
}

function removeGeneratedByUid(game, uids) {
  if (!uids.size) return;
  game.players.enemy.hand = game.players.enemy.hand.filter(
    (entry) => !uids.has(entry.uid),
  );
}

function removeSupportGrantLogs(game, startIndex = 0) {
  const before = game.log.slice(0, startIndex);
  const after = game.log.slice(startIndex).filter(
    (message) =>
      !(
        typeof message === "string" &&
        message.startsWith("난천이 ") &&
        message.endsWith("을 준비했다.")
      ),
  );
  game.log = [...before, ...after];
}

function removeCynthiaFatigueLogs(game, startIndex = 0) {
  const before = game.log.slice(0, startIndex);
  const after = game.log.slice(startIndex).filter(
    (message) =>
      !(
        typeof message === "string" &&
        message.includes("덱이 비었다!") &&
        message.includes("탈진 피해")
      ),
  );
  game.log = [...before, ...after];
}

function suppressCynthiaFatigue(game, beforeFatigue, logStart) {
  if (!cynthia.isCynthiaBattle(game)) return;

  const enemy = game.players.enemy;
  const afterFatigue = Math.max(0, Number(enemy.fatigue) || 0);
  const safeBefore = Math.max(0, Number(beforeFatigue) || 0);

  if (afterFatigue <= safeBefore) return;

  const fatigueCount = afterFatigue - safeBefore;
  const fatigueDamage =
    ((safeBefore + 1 + afterFatigue) * fatigueCount) / 2;

  if (Number.isFinite(enemy.hp)) {
    const maxHp = Number.isFinite(enemy.maxHp) ? enemy.maxHp : Infinity;
    enemy.hp = Math.min(maxHp, enemy.hp + fatigueDamage);
  }

  // 난천은 일반 드로우를 하지 않으므로 빈 덱으로 인한 탈진 자체를 누적하지 않는다.
  enemy.fatigue = safeBefore;
  removeCynthiaFatigueLogs(game, logStart);

  if (game.winner === "player" && enemy.hp > 0) {
    game.winner = null;
  }
}

function dispatchCynthiaRecallStart(game) {
  if (typeof window === "undefined") return;

  const active = game.players.enemy.field[0];
  if (!active?.cardId) return;

  window.dispatchEvent(
    new CustomEvent("cynthia-recall-start", {
      detail: {
        outgoingCardId: active.cardId,
        outgoingUid: active.uid || null,
      },
    }),
  );
}

function dispatchCynthiaRecallCancel() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cynthia-recall-cancel"));
}

function balanceEnteredEnemyTurn(game, beforeSupportUids, logStart) {
  if (!cynthia.isCynthiaBattle(game) || game.winner || game.turn !== "enemy") {
    return;
  }

  game._cynthiaSupportTurnCount = (game._cynthiaSupportTurnCount || 0) + 1;

  const generatedAfter = generatedSupportEntries(game);
  const newlyGenerated = generatedAfter.filter(
    (entry) => !beforeSupportUids.has(entry.uid),
  );

  if (!newlyGenerated.length) return;

  const alreadyHadSupport = beforeSupportUids.size > 0;
  const supportTurn = game._cynthiaSupportTurnCount % 2 === 0;

  // 기술/도구는 난천의 두 번째 자기 턴부터 2턴마다 한 번만 지급한다.
  // 기존 생성 카드가 손에 남아 있으면 해당 지급 기회는 건너뛴다.
  if (!supportTurn || alreadyHadSupport) {
    removeGeneratedByUid(
      game,
      new Set(newlyGenerated.map((entry) => entry.uid)),
    );
    removeSupportGrantLogs(game, logStart);
  }
}

export function createGame(playerDeckIds, trainer) {
  const game = cynthia.createGame(playerDeckIds, trainer);

  if (!cynthia.isCynthiaBattle(game)) return game;

  game._cynthiaSupportTurnCount = game.turn === "enemy" ? 1 : 0;

  // 기존 엔진은 선공 난천에게 첫 턴부터 기술/도구를 지급한다.
  // 밸런스 규칙에서는 첫 난천 턴을 쉬는 턴으로 취급해 제거한다.
  if (game.turn === "enemy") {
    const openingSupport = generatedSupportEntries(game);
    if (openingSupport.length) {
      removeGeneratedByUid(
        game,
        new Set(openingSupport.map((entry) => entry.uid)),
      );
      removeSupportGrantLogs(game, 0);
    }
  }

  return game;
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const handCard = game.players[side]?.hand?.[handIdx] || null;
  const isRecall =
    cynthia.isCynthiaBattle(game) &&
    side === "enemy" &&
    handCard?.cardId === CYNTHIA_RECALL_CARD_ID;

  const animateRecall = isRecall && cynthia.canPlayCard(game, side, handIdx);

  // 교체가 실제로 성립하기 직전, 아직 기존 포켓몬이 DOM에 있을 때 회수 연출 좌표를 잡는다.
  if (animateRecall) {
    dispatchCynthiaRecallStart(game);
  }

  const result = cynthia.playCard(game, side, handIdx, target, fieldIndex);

  if (animateRecall && !result) {
    dispatchCynthiaRecallCancel();
  }

  return result;
}

export function endTurn(game) {
  const endingSide = game.turn;
  const beforeSupportUids = new Set(
    generatedSupportEntries(game).map((entry) => entry.uid),
  );
  const logStart = game.log.length;
  const beforeEnemyFatigue = cynthia.isCynthiaBattle(game)
    ? game.players.enemy.fatigue || 0
    : 0;

  const result = cynthia.endTurn(game);

  if (cynthia.isCynthiaBattle(game)) {
    suppressCynthiaFatigue(game, beforeEnemyFatigue, logStart);
  }

  if (
    cynthia.isCynthiaBattle(game) &&
    endingSide === "player" &&
    game.turn === "enemy" &&
    !game.winner
  ) {
    balanceEnteredEnemyTurn(game, beforeSupportUids, logStart);
  }

  return result;
}
