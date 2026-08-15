import * as base from "../sinnoh/index.js";
import { CARD_MAP, TYPE_CHART } from "../../data/cards.js";
import {
  CYNTHIA_RECALL_CARD_ID,
  CYNTHIA_SIGNATURE_IDS,
} from "../../data/cards/cynthia.js";

export * from "../sinnoh/index.js";

const CYNTHIA_GIMMICK = "champion_party";
const SIGNATURE_SET = new Set(CYNTHIA_SIGNATURE_IDS);
const MAX_COMPETITIVE_TRIGGERS = 2;
const MAX_STOCKPILE_STACKS = 2;
const ACE_VISUAL_MS = 2500;

const SUPPORT_POOLS = {
  sinnoh_cynthia_spiritomb: ["shadowball", "darkpulse", "toxic"],
  sinnoh_cynthia_roserade: ["solarbeam", "toxic", "fullrestore"],
  sinnoh_cynthia_gastrodon: ["hydropump", "earthquake", "recover"],
  sinnoh_cynthia_lucario: ["infight", "quickattack", "focussash"],
  sinnoh_cynthia_milotic: ["hydropump", "icebeam", "recover", "fullrestore"],
  sinnoh_cynthia_garchomp: ["earthquake", "dragonclaw", "lifeorb"],
};

let aceVisualTimer = null;

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

function turnKey(game) {
  return `${game.turnCount || 0}:${game.turn || "none"}`;
}

function nextCynthiaHandUid(game) {
  game._cynthiaHandSeq = (game._cynthiaHandSeq || 0) + 1;
  return `cynthia-h${game._cynthiaHandSeq}`;
}

function makeCynthiaHandCard(game, cardId, extra = {}) {
  return {
    uid: nextCynthiaHandUid(game),
    cardId,
    ...extra,
  };
}

export function isCynthiaBattle(game) {
  return game?.trainer?.gimmick === CYNTHIA_GIMMICK;
}

function isCynthiaSignatureId(cardId) {
  return SIGNATURE_SET.has(cardId);
}

function activeCynthiaUnit(game) {
  if (!isCynthiaBattle(game)) return null;
  return game.players.enemy.field.find((unit) => isCynthiaSignatureId(unit.cardId)) || null;
}

function signatureHandEntries(game) {
  if (!isCynthiaBattle(game)) return [];
  return game.players.enemy.hand.filter((entry) => isCynthiaSignatureId(entry.cardId));
}

function remainingSignatureIds(game) {
  if (!isCynthiaBattle(game)) return [];

  const remaining = new Set();
  game.players.enemy.field.forEach((unit) => {
    if (isCynthiaSignatureId(unit.cardId)) remaining.add(unit.cardId);
  });
  signatureHandEntries(game).forEach((entry) => remaining.add(entry.cardId));
  return CYNTHIA_SIGNATURE_IDS.filter((cardId) => remaining.has(cardId));
}

export function getCynthiaFaintedCount(game) {
  if (!isCynthiaBattle(game)) return 0;
  return CYNTHIA_SIGNATURE_IDS.length - remainingSignatureIds(game).length;
}

function typeMult(attackType, defendType) {
  const row = TYPE_CHART[attackType];
  if (!row) return 1;
  const value = row[defendType];
  return value === undefined ? 1 : value;
}

function savedHpRatio(entry) {
  const card = CARD_MAP[entry?.cardId];
  if (!card) return 1;
  const state = entry?.cynthiaState;
  const maxHp = Math.max(1, Number(state?.maxHp) || Number(card.hp) || 1);
  const hp = Math.max(0, Number(state?.hp ?? maxHp));
  return hp / maxHp;
}

function candidateScore(game, entry) {
  const card = CARD_MAP[entry?.cardId];
  if (!card) return -Infinity;

  const foe = game.players.player;
  const fainted = getCynthiaFaintedCount(game);
  const hpRatio = savedHpRatio(entry);
  let score = (card.atk || 0) * 2 + (card.hp || 0) + hpRatio * 8;

  const threat = [...foe.field].sort(
    (a, b) => (b.atk || 0) * 2 + b.hp - ((a.atk || 0) * 2 + a.hp),
  )[0];

  if (threat) {
    const outgoing = typeMult(card.type, threat.type);
    const incoming = typeMult(threat.type, card.type);
    if (outgoing > 1) score += 15;
    if (outgoing === 0) score -= 20;
    if (incoming > 1) score -= 10;
    if (incoming === 0) score += 10;
  }

  switch (card.id) {
    case "sinnoh_cynthia_spiritomb":
      if (fainted === 0) score += 80;
      if (!entry.cynthiaState?._cynthiaPainSplitUsed) score += 8;
      break;

    case "sinnoh_cynthia_roserade":
      if (!game._cynthiaToxicSpikesEver) score += 24;
      if (foe.field.length >= 3) score += 8;
      break;

    case "sinnoh_cynthia_gastrodon":
      if (foe.field.some((unit) => unit.type === "물")) score += 12;
      if ((entry.cynthiaState?._cynthiaStockpileStacks || 0) < MAX_STOCKPILE_STACKS) {
        score += 5;
      }
      break;

    case "sinnoh_cynthia_lucario":
      if (hpRatio <= 0.5) score += 18;
      if (hpRatio <= 0.25) score += 16;
      if (foe.field.some((unit) => unit.hp <= 5)) score += 8;
      break;

    case "sinnoh_cynthia_milotic":
      if (
        foe.field.some((unit) => {
          const baseCard = CARD_MAP[unit.cardId];
          return baseCard && unit.atk > (baseCard.atk || 0);
        })
      ) {
        score += 12;
      }
      if (hpRatio >= 0.55) score += 6;
      break;

    case "sinnoh_cynthia_garchomp":
      score += fainted * 18;
      if (fainted < 3) score -= 70;
      if (fainted === 4) score += 30;
      if (fainted >= 5) score += 200;
      break;

    default:
      break;
  }

  return score;
}

export function getCynthiaPreferredDeployId(game) {
  if (!isCynthiaBattle(game)) return null;
  if (activeCynthiaUnit(game)) return null;

  const entries = signatureHandEntries(game);
  if (!entries.length) return null;

  const fainted = getCynthiaFaintedCount(game);

  if (fainted === 0) {
    const spiritomb = entries.find(
      (entry) => entry.cardId === "sinnoh_cynthia_spiritomb",
    );
    if (spiritomb) return spiritomb.cardId;
  }

  if (fainted >= 5) {
    const garchomp = entries.find(
      (entry) => entry.cardId === "sinnoh_cynthia_garchomp",
    );
    if (garchomp) return garchomp.cardId;
  }

  return [...entries]
    .sort((a, b) => candidateScore(game, b) - candidateScore(game, a))[0]
    ?.cardId || null;
}

function preferredRecallTargetId(game) {
  const entries = signatureHandEntries(game);
  if (!entries.length) return null;

  return [...entries]
    .sort((a, b) => candidateScore(game, b) - candidateScore(game, a))[0]
    ?.cardId || null;
}

function currentUnitScore(game, unit) {
  if (!unit) return -Infinity;
  return candidateScore(game, {
    cardId: unit.cardId,
    cynthiaState: {
      hp: unit.hp,
      maxHp: unit.maxHp,
      _cynthiaPainSplitUsed: unit._cynthiaPainSplitUsed,
      _cynthiaStockpileStacks: unit._cynthiaStockpileStacks,
    },
  });
}

export function shouldCynthiaRecall(game) {
  if (!isCynthiaBattle(game) || game.turn !== "enemy" || game.winner) return false;

  const active = activeCynthiaUnit(game);
  if (!active || signatureHandEntries(game).length === 0) return false;
  if (game._cynthiaRecallUsedTurn === turnKey(game)) return false;
  if (active._cynthiaEntryTurnKey === turnKey(game)) return false;

  const targetId = preferredRecallTargetId(game);
  if (!targetId) return false;

  const hpRatio = active.hp / Math.max(1, active.maxHp);
  if (hpRatio <= 0.32) return true;

  if (
    active.cardId === "sinnoh_cynthia_spiritomb" &&
    active._cynthiaPainSplitUsed &&
    hpRatio <= 0.58
  ) {
    return true;
  }

  if (
    active.cardId === "sinnoh_cynthia_roserade" &&
    !active._cynthiaSynthesisUsed &&
    hpRatio <= 0.55
  ) {
    return true;
  }

  if (
    active.cardId === "sinnoh_cynthia_garchomp" &&
    getCynthiaFaintedCount(game) < 4
  ) {
    return true;
  }

  const targetEntry = signatureHandEntries(game).find(
    (entry) => entry.cardId === targetId,
  );
  const targetScore = candidateScore(game, targetEntry);
  return targetScore >= currentUnitScore(game, active) + 18;
}

function syncCynthiaVisual(game) {
  if (typeof document === "undefined") return;

  if (!isCynthiaBattle(game)) {
    delete document.body.dataset.cynthiaPartyRemaining;
    delete document.body.dataset.cynthiaActive;
    delete document.body.dataset.cynthiaToxicSpikes;
    delete document.body.dataset.cynthiaAce;
    return;
  }

  const active = activeCynthiaUnit(game);
  const remaining = remainingSignatureIds(game).length;
  document.body.dataset.cynthiaPartyRemaining = String(remaining);
  document.body.dataset.cynthiaActive = active?.cardId || "none";
  document.body.dataset.cynthiaToxicSpikes = String(game._cynthiaToxicSpikes || 0);

  const board = document.querySelector(
    '.battle.battle-board[data-trainer="sinnoh_cynthia"]',
  );
  if (board) {
    board.dataset.cynthiaParty = String(remaining);
    board.dataset.cynthiaActive = active?.cardId || "none";
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cynthia-party-change", {
        detail: {
          remaining,
          activeCardId: active?.cardId || null,
          fainted: getCynthiaFaintedCount(game),
          toxicSpikes: game._cynthiaToxicSpikes || 0,
        },
      }),
    );
  }
}

function triggerAceVisual(game) {
  if (game._cynthiaAceVisualShown) return;
  game._cynthiaAceVisualShown = true;

  pushLog(game, "난천의 마지막 포켓몬! 챔피언의 에이스 한카리아스가 나선다!");

  if (typeof document === "undefined") return;

  document.body.dataset.cynthiaAce = "1";
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cynthia-ace-entry"));
  }

  if (aceVisualTimer) window.clearTimeout(aceVisualTimer);
  aceVisualTimer = window.setTimeout(() => {
    delete document.body.dataset.cynthiaAce;
    aceVisualTimer = null;
  }, ACE_VISUAL_MS);
}

function addImpact(game, impact) {
  if (!game.lastAction) return;
  if (!Array.isArray(game.lastAction.impacts)) game.lastAction.impacts = [];
  game.lastAction.impacts.push(impact);
}

function snapshotCynthiaUnit(unit) {
  return {
    hp: unit.hp,
    maxHp: unit.maxHp,
    atk: unit.atk,
    status: unit.status ?? null,
    statusTurns: unit.statusTurns ?? null,
    item: unit.item ?? null,
    _cynthiaPainSplitUsed: Boolean(unit._cynthiaPainSplitUsed),
    _cynthiaSynthesisUsed: Boolean(unit._cynthiaSynthesisUsed),
    _cynthiaStockpileStacks: unit._cynthiaStockpileStacks || 0,
    _cynthiaCompetitiveTriggers: unit._cynthiaCompetitiveTriggers || 0,
    _cynthiaSwordsDanceUsed: Boolean(unit._cynthiaSwordsDanceUsed),
  };
}

function restoreCynthiaUnit(unit, state) {
  if (!unit || !state) return;

  if (Number.isFinite(state.maxHp)) unit.maxHp = Math.max(1, state.maxHp);
  if (Number.isFinite(state.atk)) unit.atk = Math.max(0, state.atk);
  if (Number.isFinite(state.hp)) {
    unit.hp = Math.max(1, Math.min(unit.maxHp, state.hp));
  }

  unit.status = state.status ?? null;
  if (state.statusTurns == null) delete unit.statusTurns;
  else unit.statusTurns = state.statusTurns;

  if (state.item == null) delete unit.item;
  else unit.item = state.item;

  unit._cynthiaPainSplitUsed = Boolean(state._cynthiaPainSplitUsed);
  unit._cynthiaSynthesisUsed = Boolean(state._cynthiaSynthesisUsed);
  unit._cynthiaStockpileStacks = state._cynthiaStockpileStacks || 0;
  unit._cynthiaCompetitiveTriggers = state._cynthiaCompetitiveTriggers || 0;
  unit._cynthiaSwordsDanceUsed = Boolean(state._cynthiaSwordsDanceUsed);
}

function applyCynthiaEntryEffects(game, unit, reason = "deploy") {
  if (!unit || !isCynthiaSignatureId(unit.cardId)) return;

  unit._cynthiaEntryTurnKey = turnKey(game);

  if (unit.cardId === "sinnoh_cynthia_roserade" && !game._cynthiaToxicSpikesEver) {
    game._cynthiaToxicSpikesEver = true;
    game._cynthiaToxicSpikes = 2;
    pushLog(game, "난천의 로즈레이드가 독압정을 2겹 설치했다!");
  }

  if (unit.cardId === "sinnoh_cynthia_lucario") {
    unit.canAttack = true;
    if (reason === "recall") {
      unit._cynthiaExtremeSpeedBoost = true;
      pushLog(game, "난천의 루카리오의 신속! 교체와 동시에 공격 태세를 잡았다!");
    }
  }

  if (
    unit.cardId === "sinnoh_cynthia_garchomp" &&
    !unit._cynthiaSwordsDanceUsed
  ) {
    const fainted = getCynthiaFaintedCount(game);
    const bonus = fainted >= 5 ? 3 : fainted >= 4 ? 2 : fainted >= 2 ? 1 : 0;

    unit._cynthiaSwordsDanceUsed = true;
    if (bonus > 0) {
      unit.atk += bonus;
      pushLog(game, `난천의 한카리아스의 칼춤! 공격력 +${bonus}!`);
    }

    if (fainted >= 5) {
      unit.canAttack = true;
      unit._cynthiaDragonRushReady = true;
      triggerAceVisual(game);
    }
  }

  syncCynthiaVisual(game);
}

function deployCynthiaSignature(game, cardId, reason = "deploy", force = false) {
  const enemy = game.players.enemy;
  const index = enemy.hand.findIndex((entry) => entry.cardId === cardId);
  if (index < 0 || enemy.field.length > 0) return false;

  const savedState = enemy.hand[index].cynthiaState || null;
  const originalTurn = game.turn;

  if (force) game.turn = "enemy";
  const result = base.playCard(game, "enemy", index, null, 0);
  if (force) game.turn = originalTurn;

  if (!result) {
    if (force) syncTurnDataset(game);
    return false;
  }

  const unit = activeCynthiaUnit(game);
  restoreCynthiaUnit(unit, savedState);
  applyCynthiaEntryEffects(game, unit, reason);

  if (force) syncTurnDataset(game);
  return true;
}

function syncTurnDataset(game) {
  if (typeof document === "undefined") return;
  if (game.turn === "player" || game.turn === "enemy") {
    document.body.dataset.battleTurn = game.turn;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("battle-turn-change", {
        detail: { turn: game.turn || null },
      }),
    );
  }
}

function applyRecallExitEffects(game, unit) {
  if (!unit) return;

  if (
    unit.cardId === "sinnoh_cynthia_roserade" &&
    !unit._cynthiaSynthesisUsed
  ) {
    const healed = Math.min(2, unit.maxHp - unit.hp);
    unit.hp += healed;
    unit._cynthiaSynthesisUsed = true;
    if (healed > 0) {
      pushLog(game, `난천의 로즈레이드의 광합성! 체력 ${healed} 회복!`);
    }
  }

  if (
    unit.cardId === "sinnoh_cynthia_gastrodon" &&
    (unit._cynthiaStockpileStacks || 0) < MAX_STOCKPILE_STACKS
  ) {
    unit._cynthiaStockpileStacks = (unit._cynthiaStockpileStacks || 0) + 1;
    unit.atk += 1;
    unit.maxHp += 1;
    unit.hp += 1;
    pushLog(
      game,
      `난천의 트리토돈의 비축하기! +1/+1 (${unit._cynthiaStockpileStacks}/${MAX_STOCKPILE_STACKS})`,
    );
  }
}

function resolveCynthiaRecall(game, handIdx) {
  if (!shouldCynthiaRecall(game)) return false;

  const enemy = game.players.enemy;
  const active = activeCynthiaUnit(game);
  const targetId = preferredRecallTargetId(game);
  if (!active || !targetId) return false;

  const recallEntry = enemy.hand[handIdx];
  if (recallEntry?.cardId !== CYNTHIA_RECALL_CARD_ID) return false;

  const activeIndex = enemy.field.findIndex((unit) => unit.uid === active.uid);
  if (activeIndex < 0) return false;

  enemy.hand.splice(handIdx, 1);
  applyRecallExitEffects(game, active);
  enemy.field.splice(activeIndex, 1);

  enemy.hand.push(
    makeCynthiaHandCard(game, active.cardId, {
      cynthiaState: snapshotCynthiaUnit(active),
    }),
  );

  const outgoingName = active.name;
  const targetName = CARD_MAP[targetId]?.name || "다음 포켓몬";

  if (!deployCynthiaSignature(game, targetId, "recall", false)) {
    const returnedIndex = enemy.hand.findIndex(
      (entry) => entry.cardId === active.cardId && entry.cynthiaState,
    );
    if (returnedIndex >= 0) enemy.hand.splice(returnedIndex, 1);
    enemy.field.push(active);
    enemy.hand.splice(
      Math.min(handIdx, enemy.hand.length),
      0,
      recallEntry,
    );
    syncCynthiaVisual(game);
    return false;
  }

  game._cynthiaRecallUsedTurn = turnKey(game);
  pushLog(game, `난천: 돌아와, ${outgoingName}! ${targetName}, 부탁해!`);
  syncCynthiaVisual(game);
  return true;
}

function supportPoolFor(game) {
  const active = activeCynthiaUnit(game);
  const key = active?.cardId || getCynthiaPreferredDeployId(game);
  const pool = SUPPORT_POOLS[key] || [];
  return pool.filter((cardId) => Boolean(CARD_MAP[cardId]));
}

function grantCynthiaTurnCards(game) {
  if (!isCynthiaBattle(game) || game.turn !== "enemy" || game.winner) return;

  const key = turnKey(game);
  if (game._cynthiaGrantedTurn === key) return;
  game._cynthiaGrantedTurn = key;

  const enemy = game.players.enemy;
  const pool = supportPoolFor(game);
  if (pool.length > 0) {
    const cardId = pool[Math.floor(Math.random() * pool.length)];
    enemy.hand.push(
      makeCynthiaHandCard(game, cardId, {
        cynthiaGenerated: true,
      }),
    );
    pushLog(game, `난천이 ${CARD_MAP[cardId]?.name || "카드"}을 준비했다.`);
  }

  if (!enemy.hand.some((entry) => entry.cardId === CYNTHIA_RECALL_CARD_ID)) {
    enemy.hand.push(makeCynthiaHandCard(game, CYNTHIA_RECALL_CARD_ID));
    pushLog(game, "난천의 손에 0코스트 「돌아와!」가 준비됐다.");
  }

  syncCynthiaVisual(game);
}

function reconcileCynthiaParty(game) {
  if (!isCynthiaBattle(game)) return;

  const remaining = remainingSignatureIds(game);
  const fainted = CYNTHIA_SIGNATURE_IDS.filter(
    (cardId) => !remaining.includes(cardId),
  );
  game._cynthiaFaintedIds = fainted;

  if (remaining.length > 0) {
    const enemy = game.players.enemy;
    if (enemy.maxHp != null) enemy.hp = enemy.maxHp;
    if (game.winner === "player" && enemy.hp > 0) game.winner = null;
  } else if (!game.winner) {
    game.winner = "player";
    pushLog(game, "난천의 여섯 포켓몬이 모두 쓰러졌다! 챔피언전 승리!");
  }

  syncCynthiaVisual(game);
}

function resolvePainSplit(game) {
  const spiritomb = activeCynthiaUnit(game);
  if (
    spiritomb?.cardId !== "sinnoh_cynthia_spiritomb" ||
    spiritomb._cynthiaPainSplitUsed ||
    spiritomb.hp <= 0 ||
    spiritomb.hp > Math.floor(spiritomb.maxHp / 2)
  ) {
    return false;
  }

  const target = [...game.players.player.field]
    .filter((unit) => unit.hp > spiritomb.hp)
    .sort((a, b) => b.hp - a.hp)[0];
  if (!target) return false;

  const spiritBefore = spiritomb.hp;
  const targetBefore = target.hp;
  const average = Math.floor((spiritBefore + targetBefore) / 2);

  spiritomb.hp = Math.min(spiritomb.maxHp, average);
  target.hp = Math.min(target.maxHp, average);
  spiritomb._cynthiaPainSplitUsed = true;

  if (spiritomb.hp > spiritBefore) {
    addImpact(game, {
      type: "heal",
      side: "enemy",
      targetUid: spiritomb.uid,
      amount: spiritomb.hp - spiritBefore,
    });
  }
  if (target.hp < targetBefore) {
    addImpact(game, {
      type: "damage",
      side: "player",
      targetUid: target.uid,
      amount: targetBefore - target.hp,
    });
  }

  pushLog(
    game,
    `난천의 화강돌의 아픔나누기! ${target.name}과 체력을 나눠 가졌다!`,
  );
  return true;
}

function resolveMirrorCoat(game, card, activeBefore) {
  if (
    card?.kind !== "spell" ||
    activeBefore?.cardId !== "sinnoh_cynthia_gastrodon"
  ) {
    return false;
  }

  const gastrodon = game.players.enemy.field.find(
    (unit) => unit.uid === activeBefore.uid && unit.hp > 0,
  );
  if (!gastrodon) return false;

  const key = `${game.turnCount || 0}:player`;
  if (gastrodon._cynthiaMirrorCoatTurn === key) return false;

  const damaged = game.lastAction?.impacts?.some(
    (impact) =>
      impact.type === "damage" &&
      impact.side === "enemy" &&
      impact.targetUid === gastrodon.uid &&
      impact.amount > 0,
  );
  if (!damaged) return false;

  gastrodon._cynthiaMirrorCoatTurn = key;
  const player = game.players.player;
  const damage = Math.min(2, Math.max(0, player.hp));
  player.hp = Math.max(0, player.hp - damage);

  addImpact(game, {
    type: "damage",
    side: "player",
    targetUid: "hero",
    amount: damage,
  });
  pushLog(game, `난천의 트리토돈의 미러코트! 플레이어에게 피해 ${damage}!`);

  if (player.hp <= 0 && !game.winner) game.winner = "enemy";
  return true;
}

function resolveCompetitive(game, activeBefore) {
  if (activeBefore?.cardId !== "sinnoh_cynthia_milotic") return false;

  const milotic = game.players.enemy.field.find(
    (unit) => unit.uid === activeBefore.uid && unit.hp > 0,
  );
  if (!milotic || milotic.atk >= activeBefore.atk) return false;

  if ((milotic._cynthiaCompetitiveTriggers || 0) >= MAX_COMPETITIVE_TRIGGERS) {
    return false;
  }

  milotic._cynthiaCompetitiveTriggers =
    (milotic._cynthiaCompetitiveTriggers || 0) + 1;
  milotic.atk += 2;
  pushLog(
    game,
    `난천의 밀로틱의 승기! 공격력 +2 (${milotic._cynthiaCompetitiveTriggers}/${MAX_COMPETITIVE_TRIGGERS})`,
  );
  return true;
}

function applyToxicSpikes(game, card, beforePlayerUids) {
  if (
    card?.kind !== "pokemon" ||
    card.evolvesFrom ||
    (game._cynthiaToxicSpikes || 0) <= 0
  ) {
    return false;
  }

  const unit = game.players.player.field.find(
    (entry) => !beforePlayerUids.has(entry.uid),
  );
  if (!unit || unit.status) return false;

  unit.status = "poison";
  game._cynthiaToxicSpikes = Math.max(0, game._cynthiaToxicSpikes - 1);
  pushLog(
    game,
    `독압정! ${unit.name}이(가) 독 상태가 됐다. 남은 독압정 ${game._cynthiaToxicSpikes}개.`,
  );
  return true;
}

function resolveAquaRing(game) {
  const milotic = activeCynthiaUnit(game);
  if (
    milotic?.cardId !== "sinnoh_cynthia_milotic" ||
    milotic.hp <= 0 ||
    milotic.hp >= milotic.maxHp
  ) {
    return 0;
  }

  const heal = Math.min(2, milotic.maxHp - milotic.hp);
  milotic.hp += heal;

  game.animSeq = (game.animSeq || 0) + 1;
  game.lastAction = {
    seq: game.animSeq,
    kind: "ability",
    side: "enemy",
    cardId: "sinnoh_cynthia_milotic",
    impacts: [
      {
        type: "heal",
        side: "enemy",
        targetUid: milotic.uid,
        amount: heal,
      },
    ],
  };

  pushLog(game, `난천의 밀로틱의 아쿠아링! 체력 ${heal} 회복!`);
  return heal;
}

function clearDragonRushFlinch(game) {
  game.players.player.field.forEach((unit) => {
    delete unit._cynthiaDragonRushFlinch;
  });
}

function cynthiaAttackBonus(attacker) {
  if (!attacker) return 0;

  let bonus = 0;

  if (attacker.cardId === "sinnoh_cynthia_lucario") {
    if (attacker._cynthiaExtremeSpeedBoost) bonus += 2;

    if (attacker.hp <= 2) bonus += 2;
    else if (attacker.hp <= Math.floor(attacker.maxHp / 2)) bonus += 1;
  }

  if (
    attacker.cardId === "sinnoh_cynthia_garchomp" &&
    attacker._cynthiaDragonRushReady
  ) {
    bonus += 2;
  }

  return bonus;
}

function applyAttackBonus(game, target, targetRef, beforeHp, bonus) {
  if (bonus <= 0 || beforeHp == null) return 0;

  if (target.uid === "hero") {
    const player = game.players.player;
    const baseDamage = Math.max(0, beforeHp - player.hp);
    if (baseDamage <= 0 || player.hp <= 0) return 0;

    const dealt = Math.min(bonus, player.hp);
    player.hp = Math.max(0, player.hp - dealt);
    addImpact(game, {
      type: "damage",
      side: "player",
      targetUid: "hero",
      amount: dealt,
    });
    if (player.hp <= 0 && !game.winner) game.winner = "enemy";
    return dealt;
  }

  if (!targetRef) return 0;
  const baseDamage = Math.max(0, beforeHp - targetRef.hp);
  if (baseDamage <= 0 || targetRef.hp <= 0) return 0;

  const dealt = Math.min(bonus, targetRef.hp);
  targetRef.hp = Math.max(0, targetRef.hp - dealt);
  addImpact(game, {
    type: "damage",
    side: "player",
    targetUid: targetRef.uid,
    amount: dealt,
  });

  if (targetRef.hp <= 0) base.cleanupDeaths(game, true);
  return dealt;
}

function consumeCynthiaAttackFlags(game, attacker, targetRef) {
  if (!attacker) return;

  if (attacker.cardId === "sinnoh_cynthia_lucario") {
    delete attacker._cynthiaExtremeSpeedBoost;
  }

  if (
    attacker.cardId === "sinnoh_cynthia_garchomp" &&
    attacker._cynthiaDragonRushReady
  ) {
    if (targetRef && targetRef.hp > 0) {
      targetRef._cynthiaDragonRushFlinch = true;
      pushLog(
        game,
        `${targetRef.name}이(가) 드래곤다이브에 풀죽었다! 다음 턴 공격할 수 없다!`,
      );
    }
    delete attacker._cynthiaDragonRushReady;
  }
}

function activeSnapshot(game) {
  const active = activeCynthiaUnit(game);
  if (!active) return null;
  return {
    uid: active.uid,
    cardId: active.cardId,
    hp: active.hp,
    atk: active.atk,
  };
}

function cynthiaSpellSurcharge(game, side, card) {
  if (!isCynthiaBattle(game) || side !== "player" || card?.kind !== "spell") {
    return 0;
  }

  return activeCynthiaUnit(game)?.cardId === "sinnoh_cynthia_spiritomb" ? 1 : 0;
}

function initializeCynthiaBattle(game) {
  if (!isCynthiaBattle(game)) {
    syncCynthiaVisual(game);
    return;
  }

  const enemy = game.players.enemy;
  enemy.deck = [];
  enemy.hand = CYNTHIA_SIGNATURE_IDS.map((cardId) =>
    makeCynthiaHandCard(game, cardId),
  );
  enemy.field = [];
  enemy.fieldCapacity = 1;
  enemy.discard = [];

  game._cynthiaFaintedIds = [];
  game._cynthiaToxicSpikes = 0;
  game._cynthiaToxicSpikesEver = false;
  game._cynthiaRecallUsedTurn = null;
  game._cynthiaGrantedTurn = null;
  game._cynthiaAceVisualShown = false;

  deployCynthiaSignature(game, "sinnoh_cynthia_spiritomb", "opening", true);

  if (game.turn === "enemy") {
    grantCynthiaTurnCards(game);
  }

  reconcileCynthiaParty(game);
}

export function effectiveCost(card, game, side = null, handCard = null) {
  return Math.max(
    0,
    base.effectiveCost(card, game, side, handCard) +
      cynthiaSpellSurcharge(game, side, card),
  );
}

export function canPlayCard(game, side, handIdx) {
  const handCard = game.players[side]?.hand?.[handIdx];
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  if (!card) return false;

  if (isCynthiaBattle(game) && side === "enemy") {
    if (card.id === CYNTHIA_RECALL_CARD_ID) {
      return shouldCynthiaRecall(game);
    }

    if (isCynthiaSignatureId(card.id)) {
      if (game.players.enemy.field.length > 0) return false;
      const preferred = getCynthiaPreferredDeployId(game);
      if (card.id !== preferred) return false;
    }
  }

  const surcharge = cynthiaSpellSurcharge(game, side, card);
  if (
    surcharge > 0 &&
    game.players[side].mana < base.effectiveCost(card, game, side, handCard) + surcharge
  ) {
    return false;
  }

  return base.canPlayCard(game, side, handIdx);
}

export function createGame(playerDeckIds, trainer) {
  const game = base.createGame(playerDeckIds, trainer);
  initializeCynthiaBattle(game);
  return game;
}

export function canAttack(game, side, unitUid) {
  if (!base.canAttack(game, side, unitUid)) return false;

  if (isCynthiaBattle(game) && side === "player") {
    const unit = game.players.player.field.find((entry) => entry.uid === unitUid);
    if (unit?._cynthiaDragonRushFlinch) return false;
  }

  return true;
}

export function validAttackTargets(game, side, attackerUid) {
  if (!canAttack(game, side, attackerUid)) {
    return { units: [], hero: false };
  }

  const targets = base.validAttackTargets(game, side, attackerUid);

  if (
    isCynthiaBattle(game) &&
    side === "player" &&
    remainingSignatureIds(game).length > 0
  ) {
    return {
      ...targets,
      units: targets.units.filter((unit) => isCynthiaSignatureId(unit.cardId)),
      hero: false,
    };
  }

  return targets;
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const handCard = game.players[side]?.hand?.[handIdx] || null;
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  if (!card || !canPlayCard(game, side, handIdx)) return false;

  if (
    isCynthiaBattle(game) &&
    side === "player" &&
    remainingSignatureIds(game).length > 0 &&
    target?.uid === "hero" &&
    base.spellNeedsTarget(card) === "enemy"
  ) {
    return false;
  }

  if (
    isCynthiaBattle(game) &&
    side === "enemy" &&
    card.id === CYNTHIA_RECALL_CARD_ID
  ) {
    const result = resolveCynthiaRecall(game, handIdx);
    reconcileCynthiaParty(game);
    return result;
  }

  const activeBefore = activeSnapshot(game);
  const beforePlayerUids = new Set(
    game.players.player.field.map((unit) => unit.uid),
  );
  const surcharge = cynthiaSpellSurcharge(game, side, card);
  const signatureState =
    isCynthiaBattle(game) && side === "enemy" && isCynthiaSignatureId(card.id)
      ? handCard.cynthiaState || null
      : null;

  const result = base.playCard(game, side, handIdx, target, fieldIndex);
  if (!result) return false;

  if (surcharge > 0) {
    game.players.player.mana = Math.max(0, game.players.player.mana - surcharge);
    pushLog(game, "난천의 화강돌의 원한! 기술 사용에 마나 1을 추가로 소모했다!");
  }

  if (isCynthiaBattle(game) && side === "enemy" && isCynthiaSignatureId(card.id)) {
    const unit = activeCynthiaUnit(game);
    restoreCynthiaUnit(unit, signatureState);
    applyCynthiaEntryEffects(game, unit, "deploy");
  }

  if (isCynthiaBattle(game) && side === "player") {
    applyToxicSpikes(game, card, beforePlayerUids);
    resolveCompetitive(game, activeBefore);
    resolveMirrorCoat(game, card, activeBefore);
    resolvePainSplit(game);
  }

  reconcileCynthiaParty(game);
  return result;
}

export function attack(game, side, attackerUid, target) {
  if (!canAttack(game, side, attackerUid)) return false;

  const activeBefore = activeSnapshot(game);
  const attacker = game.players[side].field.find((unit) => unit.uid === attackerUid);
  const targetSide = base.other(side);
  const targetRef =
    target?.uid === "hero"
      ? null
      : game.players[targetSide].field.find((unit) => unit.uid === target?.uid) || null;
  const beforeHp =
    target?.uid === "hero"
      ? game.players[targetSide].hp
      : targetRef?.hp ?? null;
  const bonus = isCynthiaBattle(game) && side === "enemy"
    ? cynthiaAttackBonus(attacker)
    : 0;

  const result = base.attack(game, side, attackerUid, target);
  if (!result) return false;

  if (isCynthiaBattle(game) && side === "enemy") {
    applyAttackBonus(game, target, targetRef, beforeHp, bonus);
    consumeCynthiaAttackFlags(game, attacker, targetRef);
  }

  if (isCynthiaBattle(game) && side === "player") {
    resolveCompetitive(game, activeBefore);
    resolvePainSplit(game);
  }

  reconcileCynthiaParty(game);
  return true;
}

export function endTurn(game) {
  const endingSide = game.turn;

  if (isCynthiaBattle(game) && endingSide === "enemy") {
    resolveAquaRing(game);
  }

  const result = base.endTurn(game);

  if (isCynthiaBattle(game)) {
    if (endingSide === "player") {
      clearDragonRushFlinch(game);
    }

    reconcileCynthiaParty(game);

    if (!game.winner && endingSide === "player" && game.turn === "enemy") {
      grantCynthiaTurnCards(game);
    }
  }

  return result;
}

export function cleanupDeaths(game, ...args) {
  const result = base.cleanupDeaths(game, ...args);
  reconcileCynthiaParty(game);
  return result;
}
