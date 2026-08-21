import * as core from "./unova-legendary-balance.js";
import { CARD_MAP } from "../data/cards.js";

export * from "./unova-legendary-balance.js";

function withVoltSwitchReplay(card, handCard, callback) {
  if (!card?.evolvesFrom || !handCard?._voltSwitchFreePlay) return callback();
  const evolvesFrom = card.evolvesFrom;
  card.evolvesFrom = null;
  try {
    return callback();
  } finally {
    card.evolvesFrom = evolvesFrom;
  }
}

function markVoltSwitchReturn(player, beforeField, beforeHandUids) {
  if (!player || !beforeField) return;
  for (const handCard of player.hand || []) {
    if (beforeHandUids?.has(handCard.uid)) continue;
    const returned = beforeField.get(handCard.uid);
    if (!returned) continue;
    const returnedCard = CARD_MAP[handCard.cardId];
    if (returnedCard?.kind === "pokemon" && returnedCard.evolvesFrom) {
      handCard._voltSwitchFreePlay = true;
    }
  }
}

export function canPlayCard(game, side, handIdx) {
  const player = game?.players?.[side];
  const handCard = player?.hand?.[handIdx];
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  if (!handCard || !card) return false;
  return withVoltSwitchReplay(card, handCard, () =>
    core.canPlayCard(game, side, handIdx),
  );
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const player = game?.players?.[side];
  const handCard = player?.hand?.[handIdx];
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  if (!player || !handCard || !card) return false;

  const isVoltSwitch = card.id === "voltswitch";
  const beforeField = isVoltSwitch
    ? new Map(player.field.map((unit) => [unit.uid, { ...unit }]))
    : null;
  const beforeHandUids = isVoltSwitch
    ? new Set(player.hand.map((entry) => entry.uid))
    : null;

  const result = withVoltSwitchReplay(card, handCard, () =>
    core.playCard(game, side, handIdx, target, fieldIndex),
  );

  if (result && isVoltSwitch) {
    markVoltSwitchReturn(player, beforeField, beforeHandUids);
  }
  return result;
}
