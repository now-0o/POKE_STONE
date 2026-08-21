import { CARD_MAP, DEX, MAX_COPIES } from "../data/cards.js";

export const SHINY_DUPLICATE_CHANCE = 0.02;

function clampInt(value, min, max) {
  const n = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 0;
  return Math.max(min, Math.min(max, n));
}

function countDeck(deck, cardId) {
  return (deck || []).reduce((count, id) => count + (id === cardId ? 1 : 0), 0);
}

export function isShinyEligible(card) {
  return card?.kind === "pokemon" && DEX[card.id] != null;
}

export function shinySpriteUrl(cardId, spriteId = null) {
  const key = spriteId ?? DEX[cardId];
  return key == null ? null : `/sprites/pokemon/shiny/${key}.png`;
}

function normalizeShinyMap(map, deck, shinyCollection) {
  const next = {};
  Object.entries(map || {}).forEach(([cardId, value]) => {
    const card = CARD_MAP[cardId];
    if (!card || !isShinyEligible(card)) return;
    const deckCount = countDeck(deck, cardId);
    const shinyOwned = clampInt(shinyCollection?.[cardId] || 0, 0, deckCount || 99);
    const allowed = Math.min(deckCount, shinyOwned);
    const amount = clampInt(value, 0, allowed);
    if (amount > 0) next[cardId] = amount;
  });
  return next;
}

export function ensureShinyState(save) {
  if (!save) return save;
  if (!save.collection || typeof save.collection !== "object") save.collection = {};
  if (!save.shinyCollection || typeof save.shinyCollection !== "object") {
    save.shinyCollection = {};
  }

  const normalizedCollection = {};
  Object.entries(save.shinyCollection).forEach(([cardId, value]) => {
    const card = CARD_MAP[cardId];
    if (!card || !isShinyEligible(card)) return;
    const owned = Math.max(0, save.collection[cardId] || 0);
    const max = Math.min(MAX_COPIES[card.rarity] ?? 2, owned);
    const amount = clampInt(value, 0, max);
    if (amount > 0) normalizedCollection[cardId] = amount;
  });
  save.shinyCollection = normalizedCollection;

  save.deckShiny = normalizeShinyMap(
    save.deckShiny,
    Array.isArray(save.deck) ? save.deck : [],
    save.shinyCollection,
  );

  if (Array.isArray(save.deckPresets)) {
    save.deckPresets = save.deckPresets.map((preset) => ({
      ...preset,
      deckShiny: normalizeShinyMap(
        preset?.deckShiny,
        Array.isArray(preset?.deck) ? preset.deck : [],
        save.shinyCollection,
      ),
    }));
  }

  return save;
}

export function shinyOwned(save, cardId) {
  ensureShinyState(save);
  return save?.shinyCollection?.[cardId] || 0;
}

export function shinyInDeck(save, cardId) {
  ensureShinyState(save);
  return save?.deckShiny?.[cardId] || 0;
}

export function normalInDeck(save, cardId) {
  return Math.max(0, countDeck(save?.deck, cardId) - shinyInDeck(save, cardId));
}

export function canAddDeckVariant(save, cardId, shiny = false) {
  ensureShinyState(save);
  const card = CARD_MAP[cardId];
  if (!card) return false;
  const total = countDeck(save.deck, cardId);
  const owned = save.collection[cardId] || 0;
  const max = Math.min(MAX_COPIES[card.rarity] ?? 2, owned);
  if (save.deck.length >= 30 || total >= max) return false;
  if (shiny && (save.deckShiny?.[cardId] || 0) >= (save.shinyCollection?.[cardId] || 0)) {
    return false;
  }
  return true;
}

export function addDeckVariant(save, cardId, shiny = false) {
  if (!canAddDeckVariant(save, cardId, shiny)) return false;

  // 이로치 수를 덱 배열 변경 전에 확정한다.
  // 덱을 먼저 바꾼 뒤 shinyInDeck()을 호출하면 ensureShinyState()가
  // 중간 상태를 정규화하게 되어 저장 타이밍에 따라 일반 카드로 내려갈 수 있다.
  const previousShinyCount = save.deckShiny?.[cardId] || 0;

  save.deck = [...save.deck, cardId];
  save.deckShiny = { ...(save.deckShiny || {}) };

  if (shiny) {
    save.deckShiny[cardId] = previousShinyCount + 1;
  }

  // 최종 상태에서 한 번만 정규화하고 활성 프리셋에도 같은 스냅샷을 저장한다.
  ensureShinyState(save);
  syncActivePresetVariants(save);
  return true;
}

export function removeDeckVariant(save, cardId, shiny = false) {
  ensureShinyState(save);
  const index = save.deck.indexOf(cardId);
  if (index === -1) return false;
  const shinyCount = save.deckShiny?.[cardId] || 0;
  const normalCount = countDeck(save.deck, cardId) - shinyCount;
  if (shiny && shinyCount <= 0) return false;
  if (!shiny && normalCount <= 0) return false;

  save.deck = [...save.deck.slice(0, index), ...save.deck.slice(index + 1)];
  save.deckShiny = { ...(save.deckShiny || {}) };

  if (shiny) {
    const next = shinyCount - 1;
    if (next > 0) save.deckShiny[cardId] = next;
    else delete save.deckShiny[cardId];
  }

  ensureShinyState(save);
  syncActivePresetVariants(save);
  return true;
}

export function clearDeckVariants(save) {
  save.deck = [];
  save.deckShiny = {};
  syncActivePresetVariants(save);
}

export function syncActivePresetVariants(save) {
  ensureShinyState(save);
  if (!Array.isArray(save.deckPresets)) return;
  const active = save.activeDeckPreset || 0;
  save.deckPresets = save.deckPresets.map((preset, index) =>
    index === active
      ? { ...preset, deck: [...save.deck], deckShiny: { ...save.deckShiny } }
      : preset,
  );
}

export function selectDeckPreset(save, index) {
  ensureShinyState(save);
  if (!Array.isArray(save.deckPresets) || !save.deckPresets[index]) return false;
  syncActivePresetVariants(save);
  const next = save.deckPresets[index];
  save.activeDeckPreset = index;
  save.deck = [...(next.deck || [])];
  save.deckShiny = { ...(next.deckShiny || {}) };
  ensureShinyState(save);
  return true;
}

export function getDeckVariantRows(save) {
  ensureShinyState(save);
  const ids = [...new Set(save.deck || [])];
  const rows = [];
  ids.forEach((cardId) => {
    const card = CARD_MAP[cardId];
    if (!card) return;
    const total = countDeck(save.deck, cardId);
    const shinyCount = save.deckShiny?.[cardId] || 0;
    const normalCount = Math.max(0, total - shinyCount);
    if (normalCount > 0) rows.push({ card, count: normalCount, shiny: false });
    if (shinyCount > 0) rows.push({ card, count: shinyCount, shiny: true });
  });
  return rows;
}

export function buildOwnedVariants(cards, save) {
  ensureShinyState(save);
  return (cards || []).flatMap((card) => [
    { card, shiny: false },
    ...(shinyOwned(save, card.id) > 0 ? [{ card, shiny: true }] : []),
  ]);
}
