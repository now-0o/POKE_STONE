import * as core from "./unova-legendary-balance.js";
import { CARD_MAP } from "../data/cards.js";

export * from "./unova-legendary-balance.js";

const N_GIMMICK = "n_bond";
const N_MAX_FRIENDSHIP = 3;
const N_RETURN_FRIENDSHIP = 2;
const N_DEFECTION_TURNS = 2;
const N_MAX_FRIENDSHIP_LOSS_PER_TURN = 2;

function isNBattle(game) {
  return game?.trainer?.gimmick === N_GIMMICK;
}

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

function ensureNFriendship(game) {
  if (!isNBattle(game)) return;
  for (const unit of game.players?.player?.field || []) {
    if (unit._nDefected) continue;
    if (!Number.isFinite(unit._nFriendship)) {
      unit._nFriendship = N_MAX_FRIENDSHIP;
    }
  }
}

function nDefectedCount(game) {
  if (!isNBattle(game)) return 0;
  return (game.players?.enemy?.field || []).filter((unit) => unit._nDefected).length;
}

function nPlacementConsumesSlot(card, handCard) {
  if (card?.kind !== "pokemon") return false;
  if (!card.evolvesFrom) return true;
  return !!handCard?._voltSwitchFreePlay;
}

function nReservedFieldFull(game, side, card, handCard) {
  if (!isNBattle(game) || side !== "player") return false;
  if (!nPlacementConsumesSlot(card, handCard)) return false;
  const player = game.players.player;
  const capacity = player.fieldCapacity ?? core.MAX_FIELD;
  return player.field.length + nDefectedCount(game) >= capacity;
}

function syncNState(game) {
  if (typeof window === "undefined" || !game) return;
  window.__pokeNState = {
    game,
    phase: game._nPhase || 1,
  };
  window.dispatchEvent(
    new CustomEvent("unova-n-state-change", { detail: window.__pokeNState }),
  );
}

function dispatchNTransfer(unit, fromSide, toSide, kind) {
  if (typeof window === "undefined" || !unit) return;
  window.dispatchEvent(
    new CustomEvent("unova-n-transfer", {
      detail: {
        uid: unit.uid,
        fromSide,
        toSide,
        kind,
        friendship: unit._nFriendship,
        remainingTurns: unit._nDefectTurnsRemaining || 0,
      },
    }),
  );
}

function dispatchNPhaseSummon(unit, phase) {
  if (typeof window === "undefined" || !unit) return;
  window.dispatchEvent(
    new CustomEvent("unova-n-phase-summon", {
      detail: {
        uid: unit.uid,
        cardId: unit.cardId,
        name: CARD_MAP[unit.cardId]?.name || unit.name,
        phase,
      },
    }),
  );
}

function nUnitValue(unit) {
  if (!unit) return Infinity;
  const rarityBonus = unit.rarity === "L" ? 20 : unit.rarity === "E" ? 6 : 0;
  return (Number(unit.atk) || 0) * 2 + (Number(unit.hp) || 0) + rarityBonus;
}

function returnEnemyUnitToHand(game, unit, reason) {
  const enemy = game.players.enemy;
  const index = enemy.field.findIndex((entry) => entry.uid === unit.uid);
  if (index < 0) return false;

  enemy.field.splice(index, 1);
  if (enemy.hand.length >= core.MAX_HAND) {
    const burned = enemy.hand.shift();
    if (burned) {
      game.log.push(
        `${CARD_MAP[burned.cardId]?.name || "카드"}이(가) 손패 공간을 만들기 위해 사라졌다.`,
      );
    }
  }

  const handCard = {
    uid: unit.uid,
    cardId: unit.cardId,
    shiny: !!unit.shiny,
  };
  if (CARD_MAP[unit.cardId]?.evolvesFrom) handCard._voltSwitchFreePlay = true;
  enemy.hand.push(handCard);
  game.log.push(`${reason} ${unit.name}이(가) N의 손으로 돌아갔다.`);
  return true;
}

function bounceWeakestNNormal(game, reason = "전설의 포켓몬이 자리를 만든다!") {
  const enemy = game.players.enemy;
  if (enemy.field.length < (enemy.fieldCapacity ?? core.MAX_FIELD)) return true;

  let candidates = enemy.field.filter(
    (unit) => !unit._nDefected && !unit._nSignatureLegend && unit.rarity !== "L",
  );
  if (!candidates.length) {
    candidates = enemy.field.filter(
      (unit) => !unit._nDefected && !unit._nSignatureLegend,
    );
  }
  if (!candidates.length) return false;

  candidates.sort((a, b) => nUnitValue(a) - nUnitValue(b));
  return returnEnemyUnitToHand(game, candidates[0], reason);
}

function moveUnitToN(game, unit) {
  if (!isNBattle(game) || !unit || unit._nDefected || unit.hp <= 0) return false;
  const player = game.players.player;
  const enemy = game.players.enemy;
  const index = player.field.findIndex((entry) => entry.uid === unit.uid);
  if (index < 0) return false;

  if (enemy.field.length >= (enemy.fieldCapacity ?? core.MAX_FIELD)) {
    const madeRoom = bounceWeakestNNormal(
      game,
      "N이 흔들린 마음을 받아들이기 위해 필드를 비웠다!",
    );
    if (!madeRoom) return false;
  }

  player.field.splice(index, 1);
  unit._nOriginalFieldIndex = index;
  unit._nDefected = true;
  unit._nDefectTurnsRemaining = N_DEFECTION_TURNS;
  unit._nFriendship = 0;
  unit.side = "enemy";
  unit.canAttack = game.turn === "enemy" && !unit.status && !unit.resting;
  enemy.field.push(unit);

  game.log.push(
    `${unit.name}의 친밀도가 0이 되었다! 마음이 N에게 기울어 ${N_DEFECTION_TURNS}턴 동안 전향한다!`,
  );
  dispatchNTransfer(unit, "player", "enemy", "defect");
  return true;
}

function releaseNDefections(game) {
  if (!isNBattle(game) || game.turn !== "enemy") return;
  const enemy = game.players.enemy;
  const player = game.players.player;

  for (const unit of [...enemy.field]) {
    if (!unit._nDefected) continue;
    unit._nDefectTurnsRemaining = Math.max(
      0,
      (Number(unit._nDefectTurnsRemaining) || 0) - 1,
    );
    if (unit._nDefectTurnsRemaining > 0) continue;

    const enemyIndex = enemy.field.findIndex((entry) => entry.uid === unit.uid);
    if (enemyIndex < 0) continue;
    enemy.field.splice(enemyIndex, 1);

    unit.side = "player";
    unit._nDefected = false;
    unit._nDefectTurnsRemaining = 0;
    unit._nFriendship = N_RETURN_FRIENDSHIP;
    unit.canAttack = false;
    delete unit._nFriendshipLossTurn;
    delete unit._nFriendshipLossThisTurn;

    const capacity = player.fieldCapacity ?? core.MAX_FIELD;
    if (player.field.length >= capacity) {
      const displaced = player.field.pop();
      if (displaced) {
        player.hand.push({
          uid: displaced.uid,
          cardId: displaced.cardId,
          shiny: !!displaced.shiny,
          ...(CARD_MAP[displaced.cardId]?.evolvesFrom
            ? { _voltSwitchFreePlay: true }
            : {}),
        });
        game.log.push(`${displaced.name}이(가) 복귀 자리를 만들기 위해 손으로 돌아갔다.`);
      }
    }

    const returnIndex = Math.max(
      0,
      Math.min(Number(unit._nOriginalFieldIndex) || 0, player.field.length),
    );
    player.field.splice(returnIndex, 0, unit);
    delete unit._nOriginalFieldIndex;

    game.log.push(`${unit.name}을(를) 묶던 사슬이 풀렸다! 친밀도 ${N_RETURN_FRIENDSHIP}로 돌아왔다.`);
    dispatchNTransfer(unit, "enemy", "player", "return");
  }
}

function applyNStressAfterAttack(game, attackerUid, snapshot) {
  if (!isNBattle(game) || !snapshot) return;
  const unit = game.players.player.field.find(
    (entry) => entry.uid === attackerUid && entry.hp > 0,
  );
  if (!unit || unit._nDefected) return;

  if (!Number.isFinite(unit._nFriendship)) unit._nFriendship = N_MAX_FRIENDSHIP;

  const turn = game.turnCount;
  if (unit._nFriendshipLossTurn !== turn) {
    unit._nFriendshipLossTurn = turn;
    unit._nFriendshipLossThisTurn = 0;
  }

  const reasons = [];
  if (snapshot.maxHp > 0 && snapshot.hp <= Math.ceil(snapshot.maxHp / 2)) {
    reasons.push("저체력 상태에서 공격");
  }
  if (snapshot.status || snapshot.frozen > 0) {
    reasons.push("상태이상 상태에서 공격");
  }
  if (
    Number.isInteger(snapshot.lastAttackTurn) &&
    snapshot.lastAttackTurn === turn - 1
  ) {
    reasons.push("2턴 이상 연속 공격");
  }

  const alreadyLost = Number(unit._nFriendshipLossThisTurn) || 0;
  const room = Math.max(0, N_MAX_FRIENDSHIP_LOSS_PER_TURN - alreadyLost);
  const loss = Math.min(room, reasons.length, unit._nFriendship);
  const before = unit._nFriendship;

  if (loss > 0) {
    unit._nFriendship = Math.max(0, unit._nFriendship - loss);
    unit._nFriendshipLossThisTurn = alreadyLost + loss;
    game.log.push(
      `N이 ${unit.name}의 지친 마음을 들었다. 친밀도 ${before} → ${unit._nFriendship} (${reasons.slice(0, loss).join(" · ")})`,
    );
  }

  unit._nLastAttackTurn = turn;
  if (unit._nFriendship <= 0) moveUnitToN(game, unit);
}

function resolveZeroFriendship(game) {
  if (!isNBattle(game)) return;
  for (const unit of [...game.players.player.field]) {
    if ((unit._nFriendship || 0) <= 0) moveUnitToN(game, unit);
  }
}

function forceNSignature(game, cardId, phase) {
  if (!isNBattle(game)) return null;
  const card = CARD_MAP[cardId];
  if (!card) return null;
  const enemy = game.players.enemy;

  if (enemy.field.length >= (enemy.fieldCapacity ?? core.MAX_FIELD)) {
    if (!bounceWeakestNNormal(game)) return null;
  }

  game._nForcedSeq = (game._nForcedSeq || 0) + 1;
  const handUid = `n-phase-${phase}-${game._nForcedSeq}`;
  const beforeUids = new Set(enemy.field.map((unit) => unit.uid));
  enemy.hand.push({ uid: handUid, cardId });
  const handIdx = enemy.hand.length - 1;
  const originalCost = card.cost;
  const originalTurn = game.turn;
  let result = false;

  card.cost = 0;
  game.turn = "enemy";
  try {
    result = core.playCard(game, "enemy", handIdx, null);
  } finally {
    card.cost = originalCost;
    game.turn = originalTurn;
  }

  if (!result) {
    const failedIdx = enemy.hand.findIndex((entry) => entry.uid === handUid);
    if (failedIdx >= 0) enemy.hand.splice(failedIdx, 1);
    return null;
  }

  const unit = enemy.field.find((entry) => !beforeUids.has(entry.uid));
  if (!unit) return null;
  unit._nSignatureLegend = true;
  unit._nPhaseSummoned = phase;
  unit.name = `N의 ${card.name}`;
  unit.canAttack = false;

  game.log.push(
    phase === 2
      ? `N의 2페이즈! 레시라무가 진실을 증명하기 위해 합류했다!`
      : `N의 3페이즈! 제크로무가 이상을 증명하기 위해 합류했다!`,
  );
  dispatchNPhaseSummon(unit, phase);
  return unit;
}

function resolveNPhaseGate(game) {
  if (!isNBattle(game) || game.winner === "enemy") return false;
  const enemy = game.players.enemy;
  const maxHp = enemy.maxHp || game.trainer?.hp || 96;
  const phase2Hp = Math.ceil((maxHp * 2) / 3);
  const phase3Hp = Math.ceil(maxHp / 3);
  const phase = game._nPhase || 1;

  if (phase === 1 && enemy.hp <= phase2Hp) {
    enemy.hp = phase2Hp;
    if (game.winner === "player") game.winner = null;
    game._nPhase = 2;
    forceNSignature(game, "reshiram", 2);
    return true;
  }

  if (phase === 2 && enemy.hp <= phase3Hp) {
    enemy.hp = phase3Hp;
    if (game.winner === "player") game.winner = null;
    game._nPhase = 3;
    forceNSignature(game, "zekrom", 3);
    return true;
  }

  return false;
}

export function createGame(playerDeckIds, trainer, playerDeckShiny = null) {
  const game = core.createGame(playerDeckIds, trainer, playerDeckShiny);
  if (isNBattle(game)) {
    game._nPhase = 1;
    game._nForcedSeq = 0;
    game.log.push(
      "N의 포켓몬의 마음: 친밀도는 3에서 시작한다. 지친 포켓몬을 계속 공격시키면 친밀도가 내려가며, 0이 되면 N에게 2턴간 전향한다.",
    );
  }
  ensureNFriendship(game);
  syncNState(game);
  return game;
}

export function canPlayCard(game, side, handIdx) {
  const player = game?.players?.[side];
  const handCard = player?.hand?.[handIdx];
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  if (!handCard || !card) return false;
  if (nReservedFieldFull(game, side, card, handCard)) return false;
  return withVoltSwitchReplay(card, handCard, () =>
    core.canPlayCard(game, side, handIdx),
  );
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const player = game?.players?.[side];
  const handCard = player?.hand?.[handIdx];
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  if (!player || !handCard || !card) return false;
  if (nReservedFieldFull(game, side, card, handCard)) return false;

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

  if (result) {
    ensureNFriendship(game);
    resolveNPhaseGate(game);
    resolveZeroFriendship(game);
  }
  syncNState(game);
  return result;
}

export function attack(game, side, attackerUid, target) {
  ensureNFriendship(game);
  const attacker = game.players?.[side]?.field?.find((unit) => unit.uid === attackerUid);
  const stressSnapshot =
    isNBattle(game) && side === "player" && attacker
      ? {
          hp: attacker.hp,
          maxHp: attacker.maxHp,
          status: attacker.status,
          frozen: attacker.frozen || 0,
          lastAttackTurn: attacker._nLastAttackTurn,
        }
      : null;

  const result = core.attack(game, side, attackerUid, target);
  if (result) {
    resolveNPhaseGate(game);
    if (side === "player") applyNStressAfterAttack(game, attackerUid, stressSnapshot);
    ensureNFriendship(game);
    resolveZeroFriendship(game);
  }
  syncNState(game);
  return result;
}

export function endTurn(game) {
  const endingSide = game.turn;
  if (isNBattle(game) && endingSide === "enemy") {
    releaseNDefections(game);
  }

  const result = core.endTurn(game);
  if (isNBattle(game)) {
    ensureNFriendship(game);
    resolveNPhaseGate(game);
    if (game.turn === "enemy") resolveZeroFriendship(game);
  }
  syncNState(game);
  return result;
}
