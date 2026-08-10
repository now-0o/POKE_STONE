// ============================================================
// 세이브/경제 시스템 (localStorage: pkm_stone_v1)
// ============================================================

import {
  PACKS,
  CARDS,
  CARD_MAP,
  STARTER_DECK,
  DEX,
  PACK_PRICE,
  PACK_SIZE,
  RARITY_WEIGHTS,
  RARITY_REFUND,
  MAX_COPIES,
} from "../data/cards.js";

const SAVE_KEY = "pkm_stone_v1";
export const LOSE_REWARD = 30;

export const DECK_PRESET_COUNT = 3;

export function ensureDeckPresets(save) {
  if (!save) return save;

  const currentDeck = Array.isArray(save.deck) ? [...save.deck] : [];

  const oldPresets = Array.isArray(save.deckPresets) ? save.deckPresets : [];

  let active = Number.isInteger(save.activeDeckPreset)
    ? save.activeDeckPreset
    : 0;

  if (active < 0 || active >= DECK_PRESET_COUNT) {
    active = 0;
  }

  save.deckPresets = Array.from({ length: DECK_PRESET_COUNT }, (_, index) => {
    const old = oldPresets[index];

    return {
      name: old?.name?.trim() || (index === 0 ? "기본 덱" : `덱 ${index + 1}`),

      deck: Array.isArray(old?.deck) ? [...old.deck] : [],
    };
  });

  save.activeDeckPreset = active;

  /*
   * 현재 실제 사용 중인 save.deck을
   * 활성화된 프리셋과 항상 일치시킨다.
   */
  save.deckPresets[active] = {
    ...save.deckPresets[active],
    deck: [...currentDeck],
  };

  return save;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const save = JSON.parse(raw);
      // v3 업데이트 호환: 더 이상 없는 카드 ID는 컬렉션/덱에서 정리
      Object.keys(save.collection || {}).forEach((id) => {
        if (!CARD_MAP[id]) delete save.collection[id];
      });
      // 존재하지 않는 카드 제거 + 보유/레어도 매수 제한 초과분 정리
      const kept = [];
      const counts = {};
      (save.deck || []).forEach((id) => {
        const card = CARD_MAP[id];
        if (!card) return;
        const limit = Math.min(
          MAX_COPIES[card.rarity],
          save.collection[id] || 0,
        );
        counts[id] = (counts[id] || 0) + 1;
        if (counts[id] <= limit) kept.push(id);
      });
      save.deck = kept;
      ensureDeckPresets(save);
      return save;
    }
  } catch (e) {
    /* 무시하고 새로 시작 */
  }
  return newSave();
}

export function newSave() {
  const collection = {};
  STARTER_DECK.forEach((id) => {
    collection[id] = (collection[id] || 0) + 1;
  });
  const save = {
    money: 100,
    collection,
    deck: [...STARTER_DECK],
    wins: {},
    packsOpened: 0,
  };

  ensureDeckPresets(save);

  persist(save);
  return save;
}

export function persist(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function resetSave() {
  localStorage.removeItem(SAVE_KEY);
  return newSave();
}

// ---------- 카드팩 ----------
function rollRarity() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [rarity, w] of Object.entries(RARITY_WEIGHTS)) {
    r -= w;
    if (r < 0) return rarity;
  }
  return "C";
}

function isPokemonInGeneration(card, generation) {
  if (!card || card.kind !== "pokemon") {
    return false;
  }

  const dex = DEX[card.id];

  if (!dex) {
    return false;
  }

  switch (generation) {
    case 1:
      return dex >= 1 && dex <= 151;

    case 2:
      return dex >= 152 && dex <= 251;

    case 3:
      return dex >= 252 && dex <= 386;

    case 4:
      return dex >= 387 && dex <= 493;

    default:
      return false;
  }
}

function randomCardOfRarity(rarity, pool = null) {
  const basePool = pool ? CARDS.filter((c) => pool.includes(c.id)) : CARDS;

  const cards = basePool.filter((c) => c.rarity === rarity);

  if (cards.length > 0) {
    return cards[Math.floor(Math.random() * cards.length)];
  }

  // 지정 풀 안에 해당 등급이 없으면
  // 다른 세대로 빠지지 않고 같은 풀에서 랜덤
  if (basePool.length > 0) {
    return basePool[Math.floor(Math.random() * basePool.length)];
  }

  return null;
}

// 팩 개봉: { cards: [{card, refunded}], refundTotal }
const RARITY_ORDER = ["C", "R", "E", "L"];

function rollRarityFrom(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [r, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return r;
  }
  return "C";
}

export function openPack(save, packId = "basic") {
  const pack = PACKS[packId] || PACKS.basic;
  if (save.money < pack.price) return null;
  save.money -= pack.price;
  save.packsOpened += 1;

  const rarities = [];
  for (let i = 0; i < PACK_SIZE; i++)
    rarities.push(rollRarityFrom(pack.weights));
  // 보장 등급: 팩별 최소 1장 보장 (basic=레어+, premium=에픽+)
  const gIdx = RARITY_ORDER.indexOf(pack.guarantee);
  if (!rarities.some((r) => RARITY_ORDER.indexOf(r) >= gIdx))
    rarities[PACK_SIZE - 1] = pack.guarantee;

  let packPool = null;

  // 세대별 포켓몬팩
  if (pack.generation) {
    packPool = CARDS.filter((card) =>
      isPokemonInGeneration(card, pack.generation),
    ).map((card) => card.id);
  }

  const results = [];
  let refundTotal = 0;
  rarities.forEach((rarity) => {
    let pool = null;

    // 세대팩은 모든 등급을 해당 세대로 제한
    if (packPool) {
      pool = packPool;
    }

    // 기존 레전드 테마팩은
    // L이 나왔을 때만 해당 레전드 풀 제한
    else if (rarity === "L" && pack.legendPool) {
      pool = pack.legendPool;
    }

    const card = randomCardOfRarity(rarity, pool);

    if (!card) {
      return;
    }
    const owned = save.collection[card.id] || 0;
    const max = MAX_COPIES[card.rarity];
    if (owned >= max) {
      const refund = RARITY_REFUND[card.rarity];
      save.money += refund;
      refundTotal += refund;
      results.push({ card, refunded: refund });
    } else {
      save.collection[card.id] = owned + 1;
      results.push({ card, refunded: 0 });
    }
  });

  persist(save);
  return { cards: results, refundTotal };
}

// ---------- 덱 검증 ----------
export function deckIsValid(save) {
  if (save.deck.length !== 30) return false;
  const counts = {};
  for (const id of save.deck) {
    counts[id] = (counts[id] || 0) + 1;
    const card = CARD_MAP[id];
    if (!card) return false;
    if (
      counts[id] > Math.min(MAX_COPIES[card.rarity], save.collection[id] || 0)
    )
      return false;
  }
  return true;
}

// 관리자 모드: 숨겨진 치트 시퀀스로만 진입 (일반 UI에는 노출 안 됨)
export function activateAdminMode(save) {
  save.money = 999999;

  save.adminMode = true;

  CARDS.forEach((c) => {
    if (
      c.kind === "pokemon" ||
      c.kind === "spell" ||
      c.kind === "item" ||
      c.kind === "mega"
    ) {
      save.collection[c.id] = MAX_COPIES[c.rarity] ?? 2;
    }
  });
  persist(save);
}

export function addReward(save, amount) {
  save.money += amount;
  persist(save);
}

export function recordWin(save, trainerId) {
  save.wins[trainerId] = (save.wins[trainerId] || 0) + 1;
  persist(save);
}
