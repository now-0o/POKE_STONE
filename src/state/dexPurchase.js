import { CARD_MAP, DEX, MAX_COPIES } from "../data/cards.js";
import { persist } from "./save.js";

export const DEX_FIRST_PURCHASE_PRICE = Object.freeze({
  C: 1200,
  R: 2400,
  E: 4800,
  L: 9000,
});

// 도감 확정 구매는 진행도 제한 없이 항상 열려 있다.
// 원하는 카드를 얻기 위해 돈을 모으는 것 자체가 해금 조건 역할을 한다.
export function isDexPurchaseUnlocked() {
  return true;
}

export function dexCardPurchasePrice(save, cardOrId) {
  const card = typeof cardOrId === "string" ? CARD_MAP[cardOrId] : cardOrId;
  if (!card || card.kind !== "pokemon" || !Number.isInteger(DEX[card.id])) {
    return null;
  }

  const owned = Math.max(0, Number(save?.collection?.[card.id]) || 0);
  const maxCopies = MAX_COPIES[card.rarity] ?? 2;
  if (owned >= maxCopies) return null;

  const firstPrice = DEX_FIRST_PURCHASE_PRICE[card.rarity];
  if (!Number.isFinite(firstPrice)) return null;

  return owned === 0 ? firstPrice : Math.floor(firstPrice / 2);
}

export function purchaseDexCard(save, cardId) {
  if (!save) return { ok: false, reason: "save_missing" };

  const card = CARD_MAP[cardId];
  if (!card || card.kind !== "pokemon" || !Number.isInteger(DEX[card.id])) {
    return { ok: false, reason: "invalid_card" };
  }

  save.collection = save.collection || {};
  const owned = Math.max(0, Number(save.collection[card.id]) || 0);
  const maxCopies = MAX_COPIES[card.rarity] ?? 2;
  if (owned >= maxCopies) {
    return { ok: false, reason: "max_copies", card, owned, maxCopies };
  }

  const price = dexCardPurchasePrice(save, card);
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: "invalid_price", card };
  }

  const money = Math.max(0, Number(save.money) || 0);
  if (money < price) {
    return {
      ok: false,
      reason: "not_enough_money",
      card,
      price,
      money,
      shortage: price - money,
    };
  }

  save.money = money - price;
  save.collection[card.id] = owned + 1;
  persist(save);

  return {
    ok: true,
    card,
    price,
    ownedBefore: owned,
    ownedAfter: owned + 1,
    maxCopies,
    money: save.money,
    firstDiscovery: owned === 0,
  };
}
