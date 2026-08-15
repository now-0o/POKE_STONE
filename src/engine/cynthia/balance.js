import * as cynthia from "./index.js";

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

export function endTurn(game) {
  const endingSide = game.turn;
  const beforeSupportUids = new Set(
    generatedSupportEntries(game).map((entry) => entry.uid),
  );
  const logStart = game.log.length;

  const result = cynthia.endTurn(game);

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
