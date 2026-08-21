import * as core from "./wake-balance.js";
import { ABILITY_TEXT, CARD_MAP, TYPE_CHART } from "../data/cards.js";

export * from "./wake-balance.js";

const CYNTHIA_GIMMICK = "champion_party";
const CYNTHIA_MILOTIC_ID = "sinnoh_cynthia_milotic";
const STEVEN_METAGROSS_ID = "hoenn_steven_metagross";
const STEVEN_METAGROSSITE_ID = "hoenn_steven_metagrossite";
const STEVEN_MEGA_METAGROSS_NAME = "성호의 메가 메타그로스";
const RELAXED_FRIENDLY_TARGET = "friendly-or-hero";
const DITTO_ID = "ditto";
const DITTO_COST = 4;
const SKYLA_GIMMICK = "skyla_airborne";
const SKYLA_BYPASS_GIMMICK = "__skyla_airborne_balanced";
const MAX_CHARGE_ENERGY = 3;

const UNOVA_LEGENDARY_ABILITIES = {
  cobalion: {
    ability: "quickguard",
    text: "퍼스트가드: 상대 턴마다 처음으로 다른 아군 포켓몬이 기본 공격 또는 단일 대상 기술의 대상이 되면 대신 대상이 되고, 그 피해를 2 줄인다.",
  },
  terrakion: {
    ability: "retaliate",
    text: "원수갚기: 이 카드가 손에 있을 때 아군 포켓몬이 기절하면 다음 내 턴 동안 비용 -3, 돌진을 얻는다.",
  },
  virizion: {
    ability: "worryseed",
    text: "고민씨: 나왔을 때 상대 포켓몬 하나를 선택한다. 비리디온이 필드에 있는 동안 그 포켓몬의 특성을 비활성화한다.",
  },
  tornadus: {
    ability: "tailwind",
    text: "순풍: 필드에 있는 동안 매 내 턴 처음 내는 다른 포켓몬의 비용 -2. 그 포켓몬은 그 턴 즉시 공격할 수 있다.",
  },
  thundurus: {
    ability: "charge",
    text: "충전: 내 턴 종료 시 남은 에너지를 최대 3 저장한다. 다음 내 턴 시작 시 저장한 만큼 추가 에너지를 얻는다.",
  },
  landorus: {
    ability: "gravity",
    text: "중력: 필드에 있는 동안 상대 카드의 비용은 원래 비용보다 낮아질 수 없다. 아군의 땅 타입 공격은 비행·부유·풍선의 땅 면역을 무시한다.",
  },
  kyurem: {
    ability: "glaciate",
    text: "얼어붙은세계: 나왔을 때 상대 손패를 공개하고 카드 2장을 선택해 봉인한다. 큐레무가 필드에 있는 동안 봉인된 카드는 사용할 수 없다.",
  },
};

if (CARD_MAP[DITTO_ID]) CARD_MAP[DITTO_ID].cost = DITTO_COST;
ABILITY_TEXT.transform =
  "변신: 나왔을 때 무작위 상대 포켓몬의 공격력과 타입을 복사하고 체력이 1이 된다";

for (const [cardId, config] of Object.entries(UNOVA_LEGENDARY_ABILITIES)) {
  const card = CARD_MAP[cardId];
  if (!card) continue;
  card.ability = config.ability;
  ABILITY_TEXT[config.ability] = config.text;
}

if (CARD_MAP.discharge) {
  CARD_MAP.discharge.text =
    "상대 포켓몬 전체에게 전기 타입 피해 2를 준다. 각각 50% 확률로 마비 상태이상.";
}
if (CARD_MAP.dracometeor?.spell) {
  CARD_MAP.dracometeor.spell.amount = 6;
  CARD_MAP.dracometeor.text =
    "상대 포켓몬 전체에게 드래곤 피해 6. 사용 후 내 포켓몬 전체 공격력 -1.";
}
if (CARD_MAP.fireblast?.spell) {
  CARD_MAP.fireblast.spell.target = "enemy-any";
  CARD_MAP.fireblast.text =
    "상대 하나에게 불꽃 피해 7. 대상이 포켓몬이면 화상 상태로 만든다.";
}

function other(side) {
  return side === "player" ? "enemy" : "player";
}

function turnKey(game) {
  return `${game?.turnCount || 0}:${game?.turn || ""}`;
}

function hasAbility(unit, ability) {
  return !!unit &&
    (unit.ability === ability || unit.secondaryAbility === ability);
}

function fieldHasAbility(game, side, ability) {
  return !!game?.players?.[side]?.field?.some(
    (unit) => unit?.hp > 0 && hasAbility(unit, ability),
  );
}

function handCardInfo(game, side, handIdx) {
  const player = game.players?.[side];
  const handCard = player?.hand?.[handIdx] || null;
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  return { player, handCard, card };
}

function canHealTrainer(card) {
  return (
    card?.kind === "spell" &&
    card.spell?.target === "friendly-pokemon" &&
    core.spellNeedsTarget(card) === "friendly-or-hero"
  );
}

function withTrainerTargetAllowed(card, callback) {
  if (!canHealTrainer(card)) return callback();
  const originalTarget = card.spell.target;
  card.spell.target = RELAXED_FRIENDLY_TARGET;
  try {
    return callback();
  } finally {
    card.spell.target = originalTarget;
  }
}

function withFireBlastHero(card, target, callback) {
  if (card?.id !== "fireblast" || target?.uid !== "hero") return callback();
  const originalEffect = card.spell.effect;
  card.spell.effect = "damage";
  try {
    return callback();
  } finally {
    card.spell.effect = originalEffect;
  }
}

function normalizeStevenMegaMetagross(game, side, card, target, logStart) {
  if (card?.id !== STEVEN_METAGROSSITE_ID) return;
  const player = game.players[side];
  const unit = target?.uid
    ? player.field.find((entry) => entry.uid === target.uid)
    : player.field.find(
        (entry) => entry.cardId === STEVEN_METAGROSS_ID && entry.mega,
      );
  if (!unit || unit.cardId !== STEVEN_METAGROSS_ID || !unit.mega) return;
  unit.name = STEVEN_MEGA_METAGROSS_NAME;
  for (let i = logStart; i < game.log.length; i += 1) {
    if (typeof game.log[i] !== "string") continue;
    game.log[i] = game.log[i].replace(
      "메가 성호의 메타그로스",
      STEVEN_MEGA_METAGROSS_NAME,
    );
  }
}

function normalizeDitto(game, side, previousFieldUids) {
  if (!previousFieldUids) return;
  const player = game.players[side];
  const unit = player.field.find(
    (entry) => entry.cardId === DITTO_ID && !previousFieldUids.has(entry.uid),
  );
  if (!unit) return;
  unit.hp = 1;
  unit.maxHp = 1;
}

// ============================================================
// 하나 전설: 비용 계열
// ============================================================
function isTailwindEligible(game, side, card) {
  if (!card || card.kind !== "pokemon" || card.id === "tornadus") return false;
  if (game.turn !== side) return false;
  if (!fieldHasAbility(game, side, "tailwind")) return false;
  return game.players[side]._tailwindUsedTurnKey !== turnKey(game);
}

function isRetaliateActive(game, side, handCard) {
  return (
    handCard?.cardId === "terrakion" &&
    handCard._retaliateActiveTurnKey === turnKey(game)
  );
}

function adjustedCost(card, game, side, handCard = null) {
  if (!card) return 0;
  let cost = core.effectiveCost(card, game, side, handCard);
  if (isTailwindEligible(game, side, card)) cost -= 2;
  if (isRetaliateActive(game, side, handCard)) cost -= 3;
  if (fieldHasAbility(game, other(side), "gravity")) {
    cost = Math.max(card.cost, cost);
  }
  return Math.max(0, cost);
}

function withAdjustedCost(card, game, side, handCard, callback) {
  if (!card || !handCard) return callback();
  const currentCost = core.effectiveCost(card, game, side, handCard);
  const desiredCost = adjustedCost(card, game, side, handCard);
  const reductionDelta = currentCost - desiredCost;
  if (reductionDelta === 0) return callback();

  const hadReduction = Object.prototype.hasOwnProperty.call(
    handCard,
    "costReduction",
  );
  const originalReduction = handCard.costReduction;
  handCard.costReduction =
    (Number(originalReduction) || 0) + reductionDelta;
  try {
    return callback();
  } finally {
    if (hadReduction) handCard.costReduction = originalReduction;
    else delete handCard.costReduction;
  }
}

// ============================================================
// 테라키온 - 원수갚기
// ============================================================
function snapshotDeaths(game) {
  const result = {};
  for (const side of ["player", "enemy"]) {
    const player = game.players?.[side];
    result[side] = {
      units: new Map((player?.field || []).map((unit) => [unit.uid, unit])),
      terrakionHandUids: new Set(
        (player?.hand || [])
          .filter((entry) => entry.cardId === "terrakion")
          .map((entry) => entry.uid),
      ),
    };
  }
  return result;
}

function armRetaliateFromSnapshot(game, snapshot) {
  if (!snapshot) return;
  for (const side of ["player", "enemy"]) {
    const before = snapshot[side];
    const player = game.players?.[side];
    if (!before || !player) continue;
    const dead = [...before.units.values()].some(
      (unit) =>
        unit.hp <= 0 &&
        !player.field.some(
          (current) => current.uid === unit.uid && current.hp > 0,
        ),
    );
    if (!dead) continue;

    let armed = false;
    for (const handCard of player.hand) {
      if (
        handCard.cardId !== "terrakion" ||
        !before.terrakionHandUids.has(handCard.uid)
      ) {
        continue;
      }
      if (!handCard._retaliatePending) armed = true;
      handCard._retaliatePending = true;
    }
    if (armed) {
      game.log.push("테라키온의 원수갚기! 다음 내 턴을 기다린다.");
    }
  }
}

function activateRetaliate(game, side) {
  const player = game.players?.[side];
  if (!player) return;
  let activated = false;
  for (const handCard of player.hand) {
    if (handCard.cardId !== "terrakion" || !handCard._retaliatePending) continue;
    delete handCard._retaliatePending;
    handCard._retaliateActiveTurnKey = turnKey(game);
    activated = true;
  }
  if (activated) {
    game.log.push("테라키온의 원수갚기! 이번 턴 비용 -3, 돌진!");
  }
}

function clearExpiredRetaliate(game, side) {
  const player = game.players?.[side];
  if (!player) return;
  for (const handCard of player.hand) {
    if (handCard._retaliateActiveTurnKey === turnKey(game)) {
      delete handCard._retaliateActiveTurnKey;
    }
  }
}

// ============================================================
// 비리디온 - 고민씨
// ============================================================
function refreshWorrySeed(game) {
  if (!game?.players) return;
  const units = [
    ...(game.players.player?.field || []),
    ...(game.players.enemy?.field || []),
  ];

  for (const unit of units) {
    if (!unit?._worrySeedSourceUid) continue;
    const source = units.find(
      (candidate) =>
        candidate.uid === unit._worrySeedSourceUid &&
        candidate.hp > 0 &&
        hasAbility(candidate, "worryseed"),
    );

    if (source) {
      if (unit.ability !== null || unit.secondaryAbility !== null) {
        unit._worrySeedStoredAbility = unit.ability;
        unit._worrySeedStoredSecondaryAbility = unit.secondaryAbility;
      }
      unit.ability = null;
      unit.secondaryAbility = null;
      continue;
    }

    unit.ability = unit._worrySeedStoredAbility ?? null;
    unit.secondaryAbility = unit._worrySeedStoredSecondaryAbility ?? null;
    delete unit._worrySeedStoredAbility;
    delete unit._worrySeedStoredSecondaryAbility;
    delete unit._worrySeedSourceUid;
  }
}

function applyWorrySeed(game, source, target) {
  if (!source || !target || target.hp <= 0) return false;
  target._worrySeedStoredAbility = target.ability;
  target._worrySeedStoredSecondaryAbility = target.secondaryAbility;
  target._worrySeedSourceUid = source.uid;
  target.ability = null;
  target.secondaryAbility = null;
  game.log.push(`${source.name}의 고민씨! ${target.name}의 특성이 봉인됐다!`);
  return true;
}

function setupVirizion(game, side, unit) {
  if (!unit || !hasAbility(unit, "worryseed")) return;
  const targetSide = other(side);
  const targets = game.players[targetSide].field.filter(
    (target) => target.hp > 0,
  );
  if (!targets.length) return;

  if (side === "player") {
    game.pendingBattlecry = {
      side,
      uid: unit.uid,
      ability: "worryseed",
      targetSide,
      targets: targets.map((target) => target.uid),
    };
    game.log.push("비리디온의 고민씨! 특성을 봉인할 상대를 선택하세요.");
    return;
  }

  const target = [...targets].sort((a, b) => {
    const costDiff =
      (CARD_MAP[b.cardId]?.cost || 0) - (CARD_MAP[a.cardId]?.cost || 0);
    if (costDiff) return costDiff;
    return core.effectiveAtk(b, game) - core.effectiveAtk(a, game);
  })[0];
  applyWorrySeed(game, unit, target);
}

// ============================================================
// 코바르온 - 퍼스트가드
// ============================================================
function quickGuardForTarget(game, attackingSide, targetUid) {
  if (!targetUid || targetUid === "hero") return null;
  const defender = game.players?.[other(attackingSide)];
  const original = defender?.field?.find(
    (unit) => unit.uid === targetUid && unit.hp > 0,
  );
  if (!original) return null;
  const key = turnKey(game);
  return (
    defender.field.find(
      (unit) =>
        unit.uid !== original.uid &&
        unit.hp > 0 &&
        hasAbility(unit, "quickguard") &&
        unit._quickGuardUsedTurnKey !== key,
    ) || null
  );
}

function withQuickGuardDamageReduction(guard, callback) {
  if (!guard) return callback();
  const originalMaxHp = guard.maxHp;
  guard.maxHp += 2;
  guard.hp += 2;
  try {
    return callback();
  } finally {
    guard.maxHp = originalMaxHp;
    guard.hp = Math.min(originalMaxHp, guard.hp);
  }
}

function markQuickGuard(game, guard) {
  if (!guard) return;
  guard._quickGuardUsedTurnKey = turnKey(game);
  game.log.push(`${guard.name}의 퍼스트가드! 아군 대신 공격을 받아냈다!`);
}

// ============================================================
// 랜드로스 - 중력
// ============================================================
function withGravityGrounding(game, side, attackType, callback) {
  if (attackType !== "땅" || !fieldHasAbility(game, side, "gravity")) {
    return callback();
  }
  const defender = game.players?.[other(side)];
  if (!defender) return callback();

  const snapshots = defender.field.map((unit) => ({
    unit,
    type: unit.type,
    ability: unit.ability,
    secondaryAbility: unit.secondaryAbility,
    item: unit.item,
  }));

  for (const snapshot of snapshots) {
    const unit = snapshot.unit;
    if (unit.type === "비행") unit.type = "노말";
    if (unit.ability === "levitate") unit.ability = null;
    if (unit.secondaryAbility === "levitate") unit.secondaryAbility = null;
    if (unit.item === "air_balloon") unit.item = null;
  }

  try {
    return callback();
  } finally {
    for (const snapshot of snapshots) {
      snapshot.unit.type = snapshot.type;
      snapshot.unit.ability = snapshot.ability;
      snapshot.unit.secondaryAbility = snapshot.secondaryAbility;
      snapshot.unit.item = snapshot.item;
    }
  }
}

// ============================================================
// 큐레무 - 얼어붙은세계
// ============================================================
function isGlaciateSealActive(game, side, handCard) {
  const sourceUid = handCard?._glaciateSealedByUid;
  if (!sourceUid) return false;
  const source = game.players?.[other(side)]?.field?.find(
    (unit) =>
      unit.uid === sourceUid &&
      unit.hp > 0 &&
      hasAbility(unit, "glaciate"),
  );
  if (source) return true;
  delete handCard._glaciateSealedByUid;
  return false;
}

function syncLegendaryUi(game) {
  if (!game) return;
  for (const side of ["player", "enemy"]) {
    for (const handCard of game.players?.[side]?.hand || []) {
      isGlaciateSealActive(game, side, handCard);
    }
  }

  const pending = game.pendingGlaciate;
  if (pending) {
    const source = game.players?.[pending.side]?.field?.find(
      (unit) =>
        unit.uid === pending.uid && unit.hp > 0 && hasAbility(unit, "glaciate"),
    );
    if (!source) game.pendingGlaciate = null;
  }

  if (typeof window === "undefined") return;
  window.__pokeUnovaLegendaryState = {
    game,
    pendingGlaciate: game.pendingGlaciate || null,
  };
  window.dispatchEvent(
    new CustomEvent("unova-legendary-state-change", {
      detail: window.__pokeUnovaLegendaryState,
    }),
  );
}

function setupKyurem(game, side, unit) {
  if (!unit || !hasAbility(unit, "glaciate")) return;
  const targetSide = other(side);
  const targets = game.players[targetSide].hand.filter(
    (handCard) => !isGlaciateSealActive(game, targetSide, handCard),
  );
  const count = Math.min(2, targets.length);
  if (!count) return;

  if (side === "player") {
    game.pendingGlaciate = {
      side,
      uid: unit.uid,
      targetSide,
      count,
      targets: targets.map((handCard) => handCard.uid),
      selected: [],
    };
    game.log.push(
      `큐레무의 얼어붙은세계! 상대 손패에서 ${count}장을 봉인하세요.`,
    );
    syncLegendaryUi(game);
    return;
  }

  const picks = [...targets]
    .sort(
      (a, b) =>
        (CARD_MAP[b.cardId]?.cost || 0) - (CARD_MAP[a.cardId]?.cost || 0),
    )
    .slice(0, count);
  for (const handCard of picks) handCard._glaciateSealedByUid = unit.uid;
  game.log.push(
    `큐레무의 얼어붙은세계! 상대 손패 ${count}장을 봉인했다!`,
  );
  syncLegendaryUi(game);
}

export function resolveGlaciate(game, side, handUid) {
  const pending = game?.pendingGlaciate;
  if (!pending || pending.side !== side) return false;
  if (pending.selected?.includes(handUid)) return false;

  const source = game.players?.[side]?.field?.find(
    (unit) =>
      unit.uid === pending.uid && unit.hp > 0 && hasAbility(unit, "glaciate"),
  );
  const handCard = game.players?.[pending.targetSide]?.hand?.find(
    (entry) => entry.uid === handUid,
  );
  if (!source || !handCard || !pending.targets.includes(handUid)) return false;

  handCard._glaciateSealedByUid = source.uid;
  pending.selected = [...(pending.selected || []), handUid];
  game.log.push(
    `큐레무의 얼어붙은세계! ${CARD_MAP[handCard.cardId]?.name || "카드"}을(를) 봉인했다!`,
  );
  if (pending.selected.length >= pending.count) game.pendingGlaciate = null;
  syncLegendaryUi(game);
  return true;
}

function findPlayedUnit(player, card, target, previousFieldUids) {
  if (!player || card?.kind !== "pokemon") return null;
  if (card.evolvesFrom && target?.uid) {
    return player.field.find((unit) => unit.uid === target.uid) || null;
  }
  return (
    player.field.find((unit) => !previousFieldUids?.has(unit.uid)) || null
  );
}

// ============================================================
// 볼트로스 - 충전
// ============================================================
function storeChargeEnergy(game, side) {
  const player = game.players?.[side];
  if (!player || !fieldHasAbility(game, side, "charge")) return;
  const stored = Math.min(
    MAX_CHARGE_ENERGY,
    Math.max(0, Number(player.mana) || 0),
  );
  player._chargeStoredEnergy = stored;
  if (stored > 0) {
    game.log.push(`볼트로스의 충전! 에너지 ${stored}을 저장했다!`);
  }
}

function releaseChargeEnergy(game, side) {
  const player = game.players?.[side];
  const stored = Math.max(0, Number(player?._chargeStoredEnergy) || 0);
  if (!player || stored <= 0) return;
  player.mana += stored;
  player._chargeStoredEnergy = 0;
  game.log.push(`볼트로스의 충전! 저장한 에너지 ${stored}을 추가로 얻었다!`);
}

// ============================================================
// 풍란 - 공중날기
// engine.js의 직접 HP 차감 경로를 우회하고 여기서 탈 판정과 피격 연출을 처리한다.
// ============================================================
function calcSkylaFlyingDamage(baseDamage, target) {
  if (baseDamage <= 0 || !target) return 0;
  const mult = TYPE_CHART["비행"]?.[target.type] ?? 1;
  if (mult === 0) return 0;
  if (mult > 1) return Math.ceil(baseDamage * mult);
  if (mult < 1) return Math.max(1, Math.floor(baseDamage * mult));
  return baseDamage;
}

function syncSkylaState(game) {
  if (typeof window === "undefined" || !game) return;
  const previous = window.__pokeUnovaGymState || {};
  const units = [
    ...(game.players?.player?.field || []),
    ...(game.players?.enemy?.field || []),
  ];
  window.__pokeUnovaGymState = {
    ...previous,
    trainerId: game.trainer?.id || previous.trainerId || null,
    gimmick: SKYLA_GIMMICK,
    turn: game.turn,
    airborneUids: units
      .filter((unit) => unit._skylaAirborne)
      .map((unit) => unit.uid),
  };
  window.dispatchEvent(
    new CustomEvent("unova-gym-state-change", {
      detail: window.__pokeUnovaGymState,
    }),
  );
}

function launchSkyla(game) {
  const enemy = game.players.enemy;
  const alive = enemy.field.filter(
    (unit) => unit.hp > 0 && !unit._skylaAirborne,
  );
  if (!alive.length) return;
  let pool = alive.filter(
    (unit) => unit.uid !== enemy._skylaLastAirborneUid,
  );
  if (!pool.length) pool = alive;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  chosen._skylaAirborne = true;
  enemy._skylaLastAirborneUid = chosen.uid;
  game.log.push(
    `${chosen.name}이(가) 공중날기를 사용했다! 다음 플레이어 턴에는 전투 공격으로 지정할 수 없다!`,
  );
}

function resolveSkylaLandingDamage(game, target, damage) {
  if (damage <= 0) return 0;
  if (hasAbility(target, "disguise") && !target.sturdyUsed) {
    target.sturdyUsed = true;
    target.hp = Math.max(0, target.hp - 1);
    game.log.push(
      `${target.name}의 탈! 공중날기 피해를 막고 피해를 1만 받았다!`,
    );
    return 1;
  }
  target.hp = Math.max(0, target.hp - damage);
  return damage;
}

function triggerEjectButtonAfterSkyla(game, target) {
  if (!target || target.hp <= 0 || target.item !== "eject_button") return;
  const player = game.players[target.side];
  if (!player || player.hand.length >= core.MAX_HAND) return;
  const index = player.field.findIndex((unit) => unit.uid === target.uid);
  if (index < 0) return;
  target.item = null;
  player.field.splice(index, 1);
  player.hand.push({
    uid: target.uid,
    cardId: target.cardId,
    shiny: !!target.shiny,
  });
  game.log.push(
    `${target.name}의 탈출버튼! 공중날기 피해 후 손으로 돌아갔다!`,
  );
}

function landSkyla(game) {
  const airborne = game.players.enemy.field.filter(
    (unit) => unit.hp > 0 && unit._skylaAirborne,
  );
  if (!airborne.length) return;

  const impacts = [];
  let actionSource = null;
  for (const unit of airborne) {
    unit._skylaAirborne = false;
    const targets = game.players.player.field.filter(
      (target) => target.hp > 0,
    );
    if (!targets.length) continue;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const amount = hasAbility(unit, "skyla_divebomb") ? 4 : 2;
    const rawDamage = calcSkylaFlyingDamage(amount, target);
    const dealt = resolveSkylaLandingDamage(game, target, rawDamage);

    actionSource = unit;
    impacts.push({
      type: "damage",
      side: "player",
      targetUid: target.uid,
      amount: dealt,
    });
    game.log.push(
      `${unit.name}의 공중날기! ${target.name}에게 비행 피해 ${dealt}!`,
    );
    triggerEjectButtonAfterSkyla(game, target);
  }

  if (impacts.length && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("skyla-airborne-impact", { detail: { impacts } }),
    );
  }

  core.cleanupDeaths(game);

  if (actionSource && impacts.length) {
    game.animSeq = (game.animSeq || 0) + 1;
    game.lastAction = {
      seq: game.animSeq,
      kind: "ability",
      side: "enemy",
      cardId: actionSource.cardId,
      uid: actionSource.uid,
      targetUid: impacts[0].targetUid,
      impacts,
    };
  }
}

function runSkylaEndTurn(game) {
  const endingSide = game.turn;
  const originalGimmick = game.trainer.gimmick;
  game.trainer.gimmick = SKYLA_BYPASS_GIMMICK;
  let result;
  try {
    result = core.endTurn(game);
  } finally {
    game.trainer.gimmick = originalGimmICK;
  }
  if (endingSide === "enemy") launchSkyla(game);
  if (game.turn === "enemy") landSkyla(game);
  syncSkylaState(game);
  return result;
}

export function effectiveCost(card, game, side, handCard = null) {
  return adjustedCost(card, game, side, handCard);
}

export function canPlayCard(game, side, handIdx) {
  refreshWorrySeed(game);
  const { player, handCard, card } = handCardInfo(game, side, handIdx);
  if (!player || !handCard || !card) return false;
  if (isGlaciateSealActive(game, side, handCard)) return false;

  const normal = withAdjustedCost(card, game, side, handCard, () =>
    core.canPlayCard(game, side, handIdx),
  );
  if (normal) return true;

  if (player.field.length > 0 || !canHealTrainer(card)) return false;
  return withAdjustedCost(card, game, side, handCard, () =>
    withTrainerTargetAllowed(card, () =>
      core.canPlayCard(game, side, handIdx),
    ),
  );
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  refreshWorrySeed(game);
  const deathSnapshot = snapshotDeaths(game);
  const { player, handCard, card } = handCardInfo(game, side, handIdx);
  if (!player || !handCard || !card) return false;
  if (isGlaciateSealActive(game, side, handCard)) return false;

  const logStart = game.log.length;
  const previousFieldUids = new Set(player.field.map((unit) => unit.uid));
  const dittoFieldUids =
    card.id === DITTO_ID
      ? new Set(player.field.map((unit) => unit.uid))
      : null;
  const trainerHealWithoutUnits =
    player.field.length === 0 &&
    target?.uid === "hero" &&
    canHealTrainer(card);

  const isSingleTargetTechnique =
    card.kind === "spell" &&
    card.type === "기술" &&
    target?.uid &&
    target.uid !== "hero" &&
    core.spellNeedsTarget(card) === "enemy";
  const quickGuard = isSingleTargetTechnique
    ? quickGuardForTarget(game, side, target.uid)
    : null;
  const resolvedTarget = quickGuard
    ? { ...target, uid: quickGuard.uid }
    : target;

  const tailwindWasEligible = isTailwindEligible(game, side, card);
  const retaliateWasActive = isRetaliateActive(game, side, handCard);

  const performPlay = () =>
    withAdjustedCost(card, game, side, handCard, () =>
      withGravityGrounding(game, side, card.moveType, () =>
        withFireBlastHero(card, resolvedTarget, () =>
          trainerHealWithoutUnits
            ? withTrainerTargetAllowed(card, () =>
                core.playCard(
                  game,
                  side,
                  handIdx,
                  resolvedTarget,
                  fieldIndex,
                ),
              )
            : core.playCard(
                game,
                side,
                handIdx,
                resolvedTarget,
                fieldIndex,
              ),
        ),
      ),
    );

  const result = withQuickGuardDamageReduction(quickGuard, performPlay);
  if (!result) {
    refreshWorrySeed(game);
    syncLegendaryUi(game);
    return result;
  }

  if (quickGuard) markQuickGuard(game, quickGuard);
  normalizeStevenMegaMetagross(game, side, card, resolvedTarget, logStart);
  normalizeDitto(game, side, dittoFieldUids);

  const playedUnit = findPlayedUnit(
    player,
    card,
    target,
    previousFieldUids,
  );
  if (playedUnit) {
    if (tailwindWasEligible) {
      player._tailwindUsedTurnKey = turnKey(game);
      playedUnit.canAttack = true;
      game.log.push(
        `토네로스의 순풍! ${playedUnit.name}이(가) 즉시 공격할 수 있다!`,
      );
    }
    if (card.id === "terrakion" && retaliateWasActive) {
      playedUnit.canAttack = true;
      game.log.push(`${playedUnit.name}의 원수갚기! 즉시 공격할 수 있다!`);
    }
    if (card.id === "virizion") setupVirizion(game, side, playedUnit);
    if (card.id === "kyurem") setupKyurem(game, side, playedUnit);
  }

  armRetaliateFromSnapshot(game, deathSnapshot);
  refreshWorrySeed(game);
  syncLegendaryUi(game);
  return result;
}

export function attack(game, side, attackerUid, target) {
  refreshWorrySeed(game);
  const deathSnapshot = snapshotDeaths(game);
  const attacker = game.players?.[side]?.field?.find(
    (unit) => unit.uid === attackerUid,
  );
  if (!attacker) return false;

  const quickGuard = quickGuardForTarget(game, side, target?.uid);
  const resolvedTarget = quickGuard
    ? { ...target, uid: quickGuard.uid }
    : target;

  const result = withQuickGuardDamageReduction(quickGuard, () =>
    withGravityGrounding(game, side, attacker.type, () =>
      core.attack(game, side, attackerUid, resolvedTarget),
    ),
  );

  if (result && quickGuard) markQuickGuard(game, quickGuard);
  armRetaliateFromSnapshot(game, deathSnapshot);
  refreshWorrySeed(game);
  syncLegendaryUi(game);
  return result;
}

export function resolveMoldbreaker(game, side, targetUid) {
  const pending = game?.pendingBattlecry;
  if (
    pending?.side === side &&
    pending.ability === "worryseed" &&
    pending.targets?.includes(targetUid)
  ) {
    const source = game.players?.[side]?.field?.find(
      (unit) =>
        unit.uid === pending.uid &&
        unit.hp > 0 &&
        hasAbility(unit, "worryseed"),
    );
    const target = game.players?.[pending.targetSide || other(side)]?.field?.find(
      (unit) => unit.uid === targetUid && unit.hp > 0,
    );
    if (!source || !target) return false;
    const result = applyWorrySeed(game, source, target);
    if (result) game.pendingBattlecry = null;
    refreshWorrySeed(game);
    syncLegendaryUi(game);
    return result;
  }

  const snapshot = snapshotDeaths(game);
  const result = core.resolveMoldbreaker(game, side, targetUid);
  armRetaliateFromSnapshot(game, snapshot);
  refreshWorrySeed(game);
  syncLegendaryUi(game);
  return result;
}

function wrapResolverWithLegendaryState(resolver) {
  return (game, ...args) => {
    const snapshot = snapshotDeaths(game);
    const result = resolver(game, ...args);
    armRetaliateFromSnapshot(game, snapshot);
    refreshWorrySeed(game);
    syncLegendaryUi(game);
    return result;
  };
}

export const resolveMew = wrapResolverWithLegendaryState(core.resolveMew);
export const resolveSpacialRend = wrapResolverWithLegendaryState(
  core.resolveSpacialRend,
);
export const resolveMagmaStorm = wrapResolverWithLegendaryState(
  core.resolveMagmaStorm,
);
export const resolvePhioneBraveCharge = wrapResolverWithLegendaryState(
  core.resolvePhioneBraveCharge,
);
export const resolveManaphyBraveCharge = wrapResolverWithLegendaryState(
  core.resolveManaphyBraveCharge,
);
export const resolveWishmaker = wrapResolverWithLegendaryState(
  core.resolveWishmaker,
);
export const resolveUxie = wrapResolverWithLegendaryState(core.resolveUxie);
export const resolveDeoxysForm = wrapResolverWithLegendaryState(
  core.resolveDeoxysForm,
);
export const resolveShayminForm = wrapResolverWithLegendaryState(
  core.resolveShayminForm,
);

export function cleanupDeaths(game, deferRemoval = false) {
  const snapshot = snapshotDeaths(game);
  const result = core.cleanupDeaths(game, deferRemoval);
  armRetaliateFromSnapshot(game, snapshot);
  refreshWorrySeed(game);
  syncLegendaryUi(game);
  return result;
}

function cynthiaMiloticAtEnemyTurnEnd(game) {
  if (
    game?.trainer?.gimmick !== CYNTHIA_GIMMICK ||
    game.turn !== "enemy" ||
    game.winner
  ) {
    return null;
  }
  return (
    game.players.enemy.field.find(
      (unit) => unit.cardId === CYNTHIA_MILOTIC_ID && unit.hp > 0,
    ) || null
  );
}

export function endTurn(game) {
  const endingSide = game.turn;
  const deathSnapshot = snapshotDeaths(game);
  clearExpiredRetaliate(game, endingSide);
  storeChargeEnergy(game, endingSide);

  if (game?.trainer?.gimmick === SKYLA_GIMMICK) {
    const result = runSkylaEndTurn(game);
    armRetaliateFromSnapshot(game, deathSnapshot);
    activateRetaliate(game, game.turn);
    releaseChargeEnergy(game, game.turn);
    refreshWorrySeed(game);
    syncLegendaryUi(game);
    return result;
  }

  const milotic = cynthiaMiloticAtEnemyTurnEnd(game);
  const originalMaxHp = milotic?.maxHp ?? null;
  const missingHp = milotic
    ? Math.max(0, milotic.maxHp - milotic.hp)
    : 0;
  if (milotic && missingHp >= 2) {
    milotic.maxHp = milotic.hp + 1;
  }

  let result;
  try {
    result = core.endTurn(game);
  } finally {
    if (milotic && originalMaxHp != null) milotic.maxHp = originalMaxHp;
  }

  armRetaliateFromSnapshot(game, deathSnapshot);
  activateRetaliate(game, game.turn);
  releaseChargeEnergy(game, game.turn);
  refreshWorrySeed(game);
  syncLegendaryUi(game);
  return result;
}
