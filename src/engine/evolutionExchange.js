import { CARD_MAP } from "../data/cards.js";

export const THREE_STAGE_FINAL_BUFF = Object.freeze({ atk: 2, hp: 2 });

const FINAL_BUFF_MARK = "__pokestoneThreeStageFinalBuffV1";

export function applyThreeStageFinalStatBuff() {
  for (const card of Object.values(CARD_MAP)) {
    if (!card || card.kind !== "pokemon" || card.stage !== 2) continue;
    if (card[FINAL_BUFF_MARK]) continue;

    card.atk = (Number(card.atk) || 0) + THREE_STAGE_FINAL_BUFF.atk;
    card.hp = (Number(card.hp) || 0) + THREE_STAGE_FINAL_BUFF.hp;

    try {
      Object.defineProperty(card, FINAL_BUFF_MARK, {
        value: true,
        enumerable: false,
        configurable: true,
      });
    } catch {
      card[FINAL_BUFF_MARK] = true;
    }
  }
}

// main.jsx에서 지방별 카드 확장을 먼저 등록한 뒤 Battle/App이 로드되므로,
// 엔진 모듈이 평가되는 시점에 최종 진화체의 표시/실전 스탯을 함께 올린다.
applyThreeStageFinalStatBuff();

function exchangeTurnKey(game, side) {
  return `${game?.turnCount ?? 0}:${game?.turn ?? "none"}:${side}`;
}

function ensureExchangeTurnState(game, side) {
  const player = game?.players?.[side];
  if (!player) return 0;

  const key = exchangeTurnKey(game, side);
  if (player._evolutionExchangeTurnKey !== key) {
    player._evolutionExchangeTurnKey = key;
    player._evolutionExchangeCount = 0;
  }

  if (!Number.isInteger(player._evolutionExchangeCount)) {
    player._evolutionExchangeCount = 0;
  }

  return Math.max(0, player._evolutionExchangeCount);
}

function hasEvolutionLineSource(player, cardId, visited = new Set()) {
  const card = CARD_MAP[cardId];
  const fromId = card?.evolvesFrom;
  if (!fromId || visited.has(cardId)) return false;

  visited.add(cardId);

  // 바로 아래 진화 단계가 이미 필드에 있으면 현재 카드는 진화에 사용할 수 있다.
  if (
    (player.field || []).some(
      (unit) => unit?.cardId === fromId && unit.hp > 0 && !unit.noEvolve,
    )
  ) {
    return true;
  }

  // 아래 단계가 손에 있다면 그 카드까지 이어지는 진화 라인이 있는지 재귀 확인한다.
  const hasFromInHand = (player.hand || []).some(
    (entry) => entry?.cardId === fromId,
  );
  if (!hasFromInHand) return false;

  const fromCard = CARD_MAP[fromId];
  if (!fromCard?.evolvesFrom) return true;

  return hasEvolutionLineSource(player, fromId, visited);
}

export function getEvolutionExchangeInfo(game, side, handIdx) {
  const player = game?.players?.[side];
  const handCard = player?.hand?.[handIdx];
  const card = CARD_MAP[handCard?.cardId];
  const used = ensureExchangeTurnState(game, side);
  const cost = used + 1;

  const isEvolution =
    card?.kind === "pokemon" &&
    !!card.evolvesFrom;
  const lineConnected =
    isEvolution && player
      ? hasEvolutionLineSource(player, card.id)
      : false;
  const show = !!isEvolution && !lineConnected;

  let reason = null;
  if (!show) {
    reason = lineConnected ? "현재 손패와 필드로 진화 라인을 이어갈 수 있습니다." : "교환 대상이 아닙니다.";
  } else if (game?.turn !== side) {
    reason = "내 턴에만 교환할 수 있습니다.";
  } else if (game?.winner) {
    reason = "배틀이 종료되었습니다.";
  } else if (game?.pendingBattlecry) {
    reason = "먼저 진행 중인 선택을 완료해야 합니다.";
  } else if (handCard?._glaciateSealedByUid) {
    reason = "봉인된 카드는 교환할 수 없습니다.";
  } else if (!player?.deck?.length) {
    reason = "덱에 교환해 뽑을 다른 카드가 없습니다.";
  } else if ((player?.mana || 0) < cost) {
    reason = `교환에 ${cost}코스트가 필요합니다.`;
  }

  return {
    show,
    canExchange: show && reason === null,
    cost,
    used,
    card,
    handCard,
    reason,
  };
}

function restoreShinyToDeck(player, handCard) {
  if (!handCard?.shiny || CARD_MAP[handCard.cardId]?.kind !== "pokemon") return;
  player._shinyDeckRemaining = player._shinyDeckRemaining || {};
  player._shinyDeckRemaining[handCard.cardId] =
    (player._shinyDeckRemaining[handCard.cardId] || 0) + 1;
}

function insertReturnedCard(player, cardId) {
  const index = Math.floor(Math.random() * (player.deck.length + 1));
  player.deck.splice(index, 0, cardId);
}

export function performEvolutionExchange(game, side, handIdx, drawCard) {
  const info = getEvolutionExchangeInfo(game, side, handIdx);
  if (!info.canExchange || typeof drawCard !== "function") return false;

  const player = game.players[side];
  const [returned] = player.hand.splice(handIdx, 1);
  if (!returned) return false;

  player.mana = Math.max(0, player.mana - info.cost);

  // 교환한 카드가 같은 교환에서 즉시 다시 뽑히지 않도록 먼저 1장을 뽑고,
  // 그 뒤 교환 카드를 덱의 무작위 위치에 되돌린다.
  drawCard(game, side, true);
  restoreShinyToDeck(player, returned);
  insertReturnedCard(player, returned.cardId);

  player._evolutionExchangeCount = info.used + 1;

  if (Array.isArray(game.log)) {
    const ownerName = player.name || (side === "player" ? "플레이어" : "상대");
    const cardName = info.card?.name || returned.cardId || "진화 카드";
    game.log.push(
      `[교환] ${ownerName}: ${cardName}을(를) ${info.cost}코스트로 교환했다.`,
    );
    if (game.log.length > 60) game.log.shift();
  }

  return true;
}
