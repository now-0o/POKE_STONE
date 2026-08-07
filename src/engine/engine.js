// ============================================================
// 포스스톤 배틀 엔진
// 상태를 직접 변형(mutate)하고, UI는 얕은 복사로 리렌더링
// ============================================================

import { CARD_MAP, TYPE_CHART, SAND_IMMUNE_TYPES } from "../data/cards.js";

const PINCH_ABILITIES = ["torrent", "blaze", "overgrow", "guts"];
const AURA_TYPES = {
  aura_grass: "풀",
  aura_electric: "전기",
  aura_fighting: "격투",
  aura_dragon: "드래곤",

  erika_flowerdance: "풀",
};
const SLEEP_BATTLECRIES = ["sleeppowder", "hypnosis", "sing", "lovelykiss"];

let uidCounter = 1;
const nextUid = () => `u${uidCounter++}`;

export const MAX_FIELD = 6;
export const MAX_HAND = 10;
export const MAX_MANA = 10;

export const WEATHER_NAME = { rain: "비", sun: "쾌청", sand: "모래바람" };

// ---------- 유틸 ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function log(game, msg) {
  game.log.push(msg);
  if (game.log.length > 60) game.log.shift();
}

export function other(side) {
  return side === "player" ? "enemy" : "player";
}

function putStartingCard(player, cardId) {
  if (!cardId) return false;

  const idx = player.deck.lastIndexOf(cardId);
  if (idx === -1) return false;

  player.deck.splice(idx, 1);
  player.hand.push({
    uid: nextUid(),
    cardId,
  });

  return true;
}

// ---------- 게임 생성 ----------
export function createGame(playerDeckIds, trainer) {
  const first = Math.random() < 0.5 ? "player" : "enemy"; // 코인토스로 선공 결정
  const second = first === "player" ? "enemy" : "player";
  const game = {
    turn: first,
    firstSide: first, // 인트로 화면 표시용
    turnCount: 1,
    weather: null,
    log: [],
    winner: null,
    pendingBattlecry: null,
    trainer,
    players: {
      player: makePlayer(playerDeckIds, "나"),
      enemy: makePlayer(trainer.deck, trainer.name, trainer.hp),
    },
  };
  // 선공 3장 / 후공 4장 드로우 (후공 보상)
  const openingDraws = {
    [first]: 3,
    [second]: 4,
  };

  if (
    trainer.startingCard &&
    putStartingCard(game.players.enemy, trainer.startingCard)
  ) {
    openingDraws.enemy = Math.max(0, openingDraws.enemy - 1);
  }

  for (let i = 0; i < openingDraws[first]; i++) {
    drawCard(game, first, true);
  }

  for (let i = 0; i < openingDraws[second]; i++) {
    drawCard(game, second, true);
  }
  startTurn(game, first);
  log(
    game,
    `${trainer.name}와(과)의 배틀 시작! (${first === "player" ? "내가" : trainer.name + "가"} 선공)`,
  );
  return game;
}

function makePlayer(deckIds, name, hp = 40) {
  return {
    name,
    hp,
    maxHp: hp,
    mana: 0,
    maxMana: 0,
    deck: shuffle(deckIds),
    hand: [],
    field: [],
    fatigue: 0,
    megaUsed: false,
    discardUsedThisTurn: false,
  };
}

// ---------- 드로우 ----------
export function drawCard(game, side, silent = false) {
  const p = game.players[side];
  if (p.deck.length === 0) {
    p.fatigue += 1;
    p.hp -= p.fatigue;
    log(game, `${p.name}의 덱이 비었다! 탈진 피해 ${p.fatigue}!`);
    checkWinner(game);
    return null;
  }
  const cardId = p.deck.pop();
  if (p.hand.length >= MAX_HAND) {
    log(
      game,
      `${p.name}의 손패가 가득 차 ${CARD_MAP[cardId].name}이(가) 불타버렸다!`,
    );
    return null;
  }
  p.hand.push({ uid: nextUid(), cardId });
  if (!silent) log(game, `${p.name}이(가) 카드를 뽑았다.`);
  return cardId;
}

// ---------- 턴 진행 ----------
// ── 상태이상 헬퍼 ──────────────────────────────────────────
// 포켓몬에게 상태이상 부여 (쾌청 중 얼음 불가 등 규칙 포함)
export function applyStatus(game, unit, statusType) {
  if (unit.status) return; // 이미 상태이상 있으면 중첩 불가
  if (statusType === "ice" && game.weather === "sun") return; // 쾌청 중 얼음 불가
  // 타입 면역
  if (statusType === "burn" && unit.type === "불꽃") return;
  if (statusType === "para" && unit.type === "전기") return;
  if (statusType === "poison" && (unit.type === "독" || unit.type === "강철"))
    return;
  if (statusType === "ice" && unit.type === "얼음") return;
  unit.status = statusType;
  unit.statusTurns = 0;
}

// 턴 시작 시 상태이상 판정
function resolveStatusAtTurnStart(game, side, u) {
  if (!u.status) return;

  if (u.status === "ice") {
    // 매턴 40% 확률로 풀림
    if (Math.random() < 0.4) {
      u.status = null;
      u.statusTurns = 0;
      log(game, `${u.name}의 얼음이 녹았다!`);
    }
    // 얼음 상태: canAttack은 canAttack() 함수에서 막음
    return;
  }

  if (u.status === "sleep") {
    u.statusTurns += 1;
    // 첫 턴(0→1): 행동불능은 canAttack에서 처리
    // 2턴째: 33%, 3턴째: 50%, 4턴째: 66%, 5턴째~: 100%
    const wakeChance = [0, 0.33, 0.5, 0.66, 1.0][Math.min(u.statusTurns, 4)];
    if (wakeChance > 0 && Math.random() < wakeChance) {
      u.status = null;
      u.statusTurns = 0;
      log(game, `${u.name}은(는) 잠에서 깨어났다!`);
    } else if (u.statusTurns >= 1) {
      // 1턴 이후는 깨지 못하면 그 턴도 행동불능
      u.canAttack = false;
      log(game, `${u.name}은(는) 잠들어 있다...`);
    }
    return;
  }

  if (u.status === "para") {
    // 30% 확률로 그 턴 공격 불가
    if (Math.random() < 0.3) {
      u.canAttack = false;
      log(game, `${u.name}은(는) 마비로 움직이지 못했다!`);
    }
    return;
  }
}
// ─────────────────────────────────────────────────────────

function startTurn(game, side) {
  const p = game.players[side];
  p.maxMana = Math.min(MAX_MANA, p.maxMana + 1);
  p.mana = p.maxMana;
  p.discardUsedThisTurn = false;
  p.field.forEach((u) => {
    u.extraUsed = false;
    if (u.resting) {
      u.canAttack = false;
      u.resting = false;
      log(game, `${u.name}은(는) 게으름을 피우고 있다...`);
      if (u.frozen > 0) u.frozen -= 1;
      resolveStatusAtTurnStart(game, side, u);
      return;
    }
    u.canAttack = true;
    if (u.frozen > 0) u.frozen -= 1;
    resolveStatusAtTurnStart(game, side, u);
  });
  // 이번 게임의 "선공자"가 첫 턴(turnCount 1)에만 드로우 스킵 (이미 오프닝 핸드를 받았으므로)
  if (!(side === game.firstSide && game.turnCount === 1)) drawCard(game, side);
}

export function endTurn(game) {
  const side = game.turn;
  const p = game.players[side];

  // 럭키 치유의마음: 턴 종료 시 아군 전체 1 회복
  p.field.forEach((u) => {
    if (u.ability === "regenerator" && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + 2);
      log(game, `${u.name}의 재생력! 체력을 회복했다.`);
    }
    if (u.ability === "healer") {
      const idx = p.field.indexOf(u);
      const neighbors = [p.field[idx - 1], p.field[idx + 1]].filter(
        (f) => f && f.hp < f.maxHp,
      );
      neighbors.forEach((f) => {
        f.hp = Math.min(f.maxHp, f.hp + 1);
      });
      if (neighbors.length)
        log(game, `${u.name}의 치유의마음! 양옆 포켓몬이 회복했다.`);
    }
    // 생명의 구슬: 턴 종료 시 반동 피해 1
    if (u.item === "lifeorb") {
      u.hp -= 1;
      log(game, `${u.name}의 생명의구슬 반동! 체력이 1 줄었다.`);
    }
    // 화상: 턴 종료 시 1 피해
    if (u.status === "burn") {
      u.hp -= 1;
      log(game, `${u.name}은(는) 화상으로 체력이 1 줄었다!`);
    }
    // 독: 턴 종료 시 누적 피해 (1→2→3→...)
    if (u.status === "poison") {
      u.statusTurns += 1;
      const dmg = u.statusTurns;
      u.hp -= dmg;
      log(game, `${u.name}은(는) 독으로 체력이 ${dmg} 줄었다!`);
    }

    if (
      u.ability === "misty_miraclestar" &&
      game.weather === "rain" &&
      u.hp < u.maxHp
    ) {
      u.hp = Math.min(u.maxHp, u.hp + 1);

      log(game, `${u.name}의 물의파동! 체력을 1 회복했다.`);
    }
  });

  cleanupDeaths(game);

  // 모래바람: 턴 종료 시 땅 타입이 아닌 모든 포켓몬 피해 1 (부유 포함 피해)
  if (game.weather === "sand") {
    ["player", "enemy"].forEach((s) => {
      game.players[s].field.forEach((u) => {
        if (!SAND_IMMUNE_TYPES.includes(u.type))
          applyDamage(game, u, 1, null, true);
      });
    });
    log(game, "모래바람이 몰아친다!");
    cleanupDeaths(game);
  }

  if (game.winner) return;

  const next = other(side);
  game.turn = next;
  if (next === "player") game.turnCount += 1;
  startTurn(game, next);
  log(game, `── ${game.players[next].name}의 턴 ──`);
  checkWinner(game);
}

// ---------- 계산 ----------
export function effectiveCost(card, game) {
  let cost = card.cost;
  if (game.weather === "sun") {
    if (card.ability === "chlorophyll") cost -= 1;
    if (card.id === "solarbeam") cost -= 2;
  }
  return Math.max(0, cost);
}

export function effectiveAtk(unit, game) {
  let atk = unit.atk;
  if (
    PINCH_ABILITIES.includes(unit.ability) &&
    unit.hp <= Math.ceil(unit.maxHp / 2)
  )
    atk += 2;
  if (unit.status === "burn") atk = Math.max(0, Math.floor(atk / 2)); // 화상: 공격력 절반
  if (game.weather === "rain" && unit.type === "물") atk += 1;
  if (game.weather === "sun" && unit.type === "불꽃") atk += 1;
  if (game.weather === "sun" && unit.ability === "solarpower") atk += 2;
  if (game.weather === "rain" && unit.ability === "misty_miraclestar") {
    atk += 2;
  }
  if (unit.ability === "fortress") return unit.hp;
  const owner = game.players[unit.side];
  if (owner) {
    owner.field.forEach((u) => {
      if (u.uid !== unit.uid && AURA_TYPES[u.ability] === unit.type) atk += 1;
    });
  }
  return Math.max(0, atk);
}

export function typeMult(attackType, defendType) {
  const row = TYPE_CHART[attackType];
  if (!row) return 1;
  const m = row[defendType];
  return m === undefined ? 1 : m;
}

export function calcTypedDamage(base, attackType, defendType) {
  const m = typeMult(attackType, defendType);
  if (m === 0) return 0;
  if (m > 1) return Math.ceil(base * m);
  if (m < 1) return Math.max(0, Math.floor(base * m));
  return base;
}

export function spellDamageAmount(card, game) {
  let amount = card.spell.amount;
  const mt = card.moveType;
  if (game.weather === "rain") {
    if (mt === "물") amount += 1;
    if (mt === "불꽃") amount -= 1;
  }
  if (game.weather === "sun") {
    if (mt === "불꽃") amount += 1;
    if (mt === "물") amount -= 1;
  }
  return Math.max(0, amount);
}

// ============================================================
// 전투 연출용 Impact 수집
// ============================================================

function beginImpactCapture(game) {
  game._impactBuffer = [];
  game._collectImpacts = true;
}

function recordImpact(game, impact) {
  if (!game._collectImpacts) return;

  if (!game._impactBuffer) {
    game._impactBuffer = [];
  }

  game._impactBuffer.push(impact);
}

function takeImpacts(game) {
  const impacts = game._impactBuffer || [];

  game._impactBuffer = [];
  game._collectImpacts = false;

  return impacts;
}

// ---------- 피해 처리 ----------
function applyDamage(
  game,
  unit,
  amount,
  sourceType = null,
  typedIgnore = false,
) {
  const hpBefore = unit.hp;

  function finishImpact(result) {
    const diff = unit.hp - hpBefore;

    if (diff < 0) {
      recordImpact(game, {
        type: "damage",
        side: unit.side,
        targetUid: unit.uid,
        amount: Math.abs(diff),
      });
    } else if (diff > 0) {
      recordImpact(game, {
        type: "heal",
        side: unit.side,
        targetUid: unit.uid,
        amount: diff,
      });
    }

    return result;
  }

  let dmg = amount;

  // 웅의 롱스톤 - 스톤에지
  if (unit.ability === "brock_rockwall") {
    const before = dmg;

    dmg = Math.max(0, dmg - 2);

    if (dmg < before) {
      log(game, `${unit.name}의 스톤에지! 받는 피해가 2 줄었다!`);
    }
  }

  if (amount <= 0) {
    return finishImpact(0);
  }

  // 부유
  if (!typedIgnore && sourceType === "땅" && unit.ability === "levitate") {
    log(game, `${unit.name}은(는) 부유로 피해를 받지 않았다!`);

    return finishImpact(0);
  }

  // 타오르는불꽃
  if (!typedIgnore && sourceType === "불꽃" && unit.ability === "flashfire") {
    log(game, `${unit.name}의 타오르는불꽃! 불꽃 피해를 받지 않는다!`);

    return finishImpact(0);
  }

  // 축전
  if (!typedIgnore && sourceType === "전기" && unit.ability === "voltabsorb") {
    const heal = Math.min(2, unit.maxHp - unit.hp);

    unit.hp += heal;

    log(game, `${unit.name}의 축전! 전기를 흡수해 체력을 회복했다!`);

    return finishImpact(0);
  }

  // 저수
  if (!typedIgnore && sourceType === "물" && unit.ability === "waterabsorb") {
    const heal = Math.min(2, unit.maxHp - unit.hp);

    unit.hp += heal;

    log(game, `${unit.name}의 저수! 물을 흡수해 체력을 회복했다!`);

    return finishImpact(0);
  }

  // 두꺼운지방
  if (
    !typedIgnore &&
    (sourceType === "불꽃" || sourceType === "얼음") &&
    unit.ability === "thickfat"
  ) {
    dmg = Math.max(0, dmg - 1);

    if (dmg < amount) {
      log(game, `${unit.name}의 두꺼운지방으로 피해가 줄었다!`);
    }
  }

  // 모래숨기
  if (!typedIgnore && game.weather === "sand" && unit.ability === "sandveil") {
    dmg = Math.max(0, dmg - 1);

    if (dmg < amount) {
      log(game, `${unit.name}이(가) 모래숨기로 공격을 흘렸다!`);
    }
  }

  // 멀티스케일
  if (
    (unit.ability === "multiscale" || unit.ability === "aeroblast") &&
    unit.hp === unit.maxHp &&
    dmg > 1
  ) {
    dmg = Math.ceil(dmg / 2);

    log(game, `${unit.name}의 멀티스케일! 피해가 절반이 됐다!`);
  }

  if (dmg <= 0) {
    return finishImpact(0);
  }

  // 따라큐 탈
  if (unit.ability === "disguise" && !unit.sturdyUsed) {
    unit.hp -= 1;
    unit.sturdyUsed = true;

    log(game, `${unit.name}의 탈! 공격을 막고 피해를 1만 받았다!`);

    return finishImpact(1);
  }

  // 옹골참
  if (
    unit.ability === "sturdy" &&
    unit.maxHp > 1 &&
    unit.hp === unit.maxHp &&
    dmg >= unit.hp
  ) {
    unit.hp = 1;

    log(game, `${unit.name}의 옹골참! 체력 1을 남기고 버텼다!`);

    return finishImpact(dmg);
  }

  // 기합의띠
  if (
    unit.item === "focussash" &&
    !unit.focusSashUsed &&
    unit.hp === unit.maxHp &&
    dmg >= unit.hp
  ) {
    unit.hp = 1;
    unit.focusSashUsed = true;

    log(game, `${unit.name}은(는) 기합의띠로 체력 1을 남기고 버텼다!`);

    return finishImpact(dmg);
  }

  unit.hp -= dmg;

  // 불꽃 피해를 받으면 얼음 해제
  if (sourceType === "불꽃" && unit.status === "ice") {
    unit.status = null;
    unit.statusTurns = 0;
  }

  return finishImpact(dmg);
}

export function cleanupDeaths(game) {
  // 대폭발 연쇄를 위해 시체가 없어질 때까지 반복 (최대 20회 안전장치)
  for (let pass = 0; pass < 20; pass++) {
    let anyDead = false;
    ["player", "enemy"].forEach((side) => {
      const p = game.players[side];
      const dead = p.field.filter((u) => u.hp <= 0);
      if (dead.length === 0) return;
      anyDead = true;
      p.field = p.field.filter((u) => u.hp > 0);
      dead.forEach((u) => {
        log(game, `${u.name}이(가) 기절했다!`);
        // 죽음의 메아리
        if (u.ability === "deathdraw") {
          drawCard(game, side);
          log(game, `${u.name}의 예지몽! 카드를 1장 뽑았다.`);
        }
        if (u.ability === "explode") {
          const foes = game.players[other(side)].field.filter((f) => f.hp > 0);
          if (foes.length > 0) {
            const t = foes[Math.floor(Math.random() * foes.length)];
            applyDamage(game, t, 2, "전기");
            log(game, `${u.name}의 대폭발! ${t.name}에게 피해 2!`);
          }
        }
      });
    });
    if (!anyDead) break;
  }
  checkWinner(game);
}

function checkWinner(game) {
  if (game.winner) return;
  const pDead = game.players.player.hp <= 0;
  const eDead = game.players.enemy.hp <= 0;
  if (pDead && eDead) game.winner = "enemy";
  else if (eDead) game.winner = "player";
  else if (pDead) game.winner = "enemy";
}

// ---------- 유닛 생성/전투의 함성 ----------
function makeUnit(card, game, side) {
  return {
    uid: nextUid(),
    cardId: card.id,
    name: card.name,
    type: card.type,
    atk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    rarity: card.rarity,
    emoji: card.emoji,
    ability: card.ability || null,
    stage: card.stage || 0,
    canAttack: false,
    summonedTurn: game.turnCount,
    frozen: 0, // DEPRECATED (하위호환 잔류, 신규 코드에서는 status 사용)
    status: null, // null | 'ice' | 'sleep' | 'para'
    statusTurns: 0, // ice: 남은 얼림 최소턴 / sleep: 잠든 총 턴 수 누적 / para: 미사용
    sturdyUsed: false, // 따라큐 탈 발동 여부
    focusSashUsed: false, // 기합의띠 발동 여부
    mega: false,
    item: null,
    noEvolve: false,
    side,
  };
}

function runBattlecry(game, side, unit) {
  const foe = game.players[other(side)];
  const me = game.players[side];
  switch (unit.ability) {
    case "moldbreaker": {
      const targets = foe.field.filter(
        (u) => (u.ability === "taunt" || u.ability === "fortress") && u.hp > 0,
      );
      if (targets.length) {
        game.pendingBattlecry = {
          side,
          uid: unit.uid,
          targets: targets.map((t) => t.uid),
        };
        log(game, `${unit.name}의 틀깨기! 상대 도발 포켓몬을 선택하세요.`);
      }
      break;
    }
    case "foresight":
      drawCard(game, side);
      drawCard(game, side);
      log(game, `${unit.name}의 예지! 카드를 2장 뽑았다.`);
      break;
    case "download":
      unit.atk += 1;
      unit.hp += 1;
      unit.maxHp += 1;
      log(game, `${unit.name}의 다운로드! +1/+1을 얻었다.`);
      break;
    case "airlock":
      if (game.weather) {
        game.weather = null;
        log(game, `${unit.name}의 에어록! 날씨가 사라졌다!`);
      }
      break;
    case "purify":
      me.field.forEach((u) => {
        u.hp = Math.min(u.maxHp, u.hp + 2);
        u.frozen = 0;
        u.status = null;
        u.statusTurns = 0;
      });
      log(game, `${unit.name}의 정화! 아군이 회복하고 상태이상이 풀렸다.`);
      break;
    case "sacredflame":
      me.field.forEach((u) => (u.hp = Math.min(u.maxHp, u.hp + 3)));
      log(game, `${unit.name}의 성스러운불꽃! 아군 전체가 크게 회복했다.`);
      break;
    case "muddywater":
      foe.field.forEach((u) => applyDamage(game, u, 1, "물"));
      log(game, `${unit.name}의 탁류! 적 전체에게 물 피해 1!`);
      cleanupDeaths(game);
      break;
    case "eruption":
      foe.field.forEach((u) => applyDamage(game, u, 2, "불꽃"));
      log(game, `${unit.name}의 분화! 적 전체에게 불꽃 피해 2!`);
      cleanupDeaths(game);
      break;
    case "earthpower": {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        applyDamage(game, t, 3, "땅");
        log(game, `${unit.name}의 대지의힘! ${t.name}에게 땅 피해 3!`);
        cleanupDeaths(game);
      }
      break;
    }
    case "primordialsea":
      game.weather = "rain";
      foe.field.forEach((u) => applyDamage(game, u, 2, "물"));
      log(
        game,
        `${unit.name}의 근원의바다! 폭우와 함께 적 전체에게 물 피해 2!`,
      );
      cleanupDeaths(game);
      break;
    case "desolateland":
      game.weather = "sun";
      foe.field.forEach((u) => applyDamage(game, u, 2, "땅"));
      log(
        game,
        `${unit.name}의 끝의대지! 대지가 갈라지며 적 전체에게 땅 피해 2!`,
      );
      cleanupDeaths(game);
      break;
    case "blizzard": {
      foe.field.forEach((u) => applyDamage(game, u, 1, "얼음"));
      const alive = foe.field.filter((u) => u.hp > 0);
      if (alive.length) {
        const t = alive[Math.floor(Math.random() * alive.length)];
        applyStatus(game, t, "ice");
        log(
          game,
          `${unit.name}의 눈보라! 적 전체 얼음 피해 1, ${t.name}이(가) 얼어붙었다!`,
        );
      }
      cleanupDeaths(game);
      break;
    }
    case "ancestor": {
      const idx = me.deck.findIndex((c) => c.kind === "pokemon");
      if (idx !== -1 && me.hand.length < 10) {
        const picks = me.deck.filter((c) => c.kind === "pokemon");
        const pick = picks[Math.floor(Math.random() * picks.length)];
        me.deck.splice(me.deck.indexOf(pick), 1);
        me.hand.push(pick);
        log(
          game,
          `${unit.name}의 만물의시조! ${pick.name}을(를) 손으로 가져왔다.`,
        );
      }
      break;
    }
    case "supremeoverlord": {
      const others = me.field.filter((u) => u.uid !== unit.uid && u.hp > 0);
      const n = others.length;
      others.forEach((u) => (u.hp = 0));
      if (n > 0) {
        unit.atk += n;
        unit.hp += n;
        unit.maxHp += n;
        log(
          game,
          `${unit.name}의 총대장! 아군 ${n}마리를 희생하고 +${n}/+${n}을 얻었다!`,
        );
        cleanupDeaths(game);
      }
      break;
    }
    case "transform": {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        unit.atk = t.atk;
        unit.hp = t.hp;
        unit.maxHp = t.maxHp;
        unit.type = t.type;
        log(game, `${unit.name}이(가) ${t.name}(으)로 변신했다!`);
      }
      break;
    }
    case "intimidate": {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.atk = Math.max(0, t.atk - 2);
        log(game, `${unit.name}의 위협! ${t.name}의 공격력이 2 떨어졌다!`);
      }
      break;
    }
    case "drizzle":
      game.weather = "rain";
      log(game, `${unit.name}의 잔비! 비가 내리기 시작했다!`);
      break;
    case "drought":
      game.weather = "sun";
      log(game, `${unit.name}의 가뭄! 햇살이 강해졌다!`);
      break;
    case "sandstream":
      game.weather = "sand";
      log(game, `${unit.name}의 모래날림! 모래바람이 불기 시작했다!`);
      break;
    case "keeneye":
      drawCard(game, side);
      log(game, `${unit.name}의 예리한눈! 카드를 1장 뽑았다.`);
      break;
    case "teleport":
      drawCard(game, side);
      log(game, `${unit.name}의 텔레포트! 카드를 1장 뽑았다.`);
      break;
    case "moonlight":
      me.field.forEach((u) => (u.hp = Math.min(u.maxHp, u.hp + 2)));
      log(game, `${unit.name}의 달빛! 아군 포켓몬이 회복했다.`);
      break;
    case "psystrike":
      foe.field.forEach((u) => applyDamage(game, u, 3, "에스퍼"));
      log(game, `${unit.name}의 사이코브레이크! 적 전체에게 에스퍼 피해 3!`);
      cleanupDeaths(game);
      break;
    case "timetravel":
      me.field.forEach((u) => (u.hp = Math.min(u.maxHp, u.hp + 2)));
      drawCard(game, side);
      log(game, `${unit.name}의 자연회복! 아군 전체 회복 + 드로우!`);
      break;
    case "thunderstrike":
      foe.field.forEach((u) => applyDamage(game, u, 2, "전기"));
      log(game, `${unit.name}의 번개! 적 전체에게 피해 2!`);
      cleanupDeaths(game);
      break;
    case "flamesiege": {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        applyDamage(game, t, 3, "불꽃");
        log(game, `${unit.name}의 불대문자! ${t.name}에게 피해 3!`);
        cleanupDeaths(game);
      }
      break;
    }
    case "hypnosis":
    case "sing":
    case "lovelykiss":
    case "sleeppowder": {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        applyStatus(game, t, "sleep");
        const skillName = {
          hypnosis: "최면술",
          sing: "자장가",
          lovelykiss: "악마의키스",
          sleeppowder: "수면가루",
        }[unit.ability];
        log(game, `${unit.name}의 ${skillName}! ${t.name}이(가) 잠들었다!`);
      }
      break;
    }
    case "freezer": {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        applyStatus(game, t, "ice");
        log(game, `${unit.name}의 냉동빔! ${t.name}이(가) 얼어붙었다!`);
      }
      break;
    }
    // =================== 레전드 전용기 ===================

    case "originpulse": // 가이오가: 근원의파동
      game.weather = "rain";
      foe.field.forEach((u) => applyDamage(game, u, 3, "물"));
      if (foe.field.length) {
        const alive = foe.field.filter((u) => u.hp > 0);
        if (alive.length) {
          const t = alive[Math.floor(Math.random() * alive.length)];
          applyStatus(game, t, "ice");
        }
      }
      log(
        game,
        `${unit.name}의 근원의파동! 폭우 발동 + 상대 전체 물 피해 3 + 동결!`,
      );
      cleanupDeaths(game);
      break;

    case "icebeamdance": // 스이쿤: 오로라빔
      foe.field.forEach((u) => applyDamage(game, u, 2, "얼음"));
      cleanupDeaths(game);
      {
        const alive2 = foe.field.filter((u) => u.hp > 0);
        if (alive2.length) {
          const t = alive2[Math.floor(Math.random() * alive2.length)];
          applyStatus(game, t, "ice");
        }
      }
      log(game, `${unit.name}의 오로라빔! 상대 전체 얼음 피해 2 + 1마리 얼림!`);
      break;

    case "skydive": {
      // 파이어: 하늘에서내리꽂기
      for (let i = 0; i < 3; i++) {
        const pool = foe.field.filter((u) => u.hp > 0);
        if (!pool.length) break;
        const t = pool[Math.floor(Math.random() * pool.length)];
        applyDamage(game, t, 3, "불꽃");
      }
      log(game, `${unit.name}의 불사르기! 불꽃 피해 3을 무작위 3회!`);
      cleanupDeaths(game);
      break;
    }

    case "burningfall": // 엔테이: 불꽃폭포
      {
        const bonus = game.weather === "sun" ? 2 : 0;
        foe.field.forEach((u) => applyDamage(game, u, 3 + bonus, "불꽃"));
        log(
          game,
          `${unit.name}의 분화! 적 전체 불꽃 피해 ${3 + bonus}${bonus ? "(쾌청 보너스!)" : ""}!`,
        );
        cleanupDeaths(game);
      }
      break;

    case "thunderwave": {
      // 썬더: 번개파동
      foe.field.forEach((u) => applyDamage(game, u, 3, "전기"));
      cleanupDeaths(game);
      const aliveTW = foe.field.filter((u) => u.hp > 0);
      if (aliveTW.length) {
        const t = aliveTW[Math.floor(Math.random() * aliveTW.length)];
        applyStatus(game, t, "para");
        log(
          game,
          `${unit.name}의 천둥차기! 전체 전기 피해 3 + ${t.name} 마비!`,
        );
      } else log(game, `${unit.name}의 천둥차기! 전체 전기 피해 3!`);
      break;
    }

    case "thunderfang": {
      // 라이코: 번개이빨
      const pool = foe.field.filter((u) => u.hp > 0);
      if (pool.length) {
        const t = pool[Math.floor(Math.random() * pool.length)];
        applyDamage(game, t, 4, "전기");
        applyStatus(game, t, "para");
        log(
          game,
          `${unit.name}의 와일드볼트! ${t.name}에게 전기 피해 4 + 마비!`,
        );
        cleanupDeaths(game);
      }
      break;
    }

    case "precipiceblades": // 그란돈: 절벽의칼날
      game.weather = "sun";
      foe.field.forEach((u) => applyDamage(game, u, 4, "땅"));
      log(game, `${unit.name}의 단애의칼! 쾌청 발동 + 상대 전체 땅 피해 4!`);
      cleanupDeaths(game);
      break;

    case "frostedgale": // 프리져: 냉동풍
      foe.field.forEach((u) => {
        applyDamage(game, u, 2, "얼음");
        if (u.hp > 0) applyStatus(game, u, "ice");
      });
      log(
        game,
        `${unit.name}의 얼어붙는시선! 상대 전체 얼음 피해 2 + 전부 얼음 상태이상!`,
      );
      cleanupDeaths(game);
      break;

    case "icelock": // 레지아이스: 냉동봉인
      foe.field.forEach((u) => {
        if (u.hp > 0) applyStatus(game, u, "ice");
        applyDamage(game, u, 1, "얼음");
      });
      log(game, `${unit.name}의 눈보라! 상대 전체 얼림 + 얼음 피해 1!`);
      cleanupDeaths(game);
      break;

    case "leafstorm": // 세레비: 리프스톰
      foe.field.forEach((u) => applyDamage(game, u, 2, "풀"));
      cleanupDeaths(game);
      me.field.forEach((u) => {
        u.hp = Math.min(u.maxHp, u.hp + 2);
      });
      drawCard(game, side);
      log(
        game,
        `${unit.name}의 리프스톰! 상대 전체 풀 피해 2 + 아군 회복 + 드로우!`,
      );
      break;

    case "metronome": {
      // 뮤: 변신 (대상 선택형)
      const targets2 = foe.field.filter((u) => u.hp > 0);
      if (targets2.length) {
        // 플레이어: pendingBattlecry로 선택 대기 / AI: 가장 강한 적 자동 선택
        game.pendingBattlecry = {
          side,
          uid: unit.uid,
          ability: "metronome",
          targets: targets2.map((t) => t.uid),
        };
        log(game, `${unit.name}의 변신! 복사할 상대를 선택하세요.`);
        // 드로우는 선택 완료 후 resolveMew에서 처리
      } else {
        // 상대 필드가 비어있으면 드로우만
        const poke = me.deck.filter(
          (c) => CARD_MAP[c.cardId]?.kind === "pokemon",
        );
        if (poke.length && me.hand.length < 10) {
          const pick = poke[Math.floor(Math.random() * poke.length)];
          me.deck.splice(me.deck.indexOf(pick), 1);
          me.hand.push(pick);
        }
      }
      break;
    }
    case "aeroblast": // 루기아: 에어로블라스트
      foe.field.forEach((u) => applyDamage(game, u, 3, "비행"));
      log(
        game,
        `${unit.name}의 에어로블라스트! 상대 전체 비행 피해 3! 멀티스케일 유지.`,
      );
      cleanupDeaths(game);
      break;

    case "rockblast": {
      // 레지락: 록블래스트
      for (let i = 0; i < 4; i++) {
        const pool = foe.field.filter((u) => u.hp > 0);
        if (!pool.length) break;
        const t = pool[Math.floor(Math.random() * pool.length)];
        applyDamage(game, t, 2, "바위");
      }
      log(game, `${unit.name}의 스톤에지! 바위 피해 2를 4회!`);
      cleanupDeaths(game);
      break;
    }

    case "mistball": {
      // 라티아스: 미스트볼
      const pool3 = foe.field.filter((u) => u.hp > 0);
      if (pool3.length) {
        const t = pool3[Math.floor(Math.random() * pool3.length)];
        applyDamage(game, t, 4, "드래곤");
        log(game, `${unit.name}의 미스트볼! ${t.name}에게 드래곤 피해 4!`);
        cleanupDeaths(game);
      }
      me.field
        .filter((u) => u.type === "드래곤" && u.uid !== unit.uid)
        .forEach((u) => {
          u.atk += 1;
        });
      log(game, `아군 드래곤 포켓몬 공격력 +1!`);
      break;
    }

    case "dragonascent": // 레쿠쟈: 용승천
      game.weather = null;
      foe.field.forEach((u) => applyDamage(game, u, 3, "드래곤"));
      log(
        game,
        `${unit.name}의 화룡점정! 날씨 초기화 + 상대 전체 드래곤 피해 3!`,
      );
      cleanupDeaths(game);
      break;

    case "irondefense": // 레지스틸: 철벽
      {
        const alive3 = foe.field.filter((u) => u.hp > 0);
        alive3.forEach((u) => {
          if (u.ability !== "taunt" && u.ability !== "fortress")
            u._taunted = true;
        });
        unit.ability = "taunt"; // 도발 효과 활성화
        unit.hp = Math.min(unit.maxHp + 3, unit.hp + 3);
        unit.maxHp += 3;
        log(
          game,
          `${unit.name}의 철벽! 도발로 모든 공격을 끌어당기고 체력 +3!`,
        );
      }
      break;
    case "surge_overdrive": {
      const targets = foe.field.filter((u) => u.hp > 0);

      const t = [...targets].sort(
        (a, b) => effectiveAtk(b, game) - effectiveAtk(a, game),
      )[0];

      if (t) {
        applyDamage(game, t, 1, "전기");
        applyStatus(game, t, "para");

        log(game, `${unit.name}의 스파크! ${t.name}에게 피해 1 + 마비!`);
      }

      break;
    }

    case "sabrina_futureblade": {
      const targets = foe.field.filter((u) => u.hp > 0);

      const t = [...targets].sort(
        (a, b) => effectiveAtk(b, game) - effectiveAtk(a, game),
      )[0];

      if (t) {
        t.atk = Math.max(0, t.atk - 2);

        log(game, `${unit.name}의 사이코커터! ${t.name}의 공격력 -2!`);
      }

      break;
    }

    case "erika_flowerdance":
      game.weather = "sun";

      log(game, `${unit.name}의 그래스필드! 햇살이 강해졌다!`);

      break;

    case "janine_toxicdust": {
      const targets = foe.field.filter((u) => u.hp > 0);

      const t = [...targets].sort(
        (a, b) => effectiveAtk(b, game) - effectiveAtk(a, game),
      )[0];

      if (t) {
        applyStatus(game, t, "poison");
        t.atk = Math.max(0, t.atk - 1);

        log(game, `${unit.name}의 독가루! ${t.name}은(는) 독 상태, 공격력 -1!`);
      }

      break;
    }

    case "misty_miraclestar":
      game.weather = "rain";

      log(game, `${unit.name}의 물의파동! 비가 내리기 시작했다!`);

      break;

    case "blaine_eruption":
      game.weather = "sun";

      foe.field.forEach((u) => applyDamage(game, u, 2, "불꽃"));

      log(game, `${unit.name}의 히트스탬프! 쾌청 + 상대 전체 불꽃 피해 2!`);

      break;

    case "blue_hurricane":
      unit.canAttack = true;

      log(game, `${unit.name}의 폭풍! 바로 공격할 수 있다!`);

      break;

    case "red_volttackle":
      unit.atk += 4;
      unit.hp += 4;
      unit.maxHp += 4;

      log(game, `${unit.name}의 볼트태클! +4/+4!`);

      break;
    default:
      break;
  }
  // 쓱쓱: 비면 소환 즉시 공격 가능
  if (unit.ability === "swiftswim" && game.weather === "rain") {
    unit.canAttack = true;
    log(game, `${unit.name}은(는) 쓱쓱으로 바로 움직일 수 있다!`);
  }
  if (unit.ability === "rush") {
    unit.canAttack = true;
  }
}

// ---------- 카드 사용 ----------
// target: { side, uid } | null
export function canPlayCard(game, side, handIdx) {
  const p = game.players[side];
  const h = p.hand[handIdx];
  if (!h) return false;
  const card = CARD_MAP[h.cardId];
  if (effectiveCost(card, game) > p.mana) return false;
  if (
    card.kind === "pokemon" &&
    !card.evolvesFrom &&
    p.field.length >= MAX_FIELD
  )
    return false;
  if (card.kind === "pokemon" && card.evolvesFrom) {
    // 이번 턴에 나왔거나 진화한 포켓몬은 진화 불가 (메가진화는 예외)
    return p.field.some((u) => u.cardId === card.evolvesFrom && !u.noEvolve);
  }
  if (card.kind === "mega") {
    if (p.megaUsed) return false;
    return p.field.some((u) => u.cardId === card.megaFor && !u.mega);
  }
  if (card.kind === "item") {
    return p.field.some((u) => !u.item);
  }
  if (
    card.kind === "spell" &&
    (card.spell?.effect === "cure_status" ||
      card.spell?.effect === "cure_all_status")
  ) {
    return p.field.some((u) => u.status !== null);
  }
  if (card.kind === "spell") {
    const t = card.spell.target;
    if (t === "enemy-any") return true; // 영웅은 항상 있음
    if (t === "friendly-pokemon") return p.field.length > 0;
    return true;
  }
  return true;
}

// 카드 사용 이벤트 기록 (UI 연출용)
function markPlay(game, side, card, extra = null) {
  game.animSeq = (game.animSeq || 0) + 1;

  const impacts = takeImpacts(game);

  game.lastAction = {
    seq: game.animSeq,
    kind: "play",
    side,
    cardId: card.id,

    ...(impacts.length > 0 ? { impacts } : {}),

    ...(extra || {}),
  };
}

export function playCard(
  game,
  side,
  handIdx,
  target = null,
  fieldIndex = null,
) {
  const p = game.players[side];
  if (game.turn !== side || game.winner) return false;
  if (!canPlayCard(game, side, handIdx)) return false;
  const h = p.hand[handIdx];
  const card = CARD_MAP[h.cardId];
  const cost = effectiveCost(card, game);

  beginImpactCapture(game);

  // ----- 포켓몬 (기본) -----
  if (card.kind === "pokemon" && !card.evolvesFrom) {
    p.mana -= cost;
    p.hand.splice(handIdx, 1);
    const unit = makeUnit(card, game, side);
    if (fieldIndex != null) {
      const at = Math.max(0, Math.min(fieldIndex, p.field.length));
      p.field.splice(at, 0, unit);
    } else {
      p.field.push(unit);
    }
    log(game, `${p.name}이(가) ${card.name}을(를) 냈다!`);
    runBattlecry(game, side, unit);
    cleanupDeaths(game);
    markPlay(game, side, card);
    return true;
  }

  // ----- 포켓몬 (진화) -----
  if (card.kind === "pokemon" && card.evolvesFrom) {
    const base = target
      ? p.field.find(
          (u) =>
            u.uid === target.uid &&
            u.cardId === card.evolvesFrom &&
            !u.noEvolve,
        )
      : p.field.find((u) => u.cardId === card.evolvesFrom && !u.noEvolve);
    if (!base) return false;
    p.mana -= cost;
    p.hand.splice(handIdx, 1);
    const damageTaken = base.maxHp - base.hp;
    base.cardId = card.id;
    base.name = card.name;
    base.type = card.type;
    base.atk = card.atk;
    base.maxHp = card.hp;
    base.hp = Math.max(1, card.hp - damageTaken);
    base.rarity = card.rarity;
    base.emoji = card.emoji;
    base.ability = card.ability || null;
    base.stage = card.stage;
    base.summonedTurn = game.turnCount;
    // canAttack 상태는 유지 (진화해도 소환멀미 그대로)
    log(game, `${base.name}(으)로 진화했다!`);
    runBattlecry(game, side, base);
    cleanupDeaths(game);
    markPlay(game, side, card, { anim: "evolve", uid: base.uid });
    return true;
  }

  // ----- 메가진화 -----
  if (card.kind === "mega") {
    const base = target
      ? p.field.find((u) => u.uid === target.uid && u.cardId === card.megaFor)
      : p.field.find((u) => u.cardId === card.megaFor && !u.mega);
    if (!base || base.mega || p.megaUsed) return false;
    p.mana -= cost;
    p.hand.splice(handIdx, 1);
    p.megaUsed = true;
    base.mega = true;
    base.name = `메가 ${base.name}`;
    base.atk += card.mega.atk;
    base.maxHp += card.mega.hp;
    base.hp += card.mega.hp;
    base.ability = card.mega.ability;
    log(game, `${base.name}(으)로 메가진화했다!!`);
    if (card.mega.battlecryWeather) {
      game.weather = card.mega.battlecryWeather;
      log(game, `가뭄 발동! 햇살이 강해졌다!`);
    }
    if (card.mega.reBattlecry) {
      runBattlecry(game, side, base);
    }
    if (card.mega.reIntimidate) {
      const foes = game.players[other(side)].field.filter((u) => u.hp > 0);
      if (foes.length) {
        const t = foes[Math.floor(Math.random() * foes.length)];
        t.atk = Math.max(0, t.atk - 2);
        log(game, `위협 재발동! ${t.name}의 공격력이 2 떨어졌다!`);
      }
    }
    if (
      base.ability === "swiftswim" &&
      game.weather === "rain" &&
      !base.canAttack
    ) {
      base.canAttack = true;
      log(game, `쓱쓱 발동! ${base.name}이(가) 바로 움직일 수 있다!`);
    }
    markPlay(game, side, card, { anim: "mega", uid: base.uid });
    return true;
  }

  // ----- 도구 -----
  if (card.kind === "item") {
    if (!target) return false;
    const u = p.field.find((x) => x.uid === target.uid);
    if (!u || u.item) return false;
    p.mana -= cost;
    p.hand.splice(handIdx, 1);
    u.item = card.item.effect;
    if (card.item.effect === "everstone") {
      u.maxHp += card.item.hpBonus;
      u.hp += card.item.hpBonus;
      u.noEvolve = true;
    } else if (card.item.effect === "lifeorb") {
      u.atk += card.item.atkBonus;
    } else if (card.item.effect === "focussash") {
      u.focusSashUsed = false;
    }
    log(game, `${u.name}에게 ${card.name}을(를) 장착했다!`);
    recordImpact(game, {
      type: "buff",
      side,
      targetUid: u.uid,
      amount: 0,
    });
    markPlay(game, side, card, { anim: "item", uid: u.uid });
    return true;
  }

  // ----- 기술 카드 -----
  if (card.kind === "spell") {
    const s = card.spell;
    const foe = game.players[other(side)];

    if (s.effect === "weather") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      game.weather = s.weather;
      log(
        game,
        `${p.name}이(가) ${card.name}을(를) 사용했다! ${WEATHER_NAME[s.weather]}!`,
      );
      recordImpact(game, {
        type: "cleanse",
        side,
        targetUid: u.uid,
        amount: 0,
      });
      markPlay(game, side, card);
      return true;
    }

    if (s.effect === "tutor_pokemon") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      const idxs = p.deck
        .map((id, i) => ({ id, i }))
        .filter((x) => CARD_MAP[x.id].kind === "pokemon");
      if (idxs.length > 0) {
        const pick = idxs[Math.floor(Math.random() * idxs.length)];
        p.deck.splice(pick.i, 1);
        if (p.hand.length < MAX_HAND) {
          p.hand.push({ uid: nextUid(), cardId: pick.id });
          log(game, `몬스터볼! ${CARD_MAP[pick.id].name}을(를) 손에 넣었다!`);
        }
      } else {
        log(game, "몬스터볼을 던졌지만 덱에 포켓몬이 없었다...");
      }
      markPlay(game, side, card);
      return true;
    }

    // 슈퍼볼: 포켓몬 2장 무작위 드로우
    if (s.effect === "tutor_pokemon_2") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      let drawn = 0;

      for (let attempt = 0; attempt < 2; attempt++) {
        if (p.hand.length >= MAX_HAND) break;

        const idxs = p.deck
          .map((id, i) => ({ id, i }))
          .filter((x) => CARD_MAP[x.id]?.kind === "pokemon");

        if (!idxs.length) break;

        const pick = idxs[Math.floor(Math.random() * idxs.length)];

        p.deck.splice(pick.i, 1);
        p.hand.push({
          uid: nextUid(),
          cardId: pick.id,
        });

        drawn++;
      }

      log(game, `슈퍼볼! 포켓몬 ${drawn}장을 손에 넣었다!`);
      markPlay(game, side, card);
      return true;
    }

    // 하이퍼볼: 포켓몬 최대 3장 공개 후 1장 선택
    if (s.effect === "tutor_choose_3") {
      const pokeIdxs = p.deck
        .map((id, i) => ({ id, i }))
        .filter((x) => CARD_MAP[x.id]?.kind === "pokemon");

      if (!pokeIdxs.length) return false;

      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      const picks = shuffle(pokeIdxs)
        .slice(0, 3)
        .map((x) => ({
          uid: nextUid(),
          cardId: x.id,
        }));

      // 선택 후보를 덱에서 임시 제거
      picks.forEach((pick) => {
        const index = p.deck.indexOf(pick.cardId);

        if (index !== -1) {
          p.deck.splice(index, 1);
        }
      });

      // AI는 자동 선택
      if (side === "enemy") {
        const chosen = picks[Math.floor(Math.random() * picks.length)];
        const returnedIds = picks
          .filter((pick) => pick.uid !== chosen.uid)
          .map((pick) => pick.cardId);

        p.hand.push(chosen);
        p.deck = shuffle([...p.deck, ...returnedIds]);

        log(
          game,
          `하이퍼볼! ${CARD_MAP[chosen.cardId].name}을(를) 손에 넣었다!`,
        );
        markPlay(game, side, card);
        return true;
      }

      game.pendingChoose = {
        side,
        picks,
        effect: "hyperball",
      };

      log(
        game,
        `하이퍼볼! ${picks
          .map((pick) => CARD_MAP[pick.cardId]?.name)
          .join(", ")} 중 선택하세요!`,
      );

      markPlay(game, side, card);
      return true;
    }

    // 상태이상 치료제
    if (s.effect === "cure_status" || s.effect === "cure_all_status") {
      if (!target) return false;
      const u = p.field.find((x) => x.uid === target.uid);
      if (!u) return false;
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      if (s.effect === "cure_all_status") {
        u.status = null;
        u.statusTurns = 0;
        log(game, `${card.name}! ${u.name}의 모든 상태이상이 회복됐다!`);
      } else {
        if (u.status === s.statusType) {
          u.status = null;
          u.statusTurns = 0;
        }
        log(game, `${card.name}! ${u.name}의 상태이상이 회복됐다!`);
      }
      markPlay(game, side, card);
      return true;
    }

    if (s.effect === "aoe") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      const base = spellDamageAmount(card, game);
      log(game, `${card.name}! 적 전체 공격!`);
      foe.field.forEach((u) => {
        const dmg = calcTypedDamage(base, card.moveType, u.type);
        const mult = typeMult(card.moveType, u.type);
        const dealt = applyDamage(game, u, dmg, card.moveType);
        let note = "";
        if (mult > 1) note = " 효과가 굉장했다!";
        else if (mult === 0) note = " 효과가 없는 것 같다...";
        else if (mult < 1) note = " 효과가 별로인 듯하다...";
        if (mult === 0 || dealt > 0)
          log(game, `- ${u.name}에게 피해 ${dealt}.${note}`);
      });
      cleanupDeaths(game);
      markPlay(game, side, card);
      return true;
    }

    if (
      s.effect === "damage" ||
      s.effect === "damage_draw" ||
      s.effect === "damage_freeze"
    ) {
      if (!target) return false;
      if (target.uid !== "hero" && !foe.field.some((x) => x.uid === target.uid))
        return false;
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      const base = spellDamageAmount(card, game);
      if (target.uid === "hero") {
        foe.hp -= base;

        recordImpact(game, {
          type: "damage",
          side: other(side),
          targetUid: "hero",
          amount: base,
        });

        log(game, `${card.name}! ${foe.name}에게 피해 ${base}!`);
      } else {
        const u = foe.field.find((x) => x.uid === target.uid);
        if (u) {
          const dmg = calcTypedDamage(base, card.moveType, u.type);
          const mult = typeMult(card.moveType, u.type);
          const dealt = applyDamage(game, u, dmg, card.moveType);
          let note = "";
          if (mult > 1) note = " 효과가 굉장했다!";
          else if (mult === 0) note = " 효과가 없는 것 같다...";
          else if (mult < 1) note = " 효과가 별로인 듯하다...";
          log(game, `${card.name}! ${u.name}에게 피해 ${dealt}!${note}`);
        }
      }
      if (s.effect === "damage_draw") drawCard(game, side);
      if (s.effect === "damage_freeze" && target.uid !== "hero") {
        const u = foe.field.find((x) => x.uid === target.uid);
        if (u && u.hp > 0) {
          applyStatus(game, u, "ice");
          log(game, `${u.name}이(가) 얼어붙었다!`);
        }
      }
      cleanupDeaths(game);
      markPlay(game, side, card);
      return true;
    }

    if (s.effect === "heal") {
      if (!target) return false;

      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      if (target.uid === "hero") {
        const before = p.hp;

        p.hp = Math.min(p.maxHp, p.hp + 4);

        const healed = p.hp - before;

        log(game, `${card.name}! ${p.name}의 체력이 ${healed} 회복됐다.`);

        if (healed > 0) {
          recordImpact(game, {
            type: "heal",
            side,
            targetUid: "hero",
            amount: healed,
          });
        }
      } else {
        const u = p.field.find((x) => x.uid === target.uid);

        if (!u) return false;

        const before = u.hp;

        u.hp = Math.min(u.maxHp, u.hp + s.amount);

        const healed = u.hp - before;

        log(game, `${card.name}! ${u.name}의 체력이 ${healed} 회복됐다.`);

        if (healed > 0) {
          recordImpact(game, {
            type: "heal",
            side,
            targetUid: u.uid,
            amount: healed,
          });
        }
      }

      markPlay(game, side, card);
      return true;
    }

    if (s.effect === "fullheal") {
      if (!target) return false;

      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      if (target.uid === "hero") {
        const before = p.hp;

        p.hp = Math.min(p.maxHp, p.hp + 8);

        const healed = p.hp - before;

        log(game, `${card.name}! ${p.name}의 체력이 ${healed} 회복됐다!`);

        if (healed > 0) {
          recordImpact(game, {
            type: "heal",
            side,
            targetUid: "hero",
            amount: healed,
          });
        }
      } else {
        const u = p.field.find((x) => x.uid === target.uid);

        if (!u) return false;

        const before = u.hp;

        u.hp = u.maxHp;
        u.frozen = 0;
        u.status = null;
        u.statusTurns = 0;

        const healed = u.hp - before;

        log(game, `${card.name}! ${u.name}이(가) 완전히 회복됐다!`);

        recordImpact(game, {
          type: healed > 0 ? "heal" : "cleanse",
          side,
          targetUid: u.uid,
          amount: healed,
        });
      }

      markPlay(game, side, card);
      return true;
    }
  }
  return false;
}

export function resolveHyperball(game, side, pickUid) {
  const pending = game.pendingChoose;

  if (!pending || pending.side !== side || pending.effect !== "hyperball") {
    return false;
  }

  const chosen = pending.picks.find((pick) => pick.uid === pickUid);

  if (!chosen) return false;

  const p = game.players[side];

  const returnedIds = pending.picks
    .filter((pick) => pick.uid !== pickUid)
    .map((pick) => pick.cardId);

  if (p.hand.length < MAX_HAND) {
    p.hand.push(chosen);
    log(game, `하이퍼볼! ${CARD_MAP[chosen.cardId].name}을(를) 손에 넣었다!`);
  } else {
    returnedIds.push(chosen.cardId);
    log(game, "손패가 가득 차 포켓몬을 가져오지 못했다.");
  }

  p.deck = shuffle([...p.deck, ...returnedIds]);
  game.pendingChoose = null;

  return true;
}

// ---------- 공격 ----------
export function canAttack(game, side, unitUid) {
  const p = game.players[side];
  const u = p.field.find((x) => x.uid === unitUid);
  if (!u) return false;
  if (u.ability === "fortress") return false;
  if (!u.canAttack) return false;
  if (u.status === "ice") return false;
  if (u.status === "sleep" && u.statusTurns === 0) return false; // 걸린 첫턴 행동불능
  if (u.frozen > 0) return false; // 하위호환
  if (effectiveAtk(u, game) <= 0) return false;
  return true;
}

export function validAttackTargets(game, side, attackerUid = null) {
  const foe = game.players[other(side)];
  const attacker = attackerUid
    ? game.players[side].field.find((u) => u.uid === attackerUid)
    : null;
  const noguard = attacker && attacker.ability === "noguard";
  const taunts = noguard
    ? []
    : foe.field.filter(
        (u) =>
          (u.ability === "taunt" ||
            u.ability === "fortress" ||
            u.ability === "brock_rockwall") &&
          u.hp > 0,
      );
  if (taunts.length > 0) return { units: taunts, hero: false };
  return { units: foe.field, hero: true };
}

export function resolveMew(game, side, targetUid) {
  const pending = game.pendingBattlecry;
  if (!pending || pending.side !== side || pending.ability !== "metronome")
    return false;
  const me = game.players[side];
  const foe = game.players[other(side)];
  const mew = me.field.find((u) => u.uid === pending.uid);
  const target = foe.field.find((u) => u.uid === targetUid);
  game.pendingBattlecry = null;
  if (mew && target) {
    mew.atk = target.atk;
    log(
      game,
      `${mew.name}의 변신! ${target.name}의 공격력(${target.atk}) 복사!`,
    );
  }
  // 덱에서 포켓몬 1장 드로우
  const poke = me.deck.filter((c) => CARD_MAP[c.cardId]?.kind === "pokemon");
  if (poke.length && me.hand.length < 10) {
    const pick = poke[Math.floor(Math.random() * poke.length)];
    me.deck.splice(me.deck.indexOf(pick), 1);
    me.hand.push(pick);
    log(game, `${CARD_MAP[pick.cardId]?.name}을(를) 손으로 가져왔다.`);
  }
  return true;
}

export function resolveMoldbreaker(game, side, targetUid) {
  const pending = game.pendingBattlecry;
  if (!pending || pending.side !== side || !pending.targets.includes(targetUid))
    return false;
  const foe = game.players[other(side)];
  const t = foe.field.find((u) => u.uid === targetUid);
  game.pendingBattlecry = null;
  if (!t) return false;
  t.ability = null;
  log(game, `도발이 사라졌다!`);
  applyDamage(game, t, 2, "벌레");
  cleanupDeaths(game);
  return true;
}

// 진화 카드인데 낼 수 없을 때: 버리고 카드 1장 뽑기 (턴당 1회)
export function discardToDraw(game, side, handIdx) {
  const p = game.players[side];
  if (game.turn !== side || game.winner || p.discardUsedThisTurn) return false;
  const h = p.hand[handIdx];
  if (!h) return false;
  const card = CARD_MAP[h.cardId];
  if (card.kind !== "pokemon" || !card.evolvesFrom) return false;
  p.hand.splice(handIdx, 1);
  p.discardUsedThisTurn = true;
  log(game, `${card.name}을(를) 버리고 카드를 뽑았다.`);
  drawCard(game, side);
  return true;
}

function spendAttack(game, unit) {
  if (
    (unit.ability === "skilllink" || unit.ability === "blue_hurricane") &&
    !unit.extraUsed
  ) {
    unit.extraUsed = true;

    if (unit.ability === "blue_hurricane") {
      log(game, `${unit.name}의 폭풍! 한 번 더 공격할 수 있다!`);
    } else {
      log(game, `${unit.name}의 스킬링크! 한 번 더 공격할 수 있다!`);
    }
  } else {
    unit.canAttack = false;

    if (unit.ability === "truant") {
      unit.resting = true;
    }
  }

  // 레드의 피카츄 - 볼트태클 반동
  if (unit.ability === "red_volttackle") {
    unit.hp -= 2;

    recordImpact(game, {
      type: "damage",
      side: unit.side,
      targetUid: unit.uid,
      amount: 2,
    });

    log(game, `${unit.name}의 볼트태클 반동! 피해 2!`);
  }
}

export function attack(game, side, attackerUid, target) {
  if (game.turn !== side || game.winner) return false;
  const p = game.players[side];
  const foe = game.players[other(side)];
  const atkUnit = p.field.find((u) => u.uid === attackerUid);
  if (!atkUnit || !canAttack(game, side, attackerUid)) return false;

  beginImpactCapture(game);

  const { units, hero } = validAttackTargets(game, side, attackerUid);

  if (target.uid === "hero") {
    if (!hero) return false;
    const dmg = effectiveAtk(atkUnit, game);

    foe.hp -= dmg;

    recordImpact(game, {
      type: "damage",
      side: other(side),
      targetUid: "hero",
      amount: dmg,
    });
    spendAttack(game, atkUnit);
    log(
      game,
      `${atkUnit.name}이(가) ${foe.name}을(를) 직접 공격! 피해 ${dmg}!`,
    );
    game.animSeq = (game.animSeq || 0) + 1;
    game.lastAction = {
      seq: game.animSeq,
      kind: "attack",
      side,
      uid: attackerUid,
      targetUid: "hero",
      impacts: takeImpacts(game),
    };
    checkWinner(game);
    return true;
  }

  const defUnit = units.find((u) => u.uid === target.uid);
  if (!defUnit) return false;

  const atkDmgBase = effectiveAtk(atkUnit, game);
  const defDmgBase = effectiveAtk(defUnit, game);
  // 대운(bigchance): 공격 시 피해 1.5배 (소수점 올림)
  const bigChanceMult = atkUnit.ability === "bigchance" ? 1.5 : 1;
  const atkDmg = Math.ceil(
    calcTypedDamage(atkDmgBase, atkUnit.type, defUnit.type) * bigChanceMult,
  );
  const defDmg = calcTypedDamage(defDmgBase, defUnit.type, atkUnit.type);
  if (atkUnit.ability === "bigchance" && atkDmgBase > 0)
    log(game, `${atkUnit.name}의 대운! 피해가 1.5배!`);

  const mult = typeMult(atkUnit.type, defUnit.type);
  applyDamage(game, defUnit, atkDmg, atkUnit.type);
  applyDamage(game, atkUnit, defDmg, defUnit.type);
  spendAttack(game, atkUnit);

  let note = "";
  if (mult > 1) note = " 효과가 굉장했다!";
  else if (mult === 0) note = " 효과가 없었다...";
  else if (mult < 1) note = " 효과가 별로였다...";
  log(
    game,
    `${atkUnit.name} ➜ ${defUnit.name} 공격! 피해 ${atkDmg}, 반격 ${defDmg}.${note}`,
  );

  // 까칠한피부: 공격자에게 2
  if (defUnit.ability === "roughskin" && atkUnit.hp > 0) {
    applyDamage(game, atkUnit, 2, null);
    log(
      game,
      `${defUnit.name}의 까칠한피부! ${atkUnit.name}이(가) 피해 2를 받았다!`,
    );
  }
  // serenegrace: 공격자에게 있으면 상태이상 확률 2배 (먼저 선언)
  const atkBonus = atkUnit.ability === "serenegrace" ? 2 : 1;
  // 정전기: 공격/공격당할 때 40% 확률로 상대 마비
  if (defUnit.ability === "static" && atkUnit.hp > 0) {
    applyDamage(game, atkUnit, 1, "전기");
    if (Math.random() < 0.4) {
      applyStatus(game, atkUnit, "para");
      log(game, `${defUnit.name}의 정전기! ${atkUnit.name}에게 피해 1 + 마비!`);
    } else {
      log(game, `${defUnit.name}의 정전기! ${atkUnit.name}에게 피해 1!`);
    }
  }
  if (atkUnit.ability === "static" && defUnit.hp > 0) {
    if (Math.random() < 0.4 * atkBonus) {
      applyStatus(game, defUnit, "para");
      log(game, `${atkUnit.name}의 정전기! ${defUnit.name}에게 마비!`);
    }
  }

  // 독가시: 공격당할 때 30% 독
  if (
    defUnit.ability === "poisonbarb" &&
    atkUnit.hp > 0 &&
    Math.random() < 0.3
  ) {
    applyStatus(game, atkUnit, "poison");
    log(game, `${defUnit.name}의 독가시! ${atkUnit.name}에게 독 상태이상!`);
  }
  // 독침: 공격할 때 30% 독
  if (
    atkUnit.ability === "poisonpoint" &&
    defUnit.hp > 0 &&
    Math.random() < 0.3 * atkBonus
  ) {
    applyStatus(game, defUnit, "poison");
    log(game, `${atkUnit.name}의 독침! ${defUnit.name}에게 독 상태이상!`);
  }
  // 불꽃몸(불꽃): 공격당할 때 30% 확률로 화상 부여
  if (
    defUnit.ability === "flamebody" &&
    atkUnit.hp > 0 &&
    Math.random() < 0.3
  ) {
    applyStatus(game, atkUnit, "burn");
    log(game, `${defUnit.name}의 불꽃몸! ${atkUnit.name}에게 화상 상태이상!`);
  }
  // 냉동몸: 공격당할 때 20% 얼음
  if (defUnit.ability === "icebody" && atkUnit.hp > 0 && Math.random() < 0.2) {
    applyStatus(game, atkUnit, "ice");
    log(game, `${defUnit.name}의 냉동몸! ${atkUnit.name}에게 얼음 상태이상!`);
  }
  // 프리즈드라이: 공격할 때 25% 얼음
  if (
    atkUnit.ability === "freezedry" &&
    defUnit.hp > 0 &&
    Math.random() < 0.25 * atkBonus
  ) {
    applyStatus(game, defUnit, "ice");
    log(
      game,
      `${atkUnit.name}의 프리즈드라이! ${defUnit.name}에게 얼음 상태이상!`,
    );
  }

  if (defUnit.hp <= 0 && atkUnit.hp > 0 && atkUnit.ability === "moxie") {
    atkUnit.atk += 1;
    log(game, `${atkUnit.name}의 자기과신! 공격력이 1 올랐다!`);
  }
  if (atkDmg > 0 && atkUnit.hp > 0 && atkUnit.item === "shellbell") {
    const before = atkUnit.hp;

    atkUnit.hp = Math.min(atkUnit.maxHp, atkUnit.hp + 1);

    const healed = atkUnit.hp - before;

    if (healed > 0) {
      recordImpact(game, {
        type: "heal",
        side: atkUnit.side,
        targetUid: atkUnit.uid,
        amount: healed,
      });
    }

    log(game, `${atkUnit.name}의 조개껍질방울! 체력을 ${healed} 회복했다.`);
  }
  game.animSeq = (game.animSeq || 0) + 1;

  game.lastAction = {
    seq: game.animSeq,
    kind: "attack",
    side,
    uid: attackerUid,
    targetUid: target.uid,
    impacts: takeImpacts(game),
  };

  return true;
}

// ---------- 기술 카드 타겟 필요 여부 ----------
export function spellNeedsTarget(card) {
  if (card.kind === "pokemon" && card.evolvesFrom) return "evolve";
  if (card.kind === "mega") return "mega";
  if (card.kind === "item") return "friendly";
  if (card.kind !== "spell") return null;
  const t = card.spell.target;
  if (t === "enemy-any") return "enemy";
  if (t === "friendly-pokemon") {
    const e = card.spell.effect;
    if (e === "heal" || e === "fullheal") return "friendly-or-hero";
    if (e === "cure_status" || e === "cure_all_status") return "friendly";
    return "friendly";
  }
  return null;
}
