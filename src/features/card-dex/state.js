import { CARD_MAP, MAX_COPIES } from "../../data/cards.js";
import { persist } from "../../state/save.js";
import { ensureShinyState } from "../../state/shiny.js";

export const KANTO_STARTER_IDS = ["bulbasaur", "charmander", "squirtle"];
export const KANTO_STARTER_REWARD_KEY = "kantoStarters";

function ensureDexRewards(save) {
  if (!save.dexRewards || typeof save.dexRewards !== "object") {
    save.dexRewards = {};
  }
  return save.dexRewards;
}

export function kantoStarterRewardState(save) {
  const ids = KANTO_STARTER_IDS;
  const found = ids.filter((id) => (save?.collection?.[id] || 0) > 0);
  const reward = save?.dexRewards?.[KANTO_STARTER_REWARD_KEY] || null;

  return {
    found,
    complete: found.length === ids.length,
    claimed: !!reward?.claimed,
    reward,
  };
}

export function claimKantoStarterDexReward(save) {
  if (!save) return { ok: false, reason: "missing-save" };

  ensureShinyState(save);
  const rewards = ensureDexRewards(save);
  const current = rewards[KANTO_STARTER_REWARD_KEY];

  if (current?.claimed) {
    return { ok: false, reason: "already-claimed", reward: current };
  }

  const state = kantoStarterRewardState(save);
  if (!state.complete) {
    return { ok: false, reason: "incomplete" };
  }

  const missingShiny = KANTO_STARTER_IDS.filter(
    (id) => (save.shinyCollection?.[id] || 0) <= 0,
  );

  let reward;

  if (missingShiny.length > 0) {
    const cardId = missingShiny[Math.floor(Math.random() * missingShiny.length)];
    const card = CARD_MAP[cardId];
    const owned = Math.max(0, save.collection?.[cardId] || 0);
    const maxCopies = MAX_COPIES[card?.rarity] ?? 2;

    // 여유 슬롯이 있으면 이로치 카드를 새 복사본으로 지급한다.
    // 이미 최대 매수를 보유 중이면 기존 보유 카드 1장을 이로치로 해금한다.
    if (owned < maxCopies) {
      save.collection[cardId] = owned + 1;
    }

    save.shinyCollection = { ...(save.shinyCollection || {}) };
    save.shinyCollection[cardId] = Math.max(
      1,
      Math.min(save.collection[cardId] || 1, save.shinyCollection[cardId] || 0),
    );

    reward = {
      claimed: true,
      rewardType: "shiny",
      cardId,
      claimedAt: Date.now(),
    };
  } else {
    // 세 스타팅 이로치를 이미 전부 가진 계정도 보상이 막히지 않도록
    // 기존 재화로 대체 보상한다.
    save.money = (save.money || 0) + 150;
    reward = {
      claimed: true,
      rewardType: "money",
      amount: 150,
      claimedAt: Date.now(),
    };
  }

  rewards[KANTO_STARTER_REWARD_KEY] = reward;
  ensureShinyState(save);
  persist(save);

  return { ok: true, reward };
}
