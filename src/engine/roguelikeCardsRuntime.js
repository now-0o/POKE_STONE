import { CARD_MAP } from "../data/cards.js";

const EFFECTS = new Set([
  "rogue_search_pokemon",
  "rogue_search_support",
  "rogue_search_evolution",
  "rogue_search_high_cost",
  "rogue_draw_two",
  "rogue_search_pair",
  "rogue_search_duplicate",
]);

function pushLog(game, message) {
  if (!Array.isArray(game?.log) || !message) return;
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

function moveDeckIndexToTop(player, index) {
  if (!player || index < 0 || index >= player.deck.length) return false;
  const [cardId] = player.deck.splice(index, 1);
  player.deck.push(cardId);
  return true;
}

function randomCandidateIndex(player, predicate) {
  const candidates = [];
  player.deck.forEach((cardId, index) => {
    const card = CARD_MAP[cardId];
    if (card && predicate(card, cardId)) candidates.push(index);
  });
  if (!candidates.length) return -1;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function highestCostIndex(player) {
  let maxCost = -1;
  const candidates = [];
  player.deck.forEach((cardId, index) => {
    const cost = Number(CARD_MAP[cardId]?.cost) || 0;
    if (cost > maxCost) {
      maxCost = cost;
      candidates.length = 0;
      candidates.push(index);
    } else if (cost === maxCost) {
      candidates.push(index);
    }
  });
  return candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : -1;
}

function searchAndDraw(game, side, predicate, drawCard, label) {
  const player = game.players?.[side];
  if (!player || player.hand.length >= 10) return false;
  const index = randomCandidateIndex(player, predicate);
  if (index < 0) {
    pushLog(game, `${label}: 조건에 맞는 카드가 덱에 없다.`);
    return false;
  }
  const cardId = player.deck[index];
  moveDeckIndexToTop(player, index);
  drawCard(game, side, true);
  pushLog(game, `${label}: ${CARD_MAP[cardId]?.name || "카드"}을(를) 손으로 가져왔다.`);
  return true;
}

function plainDraw(game, side, drawCard, count) {
  const player = game.players?.[side];
  if (!player) return 0;
  let drawn = 0;
  for (let i = 0; i < count; i += 1) {
    if (!player.deck.length || player.hand.length >= 10) break;
    const before = player.hand.length;
    drawCard(game, side, true);
    if (player.hand.length > before) drawn += 1;
  }
  return drawn;
}

export function isRoguelikeCardEffect(card) {
  return !!card?.roguelikeOnly && EFFECTS.has(card.spell?.effect);
}

export function playRoguelikeCard(game, side, handIdx, card, drawCard, effectiveCost) {
  if (!isRoguelikeCardEffect(card)) return null;
  const player = game.players?.[side];
  const handCard = player?.hand?.[handIdx];
  if (!player || !handCard || handCard.cardId !== card.id) return false;
  if (game.winner || game.turn !== side) return false;

  const cost = Math.max(0, effectiveCost(card, game, side, handCard));
  if (cost > player.mana) return false;

  player.mana -= cost;
  player.hand.splice(handIdx, 1);

  const effect = card.spell.effect;
  if (effect === "rogue_search_pokemon") {
    searchAndDraw(game, side, (entry) => entry.kind === "pokemon", drawCard, card.name);
  } else if (effect === "rogue_search_support") {
    searchAndDraw(game, side, (entry) => entry.kind !== "pokemon", drawCard, card.name);
  } else if (effect === "rogue_search_evolution") {
    searchAndDraw(
      game,
      side,
      (entry) => entry.kind === "pokemon" && !!entry.evolvesFrom,
      drawCard,
      card.name,
    );
  } else if (effect === "rogue_search_high_cost") {
    const index = highestCostIndex(player);
    if (index >= 0 && player.hand.length < 10) {
      const cardId = player.deck[index];
      moveDeckIndexToTop(player, index);
      drawCard(game, side, true);
      pushLog(game, `${card.name}: ${CARD_MAP[cardId]?.name || "카드"}을(를) 손으로 가져왔다.`);
    }
  } else if (effect === "rogue_draw_two") {
    const count = plainDraw(game, side, drawCard, 2);
    pushLog(game, `${card.name}: 카드 ${count}장을 뽑았다.`);
  } else if (effect === "rogue_search_pair") {
    const first = searchAndDraw(
      game,
      side,
      (entry) => entry.kind === "pokemon",
      drawCard,
      card.name,
    );
    const second = searchAndDraw(
      game,
      side,
      (entry) => entry.kind !== "pokemon",
      drawCard,
      card.name,
    );
    if (!first && !second) pushLog(game, `${card.name}: 가져올 카드가 없었다.`);
  } else if (effect === "rogue_search_duplicate") {
    const handIds = new Set((player.hand || []).map((entry) => entry.cardId));
    const found = searchAndDraw(
      game,
      side,
      (_entry, cardId) => handIds.has(cardId),
      drawCard,
      card.name,
    );
    if (!found) {
      const count = plainDraw(game, side, drawCard, 1);
      if (count) pushLog(game, `${card.name}: 같은 카드가 없어 대신 카드 1장을 뽑았다.`);
    }
  }

  game.lastAction = {
    kind: "play",
    side,
    cardId: card.id,
    anim: "spell",
    roguelike: true,
    impacts: [],
  };
  return true;
}
