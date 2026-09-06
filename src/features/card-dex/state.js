import { CARD_MAP, MAX_COPIES } from "../../data/cards.js";
import { persist } from "../../state/save.js";
import { ensureShinyState } from "../../state/shiny.js";

export const KANTO_STARTER_IDS = ["bulbasaur", "charmander", "squirtle"];
export const KANTO_STARTER_REWARD_KEY = "kantoStarters";

const JOHTO_STARTER_IDS = ["chikorita", "cyndaquil", "totodile"];
const HOENN_STARTER_IDS = ["treecko", "torchic", "mudkip"];
const SINNOH_STARTER_IDS = ["turtwig", "chimchar", "piplup"];
const UNOVA_STARTER_IDS = ["snivy", "tepig", "oshawott"];
const PSEUDO_LEGENDARY_BASE_IDS = ["dratini", "larvitar", "bagon", "gible", "deino"];

// 도감 퀘스트는 서로 선행 조건을 갖지 않는다.
// 카드팩/직접 구매 등 어떤 경로로 획득했든 collection에 등록되면 발견으로 인정한다.
export const DEX_QUESTS = [
  {
    id: KANTO_STARTER_REWARD_KEY,
    order: 1,
    category: "세트 수집",
    title: "관동 스타팅",
    description: "이상해씨 · 파이리 · 꼬부기를 모두 발견하세요.",
    requiredCardIds: KANTO_STARTER_IDS,
    reward: { type: "missing_shiny", fallbackMoney: 150 },
    rewardText: "미보유 관동 스타팅 이로치 1장",
    rewardSubtext: "세 이로치를 이미 모두 보유했다면 150원으로 대체",
  },
  {
    id: "johtoStarters",
    order: 2,
    category: "세트 수집",
    title: "성도 스타팅",
    description: "치코리타 · 브케인 · 리아코를 모두 발견하세요.",
    requiredCardIds: JOHTO_STARTER_IDS,
    reward: { type: "missing_shiny", fallbackMoney: 200 },
    rewardText: "미보유 성도 스타팅 이로치 1장",
    rewardSubtext: "세 이로치를 이미 모두 보유했다면 200원으로 대체",
  },
  {
    id: "hoennStarters",
    order: 3,
    category: "세트 수집",
    title: "호연 스타팅",
    description: "나무지기 · 아차모 · 물짱이를 모두 발견하세요.",
    requiredCardIds: HOENN_STARTER_IDS,
    reward: { type: "missing_shiny", fallbackMoney: 250 },
    rewardText: "미보유 호연 스타팅 이로치 1장",
    rewardSubtext: "세 이로치를 이미 모두 보유했다면 250원으로 대체",
  },
  {
    id: "sinnohStarters",
    order: 4,
    category: "세트 수집",
    title: "신오 스타팅",
    description: "모부기 · 불꽃숭이 · 팽도리를 모두 발견하세요.",
    requiredCardIds: SINNOH_STARTER_IDS,
    reward: { type: "missing_shiny", fallbackMoney: 300 },
    rewardText: "미보유 신오 스타팅 이로치 1장",
    rewardSubtext: "세 이로치를 이미 모두 보유했다면 300원으로 대체",
  },
  {
    id: "unovaStarters",
    order: 5,
    category: "세트 수집",
    title: "하나 스타팅",
    description: "주리비얀 · 뚜꾸리 · 수댕이를 모두 발견하세요.",
    requiredCardIds: UNOVA_STARTER_IDS,
    reward: { type: "missing_shiny", fallbackMoney: 350 },
    rewardText: "미보유 하나 스타팅 이로치 1장",
    rewardSubtext: "세 이로치를 이미 모두 보유했다면 350원으로 대체",
  },
  {
    id: "pseudoLegendaryBases",
    order: 6,
    category: "세대 수집",
    title: "600족의 계보",
    description: "미뇽 · 애버라스 · 아공이 · 딥상어동 · 모노두를 모두 발견하세요.",
    requiredCardIds: PSEUDO_LEGENDARY_BASE_IDS,
    reward: { type: "money", amount: 1000 },
    rewardText: "1,000원",
    rewardSubtext: "5세대까지 이어지는 600족의 시작을 모두 수집한 보상",
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

  const required = (quest.requiredCardIds || []).filter((id) => CARD_MAP[id]);
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

function claimMissingShinyReward(save, quest) {
  const eligibleIds = (quest.requiredCardIds || []).filter((id) => CARD_MAP[id]);
  const missingShiny = eligibleIds.filter(
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

  const amount = Math.max(0, Number(quest.reward?.fallbackMoney) || 0);
  save.money = (save.money || 0) + amount;
  return {
    claimed: true,
    rewardType: "money",
    amount,
    claimedAt: Date.now(),
  };
}

function claimMoneyReward(save, quest) {
  const amount = Math.max(0, Number(quest.reward?.amount) || 0);
  save.money = (save.money || 0) + amount;
  return {
    claimed: true,
    rewardType: "money",
    amount,
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
  if (quest.reward?.type === "missing_shiny") {
    reward = claimMissingShinyReward(save, quest);
  } else if (quest.reward?.type === "money") {
    reward = claimMoneyReward(save, quest);
  } else {
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
