// ============================================================
// 포케스톤 배틀 엔진 확장 래퍼
// - 기존 엔진 전체는 engine.base.js에 그대로 보존한다.
// - 하나지방 체육관 전용 룰과 공통 핫픽스를 이 파일에서 감싼다.
// ============================================================

import * as base from "./engine.base.js";
import { CARD_MAP, TYPE_CHART } from "../data/cards.js";

export * from "./engine.base.js";

const BURGH_COCOON_EVOLUTIONS = {
  sewaddle: "leavanny",
  venipede: "scolipede",
  dwebble: "crustle",
  karrablast: "escavalier",
  shelmet: "accelgor",
  joltik: "galvantula",
  larvesta: "volcarona",
};

const DRAYDEN_TRIALS = {
  attack_twice: "이번 턴 포켓몬으로 2회 이상 공격하라",
  use_technique: "이번 턴 기술 카드를 1장 이상 사용하라",
  no_technique: "이번 턴 기술 카드를 사용하지 마라",
  spend_mana: "턴 종료 시 남은 마나를 1 이하로 만들어라",
};

function hasAbility(unit, ability) {
  return !!unit && (unit.ability === ability || unit.secondaryAbility === ability);
}

function cardIdOf(entry) {
  return typeof entry === "string" ? entry : entry?.cardId;
}

function typeMultiplier(attackType, defendType) {
  return TYPE_CHART[attackType]?.[defendType] ?? 1;
}

// ============================================================
// 공통 핫픽스 - 탈출버튼
// 피해를 받고 살아남은 바로 그 행동 안에서 즉시 손으로 복귀시킨다.
// base 엔진의 전투 방어자 전용 처리만으로는 반격/기술/특성 피해가 빠지므로
// 외부 행동 진입점 전후의 HP를 비교해 모든 피해 경로를 동일하게 보정한다.
// ============================================================
function snapshotFieldHp(game) {
  const snapshot = new Map();
  for (const side of ["player", "enemy"]) {
    for (const unit of game?.players?.[side]?.field || []) {
      snapshot.set(unit.uid, { side, hp: unit.hp });
    }
  }
  return snapshot;
}

function resolveImmediateEjectButtons(game, snapshot) {
  if (!game || !snapshot?.size) return;

  for (const side of ["player", "enemy"]) {
    const player = game.players?.[side];
    if (!player) continue;

    for (const unit of [...player.field]) {
      const before = snapshot.get(unit.uid);
      if (!before || before.side !== side) continue;
      if (unit.item !== "eject_button") continue;
      if (unit.hp <= 0 || unit.hp >= before.hp) continue;
      if (player.hand.length >= base.MAX_HAND) continue;

      const index = player.field.findIndex((entry) => entry.uid === unit.uid);
      if (index < 0) continue;

      // 먼저 도구를 소모하고 필드에서 제거한다.
      // 손에서는 cardId만 다시 사용하므로 피해/버프/상태는 재소환 시 초기화된다.
      unit.item = null;
      player.field.splice(index, 1);
      player.hand.push({ uid: unit.uid, cardId: unit.cardId, shiny: !!unit.shiny });
      game.log.push(`${unit.name}의 탈출버튼! 피해를 버티고 즉시 손으로 돌아갔다!`);
    }
  }
}

function resolveStriatonTrainer(playerDeckIds, trainer) {
  if (trainer?.gimmick !== "striaton_counter" || !trainer.counterDecks) return trainer;

  const pokemon = (playerDeckIds || [])
    .map((entry) => CARD_MAP[cardIdOf(entry)])
    .filter((card) => card?.kind === "pokemon");
  const candidates = Object.values(trainer.counterDecks || {});
  if (!candidates.length) return trainer;

  const scored = candidates.map((entry) => ({
    entry,
    score: pokemon.reduce(
      (sum, card) => sum + typeMultiplier(entry.type, card.type),
      0,
    ),
  }));
  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  const pick = scored[0].entry;

  Object.assign(trainer, {
    name: `성신시티 관장 ${pick.member}`,
    sprite: pick.sprite,
    gymType: pick.type,
    deck: pick.deck,
    _striatonMember: pick.member,
  });
  return trainer;
}

function reviewCardKind(card) {
  if (!card) return null;
  if (card.kind === "pokemon") return "pokemon";
  if (card.kind === "item" || card.kind === "mega") return "item";
  if (card.kind === "spell" && card.type === "도구") return "item";
  if (card.kind === "spell" && card.type === "기술") return "technique";
  return null;
}

function lenoraExtraCost(card, game, side) {
  if (side !== "player" || game?.trainer?.gimmick !== "lenora_review") return 0;
  const p = game.players.player;
  const kind = reviewCardKind(card);
  return kind && kind === p._reviewPenaltyKind ? 1 : 0;
}

function withTemporaryCardCost(card, extra, fn) {
  if (!card || extra <= 0) return fn();
  const original = card.cost;
  card.cost = original + extra;
  try {
    return fn();
  } finally {
    card.cost = original;
  }
}

function protectCocoons(game) {
  if (game?.trainer?.gimmick !== "burgh_cocoon") return [];
  const snapshots = [];
  for (const unit of game.players.enemy.field) {
    if (!unit?._burghCocoon || unit.hp <= 0) continue;
    snapshots.push({ uid: unit.uid, hp: unit.hp, maxHp: unit.maxHp });
    unit.hp *= 2;
    unit.maxHp *= 2;
  }
  return snapshots;
}

function normalizeCocoons(game, snapshots) {
  if (!snapshots?.length) return;
  let killed = false;
  for (const snap of snapshots) {
    const unit = game.players.enemy.field.find((u) => u.uid === snap.uid);
    if (!unit) continue;
    unit.maxHp = snap.maxHp;
    unit.hp = Math.max(0, Math.floor(unit.hp / 2));
    if (unit.hp <= 0) killed = true;
  }
  if (killed) base.cleanupDeaths(game, true);
}

function markBurghCocoon(game, side, card, beforeUids) {
  if (
    side !== "enemy" ||
    game?.trainer?.gimmick !== "burgh_cocoon" ||
    !BURGH_COCOON_EVOLUTIONS[card?.id]
  ) return;

  const unit = game.players.enemy.field.find((u) => !beforeUids.has(u.uid));
  if (!unit) return;
  unit._burghCocoon = true;
  unit._burghEvolveTo = BURGH_COCOON_EVOLUTIONS[card.id];
  unit._burghCocoonTurns = 3;
  unit.canAttack = false;
  game.log.push(`${card.name}이(가) 고치화했다! 세 번째 다음 아티 턴 시작에 우화한다!`);
}

function evolveBurghCocoons(game) {
  if (game?.trainer?.gimmick !== "burgh_cocoon" || game.turn !== "enemy") return;

  for (const unit of [...game.players.enemy.field]) {
    if (!unit?._burghCocoon || unit.hp <= 0) continue;

    if (!Number.isInteger(unit._burghCocoonTurns)) unit._burghCocoonTurns = 1;
    unit._burghCocoonTurns = Math.max(0, unit._burghCocoonTurns - 1);
    if (unit._burghCocoonTurns > 0) {
      game.log.push(`${unit.name}의 고치가 아직 단단하다. 다음 아티 턴 시작에 우화한다!`);
      continue;
    }

    const card = CARD_MAP[unit._burghEvolveTo];
    if (!card) continue;

    const damageTaken = Math.max(0, unit.maxHp - unit.hp);
    unit.cardId = card.id;
    unit.name = card.name;
    unit.type = card.type;
    unit.atk = card.atk;
    unit.baseAtk = card.atk;
    unit.maxHp = card.hp;
    unit.hp = Math.max(1, card.hp - damageTaken);
    unit.rarity = card.rarity;
    unit.emoji = card.emoji;
    unit.ability = card.ability || null;
    unit.secondaryAbility = card.secondaryAbility || null;
    unit.stage = card.stage || 0;
    unit._burghCocoon = false;
    unit._burghEvolveTo = null;
    unit._burghCocoonTurns = null;
    game.log.push(`고치가 갈라졌다! ${unit.name}(으)로 우화했다!`);
  }
}

function chooseSpotlight(game, side) {
  if (game?.trainer?.gimmick !== "elesa_spotlight") return;
  const p = game.players[side];
  const candidates = p.field.filter((unit) => {
    if (!unit || unit.hp <= 0) return false;
    if (unit.status === "ice" || unit.status === "sleep" || (unit.frozen || 0) > 0) return false;
    if (unit.resting) return false;
    if (hasAbility(unit, "darkvoid") || hasAbility(unit, "fortress")) return false;
    return base.canAttack(game, side, unit.uid);
  });
  const pool = candidates.length ? candidates : p.field.filter((u) => u.hp > 0);
  if (!pool.length) {
    p._spotlightUid = "__none__";
    return;
  }
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  p._spotlightUid = chosen.uid;
  game.log.push(`스포트라이트 ON! ${chosen.name}만 이번 턴 전투 공격할 수 있다!`);
}

function bounceElesaSignature(game, unit) {
  if (
    game?.trainer?.gimmick !== "elesa_spotlight" ||
    !unit ||
    unit.side !== "enemy" ||
    !hasAbility(unit, "elesa_centerstage") ||
    game.players.enemy._spotlightUid !== unit.uid ||
    unit.hp <= 0
  ) return;

  const enemy = game.players.enemy;
  if (enemy.hand.length >= 10) return;
  const index = enemy.field.findIndex((u) => u.uid === unit.uid);
  if (index < 0) return;
  enemy.field.splice(index, 1);
  enemy.hand.push({ uid: unit.uid, cardId: unit.cardId });
  enemy._spotlightUid = "__none__";
  game.log.push(`${unit.name}의 센터 스테이지! 공격을 마치고 카밀레의 손으로 돌아갔다!`);
}

function disableAirborneTaunts(game) {
  if (game?.trainer?.gimmick !== "skyla_airborne") return [];
  const changed = [];
  for (const unit of game.players.enemy.field) {
    if (!unit?._skylaAirborne) continue;
    changed.push({ unit, old: unit._tauntDisabled });
    unit._tauntDisabled = true;
  }
  return changed;
}

function restoreAirborneTaunts(changed) {
  for (const entry of changed || []) entry.unit._tauntDisabled = entry.old;
}

function landSkyla(game) {
  if (game?.trainer?.gimmick !== "skyla_airborne" || game.turn !== "enemy") return;
  const airborne = game.players.enemy.field.filter((u) => u.hp > 0 && u._skylaAirborne);
  for (const unit of airborne) {
    unit._skylaAirborne = false;
    const targets = game.players.player.field.filter((u) => u.hp > 0);
    if (!targets.length) continue;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const amount = hasAbility(unit, "skyla_divebomb") ? 4 : 2;
    const damage = base.calcTypedDamage(amount, "비행", target.type);
    target.hp = Math.max(0, target.hp - damage);
    game.log.push(`${unit.name}의 착륙 급강하! ${target.name}에게 비행 피해 ${damage}!`);
  }
  if (airborne.length) base.cleanupDeaths(game);
}

function launchSkyla(game) {
  if (game?.trainer?.gimmick !== "skyla_airborne") return;
  const enemy = game.players.enemy;
  const alive = enemy.field.filter((u) => u.hp > 0 && !u._skylaAirborne);
  if (!alive.length) return;
  let pool = alive.filter((u) => u.uid !== enemy._skylaLastAirborneUid);
  if (!pool.length) pool = alive;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  chosen._skylaAirborne = true;
  enemy._skylaLastAirborneUid = chosen.uid;
  game.log.push(`${chosen.name}이(가) 이륙했다! 다음 플레이어 턴에는 전투 공격으로 지정할 수 없다!`);
}

function minecartGroundDamage(game, target, amount) {
  if (!target || target.hp <= 0) return 0;
  if (target.type === "비행" || hasAbility(target, "levitate") || target.item === "air_balloon") return 0;
  const damage = base.calcTypedDamage(amount, "땅", target.type);
  target.hp = Math.max(0, target.hp - damage);
  return damage;
}

function advanceMinecart(game, side, steps) {
  if (game?.trainer?.gimmick !== "clay_minecart") return;
  const direction = side === "enemy" ? 1 : -1;
  // 중앙 포함 7칸: -3 ~ +3. 양 끝에 닿는 즉시 폭발하고 중앙으로 복귀한다.
  game._clayMinecart = Math.max(-3, Math.min(3, (game._clayMinecart || 0) + direction * steps));
  game.log.push(`광산차 게이지 ${game._clayMinecart > 0 ? "+" : ""}${game._clayMinecart}!`);

  if (game._clayMinecart >= 3) {
    for (const unit of game.players.player.field) minecartGroundDamage(game, unit, 3);
    game._clayMinecartBurstSeq = (game._clayMinecartBurstSeq || 0) + 1;
    game._clayMinecartBurst = {
      id: game._clayMinecartBurstSeq,
      targetSide: "player",
      amount: 3,
      damageType: "ground",
    };
    game.log.push("광산차가 야콘 쪽 끝에 닿았다! 낙반! 플레이어 필드 전체에 땅 피해 3!");
    game._clayMinecart = 0;
    base.cleanupDeaths(game);
  } else if (game._clayMinecart <= -3) {
    for (const unit of game.players.enemy.field) {
      if (unit.hp > 0) unit.hp = Math.max(0, unit.hp - 2);
    }
    game._clayMinecartBurstSeq = (game._clayMinecartBurstSeq || 0) + 1;
    game._clayMinecartBurst = {
      id: game._clayMinecartBurstSeq,
      targetSide: "enemy",
      amount: 2,
      damageType: "fixed",
    };
    game.log.push("광산차를 역으로 밀어냈다! 광맥 붕괴! 야콘 필드 전체 피해 2!");
    game._clayMinecart = 0;
    base.cleanupDeaths(game);
  }
}

function brycenAfterAttack(game, side, unit) {
  if (game?.trainer?.gimmick !== "brycen_frost" || !unit || unit.type === "얼음" || unit.hp <= 0) return;
  unit._brycenAttackedTurn = `${game.turnCount}:${side}`;
  unit._brycenFrost = Math.min(2, (unit._brycenFrost || 0) + 1);

  if (unit._brycenFrost >= 2) {
    const frozen = base.applyStatus(game, unit, "ice");
    if (frozen) {
      unit._brycenFrost = 0;
      game.log.push(`${unit.name}에게 냉기가 누적되어 완전히 얼어붙었다!`);
    } else {
      unit._brycenFrost = 1;
    }
  } else {
    game.log.push(`${unit.name}에게 냉기가 서렸다. 냉기 1/2.`);
  }
}

function decayBrycenFrost(game, side) {
  if (game?.trainer?.gimmick !== "brycen_frost") return;
  const turnKey = `${game.turnCount}:${side}`;
  for (const unit of game.players[side].field) {
    if (unit.type === "얼음" || (unit._brycenFrost || 0) <= 0) continue;
    if (unit._brycenAttackedTurn !== turnKey) {
      unit._brycenFrost = Math.max(0, unit._brycenFrost - 1);
      if (unit._brycenFrost === 0) game.log.push(`${unit.name}의 냉기가 가라앉았다.`);
    }
  }
}

function startDraydenTrial(game) {
  if (game?.trainer?.gimmick !== "drayden_trials" || game.turn !== "player") return;
  const player = game.players.player;
  const pool = ["no_technique", "spend_mana"];
  const hasTechnique = player.hand.some((entry) => {
    const card = CARD_MAP[entry.cardId];
    return card?.kind === "spell" && card.type === "기술";
  });
  if (hasTechnique) pool.push("use_technique");

  const ready = player.field.filter((u) => u.hp > 0 && base.canAttack(game, "player", u.uid));
  if (ready.length >= 2 || ready.some((u) => hasAbility(u, "skilllink"))) pool.push("attack_twice");

  let choices = pool.filter((code) => code !== game._draydenLastTrial);
  if (!choices.length) choices = pool;
  const code = choices[Math.floor(Math.random() * choices.length)];
  game._draydenLastTrial = code;
  game._draydenTrial = code;
  game._draydenTrialText = DRAYDEN_TRIALS[code];
  player._draydenTrialAttacks = 0;
  player._draydenTechniqueUsed = false;
  game.log.push(`사간의 용의 시련: ${DRAYDEN_TRIALS[code]}!`);
}

function resolveDraydenTrial(game) {
  if (game?.trainer?.gimmick !== "drayden_trials" || game.turn !== "player") return;
  const player = game.players.player;
  const code = game._draydenTrial;
  if (!code) return;

  let success = false;
  if (code === "attack_twice") success = (player._draydenTrialAttacks || 0) >= 2;
  else if (code === "use_technique") success = player._draydenTechniqueUsed === true;
  else if (code === "no_technique") success = player._draydenTechniqueUsed !== true;
  else if (code === "spend_mana") success = player.mana <= 1;

  if (success) {
    game._draydenDominance = Math.max(0, (game._draydenDominance || 0) - 1);
    game.log.push(`용의 시련 성공! 용의 위압 ${game._draydenDominance}/4.`);
  } else {
    game._draydenDominance = Math.min(4, (game._draydenDominance || 0) + 1);
    game.log.push(`용의 시련 실패! 용의 위압 ${game._draydenDominance}/4!`);
  }
  game._draydenTrial = null;
  game._draydenTrialText = null;
}

function recordLenoraTurn(game) {
  if (game?.trainer?.gimmick !== "lenora_review" || game.turn !== "player") return;
  const p = game.players.player;
  const counts = p._reviewKindsThisTurn || {};
  const order = ["pokemon", "technique", "item"];
  const bestCount = Math.max(0, ...order.map((kind) => counts[kind] || 0));
  const tied = bestCount > 0
    ? order.filter((kind) => (counts[kind] || 0) === bestCount)
    : [];

  let best = tied[0] || null;
  if (tied.length > 1) {
    const sequence = p._reviewUseSequence || [];
    best = [...sequence].reverse().find((kind) => tied.includes(kind)) || best;
  }

  p._reviewPenaltyKind = best;
  p._reviewKindsThisTurn = {};
  p._reviewUseSequence = [];
  if (best) {
    const label = best === "pokemon" ? "포켓몬" : best === "technique" ? "기술" : "도구";
    const tieText = tied.length > 1 ? " 동률 판정: 마지막 사용 분류!" : "";
    game.log.push(`알로에의 복습 시험!${tieText} 다음 턴 ${label} 카드 전체 비용 +1!`);
  }
}

function syncUnovaState(game) {
  if (typeof window === "undefined" || !game) return;
  const units = [...game.players.player.field, ...game.players.enemy.field];
  window.__pokeUnovaGymState = {
    trainerId: game.trainer?.id || null,
    gimmick: game.trainer?.gimmick || null,
    turn: game.turn,
    spotlightUids: [
      game.players.player._spotlightUid,
      game.players.enemy._spotlightUid,
    ].filter((uid) => uid && uid !== "__none__"),
    cocoonUids: units.filter((u) => u._burghCocoon).map((u) => u.uid),
    frostByUid: Object.fromEntries(
      units.filter((u) => (u._brycenFrost || 0) > 0).map((u) => [u.uid, u._brycenFrost]),
    ),
    airborneUids: units.filter((u) => u._skylaAirborne).map((u) => u.uid),
    minecart: game._clayMinecart || 0,
    minecartBurst: game._clayMinecartBurst || null,
    draydenTrial: game._draydenTrialText || null,
    draydenDominance: game._draydenDominance || 0,
  };
  window.dispatchEvent(
    new CustomEvent("unova-gym-state-change", { detail: window.__pokeUnovaGymState }),
  );
}

function resetDraydenExtraAttack(game) {
  if (game?.trainer?.gimmick !== "drayden_trials" || game.turn !== "enemy") return;
  game.players.enemy.field.forEach((u) => {
    u._draydenExtraUsed = false;
  });
}

function runBaseActionWithEject(game, action) {
  const snapshot = snapshotFieldHp(game);
  const result = action();
  resolveImmediateEjectButtons(game, snapshot);
  syncUnovaState(game);
  return result;
}

export function createGame(playerDeckIds, trainer, playerDeckShiny = null) {
  const resolvedTrainer = resolveStriatonTrainer(playerDeckIds, trainer);
  const game = base.createGame(playerDeckIds, resolvedTrainer, playerDeckShiny);

  if (game.trainer?.gimmick === "clay_minecart") {
    game._clayMinecart = 0;
    game._clayMinecartBurst = null;
    game._clayMinecartBurstSeq = 0;
  }
  if (game.trainer?.gimmick === "drayden_trials") game._draydenDominance = 0;
  if (game.trainer?.gimmick === "lenora_review") {
    game.players.player._reviewKindsThisTurn = {};
    game.players.player._reviewUseSequence = [];
    game.players.player._reviewPenaltyKind = null;
  }
  if (game.trainer?.gimmick === "elesa_spotlight") chooseSpotlight(game, game.turn);
  if (game.trainer?.gimmick === "drayden_trials" && game.turn === "player") startDraydenTrial(game);
  resetDraydenExtraAttack(game);
  syncUnovaState(game);
  return game;
}

export function effectiveCost(card, game, side, handCard = null) {
  return base.effectiveCost(card, game, side, handCard) + lenoraExtraCost(card, game, side);
}

export function effectiveAtk(unit, game) {
  let value = base.effectiveAtk(unit, game);
  if (
    game?.trainer?.gimmick === "elesa_spotlight" &&
    hasAbility(unit, "elesa_centerstage") &&
    game.players?.[unit.side]?._spotlightUid === unit.uid &&
    game.turn === unit.side
  ) value += 2;
  if (
    game?.trainer?.gimmick === "drayden_trials" &&
    unit?.side === "enemy" &&
    unit.type === "드래곤"
  ) value += game._draydenDominance || 0;
  return Math.max(0, value);
}

export function canPlayCard(game, side, handIdx) {
  const handCard = game.players?.[side]?.hand?.[handIdx];
  const card = CARD_MAP[handCard?.cardId];
  const extraCost = lenoraExtraCost(card, game, side);
  return withTemporaryCardCost(card, extraCost, () =>
    base.canPlayCard(game, side, handIdx),
  );
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const damageSnapshot = snapshotFieldHp(game);
  const player = game.players?.[side];
  const handCard = player?.hand?.[handIdx];
  const card = CARD_MAP[handCard?.cardId];
  const beforeUids = new Set((player?.field || []).map((u) => u.uid));
  const extraCost = lenoraExtraCost(card, game, side);
  const cocoonSnapshots = side === "player" ? protectCocoons(game) : [];

  const result = withTemporaryCardCost(card, extraCost, () =>
    base.playCard(game, side, handIdx, target, fieldIndex),
  );

  normalizeCocoons(game, cocoonSnapshots);

  if (result) {
    if (side === "player" && game.trainer?.gimmick === "lenora_review") {
      const p = game.players.player;
      const kind = reviewCardKind(card);
      if (kind) {
        p._reviewKindsThisTurn = p._reviewKindsThisTurn || {};
        p._reviewKindsThisTurn[kind] = (p._reviewKindsThisTurn[kind] || 0) + 1;
        p._reviewUseSequence = p._reviewUseSequence || [];
        p._reviewUseSequence.push(kind);
      }
    }

    if (
      side === "player" &&
      game.trainer?.gimmick === "drayden_trials" &&
      card?.kind === "spell" &&
      card.type === "기술"
    ) {
      game.players.player._draydenTechniqueUsed = true;
    }

    markBurghCocoon(game, side, card, beforeUids);
  }

  // 기술/전투의 함성/특성 피해도 카드 처리 종료 전에 즉시 탈출한다.
  resolveImmediateEjectButtons(game, damageSnapshot);
  syncUnovaState(game);
  return result;
}

export function canAttack(game, side, attackerUid) {
  const unit = game.players?.[side]?.field?.find((u) => u.uid === attackerUid);
  if (!unit) return false;
  if (unit._burghCocoon) return false;
  if (
    game?.trainer?.gimmick === "elesa_spotlight" &&
    game.players[side]._spotlightUid &&
    game.players[side]._spotlightUid !== unit.uid
  ) return false;
  return base.canAttack(game, side, attackerUid);
}

export function validAttackTargets(game, side, attackerUid = null) {
  const changed = disableAirborneTaunts(game);
  try {
    const result = base.validAttackTargets(game, side, attackerUid);
    if (game?.trainer?.gimmick !== "skyla_airborne" || side !== "player") return result;
    return {
      ...result,
      units: result.units.filter((u) => !u._skylaAirborne),
    };
  } finally {
    restoreAirborneTaunts(changed);
  }
}

export function attack(game, side, attackerUid, target) {
  const damageSnapshot = snapshotFieldHp(game);
  const attacker = game.players?.[side]?.field?.find((u) => u.uid === attackerUid);
  if (!attacker || !canAttack(game, side, attackerUid)) return false;

  const targetSide = side === "player" ? "enemy" : "player";
  const isHeroTarget = target?.uid === "hero";
  const targetUnitBefore = isHeroTarget
    ? null
    : game.players[targetSide].field.find((u) => u.uid === target?.uid);

  if (
    game?.trainer?.gimmick === "skyla_airborne" &&
    side === "player" &&
    targetUnitBefore?._skylaAirborne
  ) return false;

  const targetHpBefore = isHeroTarget
    ? game.players[targetSide].hp
    : targetUnitBefore?.hp ?? 0;

  const cocoonSnapshots = side === "player" ? protectCocoons(game) : [];
  const tauntChanges = disableAirborneTaunts(game);

  // 노말주얼은 대상이 포켓몬이든 트레이너든 다음 기본 공격에 발동한다.
  // 포켓몬 대상은 base 엔진이 처리하므로 여기서는 트레이너 직접 공격만 보정한다.
  const normalGemHeroBonus = isHeroTarget && attacker.item === "normal_gem" ? 2 : 0;
  let temporaryAtk = normalGemHeroBonus;
  if (
    game.trainer?.gimmick === "elesa_spotlight" &&
    hasAbility(attacker, "elesa_centerstage") &&
    game.players[side]._spotlightUid === attacker.uid
  ) temporaryAtk += 2;

  if (
    game.trainer?.gimmick === "drayden_trials" &&
    side === "enemy" &&
    attacker.type === "드래곤"
  ) temporaryAtk += game._draydenDominance || 0;

  if (
    game.trainer?.gimmick === "brycen_frost" &&
    hasAbility(attacker, "brycen_icebreaker") &&
    targetUnitBefore?.status === "ice"
  ) temporaryAtk += 3;

  attacker.atk += temporaryAtk;
  let result;
  try {
    result = base.attack(game, side, attackerUid, target);
  } finally {
    const current = game.players?.[side]?.field?.find((u) => u.uid === attackerUid);
    if (current) current.atk -= temporaryAtk;
    restoreAirborneTaunts(tauntChanges);
  }

  normalizeCocoons(game, cocoonSnapshots);
  if (!result) {
    syncUnovaState(game);
    return result;
  }

  if (normalGemHeroBonus > 0 && attacker.item === "normal_gem") {
    attacker.item = null;
    game.log.push(`${attacker.name}의 노말주얼! 이번 공격 피해 +2!`);
  }

  const currentTarget = isHeroTarget
    ? null
    : game.players[targetSide].field.find((u) => u.uid === target?.uid);
  const targetHpAfter = isHeroTarget
    ? game.players[targetSide].hp
    : Math.max(0, currentTarget?.hp ?? 0);
  const dealt = Math.max(0, targetHpBefore - targetHpAfter);

  const currentAttacker = game.players?.[side]?.field?.find((u) => u.uid === attackerUid);

  if (game.trainer?.gimmick === "clay_minecart" && dealt > 0 && currentAttacker) {
    advanceMinecart(game, side, hasAbility(currentAttacker, "clay_drillliner") ? 2 : 1);
  }

  if (game.trainer?.gimmick === "brycen_frost" && currentAttacker) {
    brycenAfterAttack(game, side, currentAttacker);
  }

  if (game.trainer?.gimmick === "drayden_trials" && side === "player") {
    game.players.player._draydenTrialAttacks = (game.players.player._draydenTrialAttacks || 0) + 1;
  }

  if (
    game.trainer?.gimmick === "drayden_trials" &&
    side === "enemy" &&
    currentAttacker &&
    hasAbility(currentAttacker, "drayden_dragonking") &&
    (game._draydenDominance || 0) >= 3 &&
    !currentAttacker._draydenExtraUsed &&
    currentAttacker.hp > 0
  ) {
    currentAttacker._draydenExtraUsed = true;
    currentAttacker.canAttack = true;
    game.log.push(`${currentAttacker.name}의 용의 왕! 용의 위압으로 한 번 더 공격할 수 있다!`);
  }

  // 방어자의 직접 피격뿐 아니라 공격자가 반격 피해를 받은 경우도 여기서 즉시 복귀한다.
  // 야콘 광산차 등 attack 후처리에서 발생한 피해도 같은 스냅샷으로 함께 잡는다.
  resolveImmediateEjectButtons(game, damageSnapshot);

  if (currentAttacker) bounceElesaSignature(game, currentAttacker);
  syncUnovaState(game);
  return result;
}

export function attackFieldObstacle(game, side, attackerUid, obstacleId) {
  return runBaseActionWithEject(game, () =>
    base.attackFieldObstacle(game, side, attackerUid, obstacleId),
  );
}

// 별도 선택/해결 함수 안에서 발생하는 피해도 동일한 탈출버튼 타이밍을 보장한다.
export function resolveMoldbreaker(game, ...args) {
  return runBaseActionWithEject(game, () => base.resolveMoldbreaker(game, ...args));
}

export function resolveMew(game, ...args) {
  return runBaseActionWithEject(game, () => base.resolveMew(game, ...args));
}

export function resolveSpacialRend(game, ...args) {
  return runBaseActionWithEject(game, () => base.resolveSpacialRend(game, ...args));
}

export function resolveMagmaStorm(game, ...args) {
  return runBaseActionWithEject(game, () => base.resolveMagmaStorm(game, ...args));
}

export function resolvePhioneBraveCharge(game, ...args) {
  return runBaseActionWithEject(game, () => base.resolvePhioneBraveCharge(game, ...args));
}

export function resolveManaphyBraveCharge(game, ...args) {
  return runBaseActionWithEject(game, () => base.resolveManaphyBraveCharge(game, ...args));
}

export function endTurn(game) {
  const endingSide = game.turn;

  if (game.trainer?.gimmick === "lenora_review" && endingSide === "player") {
    recordLenoraTurn(game);
  }
  if (game.trainer?.gimmick === "brycen_frost") {
    decayBrycenFrost(game, endingSide);
  }
  if (game.trainer?.gimmick === "drayden_trials" && endingSide === "player") {
    resolveDraydenTrial(game);
  }

  const damageSnapshot = snapshotFieldHp(game);
  const cocoonSnapshots = protectCocoons(game);
  const result = base.endTurn(game);
  normalizeCocoons(game, cocoonSnapshots);

  // 날씨/상태/턴 종료 효과 피해는 턴이 화면에 넘어가기 전에 바로 복귀시킨다.
  resolveImmediateEjectButtons(game, damageSnapshot);

  if (game.trainer?.gimmick === "burgh_cocoon" && game.turn === "enemy") {
    evolveBurghCocoons(game);
  }

  if (game.trainer?.gimmick === "elesa_spotlight") {
    chooseSpotlight(game, game.turn);
  }

  if (game.trainer?.gimmick === "skyla_airborne") {
    if (endingSide === "enemy") launchSkyla(game);
    if (game.turn === "enemy") landSkyla(game);
    // 풍란 착륙 급강하처럼 base.endTurn 이후 발생하는 추가 피해도 즉시 처리한다.
    resolveImmediateEjectButtons(game, damageSnapshot);
  }

  if (game.trainer?.gimmick === "drayden_trials") {
    if (game.turn === "enemy") resetDraydenExtraAttack(game);
    if (game.turn === "player") startDraydenTrial(game);
  }

  syncUnovaState(game);
  return result;
}
