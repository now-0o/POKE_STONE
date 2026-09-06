import { CARD_MAP } from "../../data/cards.js";
import { loadSave, persist } from "../../state/save.js";
import { pushSave } from "../../state/api.js";
import { ensureShinyState, isShinyEligible } from "../../state/shiny.js";

const SAVE_EVENT = "pokestone:save-updated";

function dispatchSaveUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVE_EVENT));
  }
}

function syncSave(save) {
  persist(save);
  dispatchSaveUpdated();
  void pushSave(save).catch((error) => {
    console.warn("[roguelike] save sync failed:", error?.message || error);
  });
  return save;
}

function cloneReward(reward) {
  if (!reward) return null;
  return JSON.parse(JSON.stringify(reward));
}

export function normalizeRoguelikeRun(raw) {
  if (!raw || typeof raw !== "object") return null;
  const stage = Math.max(0, Number(raw.stage) || 0);
  return {
    status: raw.status === "dead" ? "dead" : "active",
    phase: raw.phase || (raw.status === "dead" ? "defeat" : "preview"),
    stage,
    deck: Array.isArray(raw.deck) ? raw.deck.filter((id) => CARD_MAP[id]) : [],
    storage: Array.isArray(raw.storage)
      ? raw.storage.filter((id) => CARD_MAP[id])
      : [],
    hp: Math.max(1, Number(raw.hp) || 40),
    maxHp: Math.max(1, Number(raw.maxHp) || 40),
    openingHandBonus: Math.max(0, Number(raw.openingHandBonus) || 0),
    startingManaBonus: Math.max(0, Number(raw.startingManaBonus) || 0),
    rewardsTaken: Array.isArray(raw.rewardsTaken) ? [...raw.rewardsTaken] : [],
    pendingRewards: Array.isArray(raw.pendingRewards)
      ? raw.pendingRewards.map(cloneReward).filter(Boolean)
      : [],
    pendingDeathReward: raw.pendingDeathReward
      ? cloneReward(raw.pendingDeathReward)
      : null,
    startedAt: Number(raw.startedAt) || Date.now(),
    lastSavedAt: Number(raw.lastSavedAt) || Date.now(),
    battleStarted: !!raw.battleStarted,
  };
}

export function readRoguelikeSave() {
  const save = loadSave();
  return {
    save,
    run: normalizeRoguelikeRun(save.roguelikeRun),
    stats: {
      bestStage: Math.max(0, Number(save.roguelikeStats?.bestStage) || 0),
      totalRuns: Math.max(0, Number(save.roguelikeStats?.totalRuns) || 0),
      totalWins: Math.max(0, Number(save.roguelikeStats?.totalWins) || 0),
    },
  };
}

export function saveRoguelikeCheckpoint(run, phase = "preview", extra = {}) {
  const save = loadSave();
  const normalized = normalizeRoguelikeRun({
    ...run,
    ...extra,
    status: "active",
    phase,
    lastSavedAt: Date.now(),
  });
  save.roguelikeRun = normalized;
  syncSave(save);
  return normalized;
}

function randomItems(list, count) {
  const pool = [...list];
  const out = [];
  while (pool.length && out.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(index, 1)[0]);
  }
  return out;
}

function shinyCandidateIds(save, count) {
  ensureShinyState(save);
  const candidates = Object.entries(save.collection || {})
    .filter(([, owned]) => Number(owned) > 0)
    .map(([id]) => CARD_MAP[id])
    .filter(
      (card) =>
        card?.kind === "pokemon" &&
        !card.trainerOnly &&
        !card.signature &&
        !card.roguelikeOnly &&
        isShinyEligible(card) &&
        (save.shinyCollection?.[card.id] || 0) < (save.collection?.[card.id] || 0),
    )
    .map((card) => card.id);
  return randomItems(candidates, count);
}

export function roguelikeDeathMoney(reachedStage) {
  const stage = Math.max(1, Number(reachedStage) || 1);
  const cycles = Math.floor(stage / 15);
  return Math.floor(100 + stage * 55 + cycles * 300);
}

export function buildDeathReward(save, run) {
  const reachedStage = Math.max(1, (Number(run?.stage) || 0) + 1);
  const money = roguelikeDeathMoney(reachedStage);
  const shinyChoiceCount = reachedStage >= 100 ? 5 : reachedStage >= 60 ? 4 : reachedStage >= 30 ? 3 : 0;
  const shinyChoices = shinyChoiceCount > 0
    ? shinyCandidateIds(save, shinyChoiceCount)
    : [];

  return {
    reachedStage,
    money,
    shinyChoices,
    shinyEligible: reachedStage >= 30,
    createdAt: Date.now(),
  };
}

export function markRoguelikeDead(run) {
  const save = loadSave();
  const existing = normalizeRoguelikeRun(save.roguelikeRun);
  if (existing?.status === "dead" && existing.pendingDeathReward) {
    return existing;
  }

  const reward = buildDeathReward(save, run);
  const deadRun = normalizeRoguelikeRun({
    ...run,
    status: "dead",
    phase: "defeat",
    pendingRewards: [],
    pendingDeathReward: reward,
    battleStarted: false,
    lastSavedAt: Date.now(),
  });
  deadRun.status = "dead";
  deadRun.phase = "defeat";
  deadRun.pendingDeathReward = reward;
  save.roguelikeRun = deadRun;
  syncSave(save);
  return deadRun;
}

export function claimRoguelikeDeathReward(shinyCardId = null) {
  const save = loadSave();
  const run = normalizeRoguelikeRun(save.roguelikeRun);
  if (!run || run.status !== "dead" || !run.pendingDeathReward) {
    return { ok: false, reason: "no-pending-reward" };
  }

  const reward = run.pendingDeathReward;
  const choices = Array.isArray(reward.shinyChoices) ? reward.shinyChoices : [];
  const needsChoice = choices.length > 0;
  if (needsChoice && !choices.includes(shinyCardId)) {
    return { ok: false, reason: "choose-shiny" };
  }

  save.money = Math.max(0, Number(save.money) || 0) + Math.max(0, Number(reward.money) || 0);
  ensureShinyState(save);

  let shinyGranted = null;
  if (needsChoice && shinyCardId && CARD_MAP[shinyCardId]) {
    const owned = Math.max(0, Number(save.collection?.[shinyCardId]) || 0);
    const current = Math.max(0, Number(save.shinyCollection?.[shinyCardId]) || 0);
    if (current < owned) {
      save.shinyCollection[shinyCardId] = current + 1;
      shinyGranted = shinyCardId;
    }
  }

  const reachedStage = Math.max(1, Number(reward.reachedStage) || run.stage + 1);
  const completedWins = Math.max(0, reachedStage - 1);
  const stats = save.roguelikeStats || {};
  save.roguelikeStats = {
    bestStage: Math.max(Number(stats.bestStage) || 0, reachedStage),
    totalRuns: Math.max(0, Number(stats.totalRuns) || 0) + 1,
    totalWins: Math.max(0, Number(stats.totalWins) || 0) + completedWins,
  };
  save.roguelikeRun = null;
  syncSave(save);

  return {
    ok: true,
    money: Math.max(0, Number(reward.money) || 0),
    shinyCardId: shinyGranted,
    reachedStage,
  };
}

export function abandonRoguelikeRun() {
  const save = loadSave();
  if (!save.roguelikeRun) return false;
  const stats = save.roguelikeStats || {};
  save.roguelikeStats = {
    bestStage: Math.max(0, Number(stats.bestStage) || 0),
    totalRuns: Math.max(0, Number(stats.totalRuns) || 0) + 1,
    totalWins: Math.max(0, Number(stats.totalWins) || 0),
  };
  save.roguelikeRun = null;
  syncSave(save);
  return true;
}

export const ROGUELIKE_SAVE_EVENT = SAVE_EVENT;
