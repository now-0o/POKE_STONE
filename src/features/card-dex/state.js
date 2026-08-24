import { CARD_MAP, MAX_COPIES } from "../../data/cards.js";
import { persist } from "../../state/save.js";
import { ensureShinyState } from "../../state/shiny.js";

export const KANTO_STARTER_IDS = ["bulbasaur", "charmander", "squirtle"];
export const KANTO_STARTER_REWARD_KEY = "kantoStarters";

// 도감 퀘스트는 서로 선행 조건을 갖지 않는다.
// 카드팩 획득 순서는 랜덤이므로 각 퀘스트는 자기 requiredCardIds만 보고
// 독립적으로 완료/수령 가능 상태가 된다.
export const DEX_QUESTS = [
  {
    id: KANTO_STARTER_REWARD_KEY,
    order: 1,
    category: "세트 수집",
    title: "관동 스타팅",
    description: "이상해씨 · 파이리 · 꼬부기를 모두 발견하세요.",
    requiredCardIds: KANTO_STARTER_IDS,
    rewardText: "미보유 관동 스타팅 이로치 1장",
    rewardSubtext: "세 이로치를 이미 모두 보유했다면 150원으로 대체",
  },
];

function ensureDexRewards(save) {
  if (!save.dexRewards || typeof save.dexRewards !== "object") {
    save.dexRewards = {};
  }
  return save.dexRewards;
}

export function dexQuestState(save, questOrId) {
  const quest =
    typeof questOrId === "string"
      ? DEX_QUESTS.find((item) => item.id === questOrId)
      : questOrId;

  if (!quest) {
    return {
      found: [],
      required: [],
      complete: false,
      claimed: false,
      reward: null,
    };
  }

  const required = quest.requiredCardIds || [];
  const found = required.filter((id) => (save?.collection?.[id] || 0) > 0);
  const reward = save?.dexRewards?.[quest.id] || null;

  return {
    found,
    required,
    complete: required.length > 0 && found.length === required.length,
    claimed: !!reward?.claimed,
    reward,
  };
}

export function kantoStarterRewardState(save) {
  return dexQuestState(save, KANTO_STARTER_REWARD_KEY);
}

function claimKantoStarterReward(save) {
  const missingShiny = KANTO_STARTER_IDS.filter(
    (id) => (save.shinyCollection?.[id] || 0) <= 0,
  );

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

    return {
      claimed: true,
      rewardType: "shiny",
      cardId,
      claimedAt: Date.now(),
    };
  }

  save.money = (save.money || 0) + 150;
  return {
    claimed: true,
    rewardType: "money",
    amount: 150,
    claimedAt: Date.now(),
  };
}

export function claimDexQuestReward(save, questId) {
  if (!save) return { ok: false, reason: "missing-save" };

  const quest = DEX_QUESTS.find((item) => item.id === questId);
  if (!quest) return { ok: false, reason: "missing-quest" };

  ensureShinyState(save);
  const rewards = ensureDexRewards(save);
  const current = rewards[quest.id];

  if (current?.claimed) {
    return { ok: false, reason: "already-claimed", reward: current };
  }

  const state = dexQuestState(save, quest);
  if (!state.complete) {
    return { ok: false, reason: "incomplete" };
  }

  let reward;

  switch (quest.id) {
    case KANTO_STARTER_REWARD_KEY:
      reward = claimKantoStarterReward(save);
      break;
    default:
      return { ok: false, reason: "unsupported-quest" };
  }

  rewards[quest.id] = reward;
  ensureShinyState(save);
  persist(save);

  return { ok: true, reward, quest };
}

export function claimKantoStarterDexReward(save) {
  return claimDexQuestReward(save, KANTO_STARTER_REWARD_KEY);
}
