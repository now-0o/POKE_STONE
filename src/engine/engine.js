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

function hasAbility(unit, ability) {
  return unit?.ability === ability || unit?.secondaryAbility === ability;
}

function lowerAttack(game, unit, amount, sourceName = null) {
  if (!unit || amount <= 0) {
    return 0;
  }

  if (
    hasAbility(unit, "clearbody") ||
    hasAbility(unit, "hypercutter") ||
    hasAbility(unit, "oblivious")
  ) {
    if (sourceName) {
      log(
        game,
        `${unit.name}의 특성으로 ${sourceName}의 공격력 감소를 막았다!`,
      );
    }

    return 0;
  }

  const before = unit.atk;

  unit.atk = Math.max(0, unit.atk - amount);

  return before - unit.atk;
}

function refreshForecastUnit(game, unit) {
  if (!unit || !hasAbility(unit, "forecast")) {
    return;
  }

  const nextType =
    game.weather === "rain"
      ? "물"
      : game.weather === "sun"
        ? "불꽃"
        : game.weather === "sand"
          ? "바위"
          : "노말";

  if (unit.type !== nextType) {
    unit.type = nextType;

    log(game, `${unit.name}의 기분파! ${nextType} 타입으로 변했다!`);
  }
}

function refreshForecastAll(game) {
  ["player", "enemy"].forEach((side) => {
    game.players[side].field.forEach((unit) => {
      refreshForecastUnit(game, unit);
    });
  });
}

function setWeather(game, weather) {
  game.weather = weather;

  refreshForecastAll(game);
}

function typeMultAgainstUnit(attackType, unit) {
  const mult = typeMult(attackType, unit.type);

  // 이향의 킹드라 - 용의파동
  // 약점 공격도 1배로 받는다.
  if (hasAbility(unit, "clair_dragonpulse") && mult > 1) {
    return 1;
  }

  return mult;
}

function calcTypedDamageAgainstUnit(base, attackType, unit) {
  if (base <= 0) return 0;

  const mult = typeMultAgainstUnit(attackType, unit);

  // 무효 타입은 그대로 0
  if (mult === 0) return 0;

  if (mult > 1) {
    return Math.ceil(base * mult);
  }

  // 반감이어도 최소 피해 1
  if (mult < 1) {
    return Math.max(1, Math.floor(base * mult));
  }

  return base;
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

// ============================================================
// 성도지방 - 안정적인 덱 보정
// ============================================================

function moveDeckCardToTop(player, index) {
  if (index < 0 || index >= player.deck.length) {
    return false;
  }

  const [cardId] = player.deck.splice(index, 1);

  // drawCard()가 pop()으로 뽑으므로
  // 배열 마지막이 덱 맨 위
  player.deck.push(cardId);

  return true;
}

function randomIndexFrom(deck, predicate) {
  const candidates = [];

  deck.forEach((cardId, index) => {
    const card = CARD_MAP[cardId];

    if (card && predicate(card, cardId)) {
      candidates.push(index);
    }
  });

  if (!candidates.length) {
    return -1;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function prepareStableOpening(player, drawCount) {
  if (!player || drawCount <= 0) {
    return;
  }

  // ------------------------------------------
  // 1. 첫 손패에 1코스트 이하 기본 포켓몬
  //    최소 1장 확보
  // ------------------------------------------

  const basicIndex = randomIndexFrom(
    player.deck,
    (card) => card.kind === "pokemon" && !card.evolvesFrom && card.cost <= 1,
  );

  if (basicIndex !== -1) {
    moveDeckCardToTop(player, basicIndex);
  }

  if (drawCount <= 1) {
    return;
  }

  // ------------------------------------------
  // 2. 추가로 초반에 쓸 수 있는 카드 1장
  //
  // 진화체 / 메가스톤 / 도구는 제외.
  // 기본 포켓몬 또는 바로 쓸 수 있는 기술만.
  // ------------------------------------------

  const stablePool = basicIndex !== -1 ? player.deck.slice(0, -1) : player.deck;

  const stableIndex = randomIndexFrom(stablePool, (card) => {
    if (card.cost > 2) {
      return false;
    }

    if (card.kind === "pokemon") {
      return !card.evolvesFrom;
    }

    if (card.kind === "spell") {
      return card.spell?.target !== "friendly-pokemon";
    }

    return false;
  });

  if (stableIndex !== -1) {
    moveDeckCardToTop(player, stableIndex);
  }
}

function canStableDrawCard(game, side, cardId) {
  const p = game.players[side];
  const card = CARD_MAP[cardId];

  if (!card) return false;

  if (effectiveCost(card, game, side) > p.mana) {
    return false;
  }

  // 기본 포켓몬
  if (card.kind === "pokemon" && !card.evolvesFrom) {
    return p.field.length < MAX_FIELD;
  }

  // 진화
  if (card.kind === "pokemon" && card.evolvesFrom) {
    return p.field.some((u) => u.cardId === card.evolvesFrom && !u.noEvolve);
  }

  // 메가진화
  if (card.kind === "mega") {
    if (p.megaUsed) return false;

    return p.field.some((u) => u.cardId === card.megaFor && !u.mega);
  }

  // 도구
  if (card.kind === "item") {
    return p.field.some((u) => !u.item);
  }

  // 기술
  if (card.kind === "spell") {
    if (
      card.spell?.effect === "cure_status" ||
      card.spell?.effect === "cure_all_status"
    ) {
      return p.field.some((u) => u.status !== null);
    }

    if (card.spell?.target === "friendly-pokemon") {
      return p.field.length > 0;
    }

    return true;
  }

  return false;
}

function drawStableCard(game, side, silent = false) {
  const p = game.players[side];

  if (!p.deck.length) {
    return drawCard(game, side, silent);
  }

  if (p.hand.length >= MAX_HAND) {
    return drawCard(game, side, silent);
  }

  const trainer = game.trainer;

  // 성도 stableDeck이 아니거나
  // 직전 턴이 벽돌이 아니면 일반 드로우
  if (side !== "enemy" || !trainer?.stableDeck || (p._brickTurns || 0) <= 0) {
    return drawCard(game, side, silent);
  }

  const baseChance = Math.max(
    0,
    Math.min(1, trainer.consistencyAssist ?? 0.75),
  );

  // 연속으로 벽돌이 나면
  // 보정 확률이 자연스럽게 상승
  //
  // 0.75 기준
  // 1회 벽돌 = 75%
  // 2회 벽돌 = 93.75%
  // 3회 벽돌 = 98.4%
  const streak = Math.max(1, p._brickTurns || 1);

  const assistChance = 1 - Math.pow(1 - baseChance, streak);

  if (Math.random() >= assistChance) {
    return drawCard(game, side, silent);
  }

  const candidates = [];

  p.deck.forEach((cardId, index) => {
    if (canStableDrawCard(game, side, cardId)) {
      candidates.push(index);
    }
  });

  // 현재 쓸 수 있는 카드가
  // 덱에도 없다면 정상 드로우
  if (!candidates.length) {
    return drawCard(game, side, silent);
  }

  const index = candidates[Math.floor(Math.random() * candidates.length)];

  const [cardId] = p.deck.splice(index, 1);

  p.hand.push({
    uid: nextUid(),
    cardId,
  });

  if (!silent) {
    log(game, `${p.name}이(가) 카드를 뽑았다.`);
  }

  return cardId;
}

function markProductiveAction(game, side) {
  const p = game.players[side];

  if (!p) return;

  p._productiveActionsThisTurn = (p._productiveActionsThisTurn || 0) + 1;
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

  // 성도 stableDeck:
  // 첫 손패 최소 안정성 보장
  if (trainer.stableDeck) {
    prepareStableOpening(game.players.enemy, openingDraws.enemy);
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
    _statusGuardTurns: 0,
    _productiveActionsThisTurn: 0,
    _brickTurns: 0,
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
export function applyStatus(game, unit, statusType, sourceUnit = null) {
  if (!unit || unit.hp <= 0) {
    return false;
  }

  // 혹시 데이터에서 잘못 들어와도 보정
  if (statusType === "paralyze") {
    statusType = "para";
  }

  if (unit.status) {
    return false;
  }

  const owner = game.players[unit.side];

  // 신비의부적
  if (owner?._statusGuardTurns > 0) {
    log(game, `${unit.name}은(는) 신비의부적으로 상태이상을 막았다!`);

    return false;
  }

  // 수의베일
  if (hasAbility(unit, "waterveil") && statusType === "burn") {
    log(game, `${unit.name}의 수의베일! 화상을 막았다!`);

    return false;
  }

  // 둔감
  if (hasAbility(unit, "oblivious") && statusType === "sleep") {
    log(game, `${unit.name}의 둔감! 잠듦을 막았다!`);

    return false;
  }

  // 매직미러
  if (hasAbility(unit, "magicbounce")) {
    if (sourceUnit && sourceUnit.hp > 0) {
      log(
        game,
        `${unit.name}의 매직미러! 상태이상을 ${sourceUnit.name}에게 되돌렸다!`,
      );

      applyStatus(game, sourceUnit, statusType, null);
    } else {
      log(game, `${unit.name}의 매직미러! 상태이상을 튕겨냈다!`);
    }

    return false;
  }

  // 쾌청 중 얼음 불가
  if (statusType === "ice" && game.weather === "sun") {
    return false;
  }

  // 타입 면역
  if (statusType === "burn" && unit.type === "불꽃") {
    return false;
  }

  if (statusType === "para" && unit.type === "전기") {
    return false;
  }

  if (statusType === "poison" && (unit.type === "독" || unit.type === "강철")) {
    return false;
  }

  if (statusType === "ice" && unit.type === "얼음") {
    return false;
  }

  unit.status = statusType;
  unit.statusTurns = 0;

  return true;
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
  if (p._statusGuardTurns > 0) {
    p._statusGuardTurns -= 1;

    if (p._statusGuardTurns === 0) {
      log(game, `${p.name}의 신비의부적 효과가 사라졌다.`);
    }
  }
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
  // 새 턴 행동 카운터 초기화
  p._productiveActionsThisTurn = 0;

  // 첫 턴 선공자만 드로우 스킵
  if (!(side === game.firstSide && game.turnCount === 1)) {
    if (side === "enemy" && game.trainer?.stableDeck) {
      drawStableCard(game, side);
    } else {
      drawCard(game, side);
    }
  }
}

export function endTurn(game) {
  const side = game.turn;
  const p = game.players[side];

  // ============================================================
  // 성도 stableDeck - 실제 벽돌 턴 판정
  // ============================================================

  if (side === "enemy" && game.trainer?.stableDeck) {
    const didSomething = (p._productiveActionsThisTurn || 0) > 0;

    // 지금도 낼 카드가 남아있었는지
    const hasPlayableCard = p.hand.some((_, index) =>
      canPlayCard(game, side, index),
    );

    // 공격 가능한 포켓몬이
    // 남아있었는지
    const hasReadyAttacker = p.field.some((u) => canAttack(game, side, u.uid));

    // 실제로:
    //
    // 카드도 못 냈고
    // 공격도 못 했고
    // 사용 가능한 선택지도 없었던 경우만
    // "벽돌 턴" 인정
    if (!didSomething && !hasPlayableCard && !hasReadyAttacker) {
      p._brickTurns = (p._brickTurns || 0) + 1;
    } else {
      p._brickTurns = 0;
    }
  }

  // 럭키 치유의마음: 턴 종료 시 아군 전체 1 회복
  p.field.forEach((u) => {
    if (u.ability === "regenerator" && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + 1);
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
    if (u.item === "lifeorb" && !hasAbility(u, "rockhead")) {
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
    // 멸망의노래
    if (u._perishCount != null) {
      u._perishCount -= 1;

      if (u._perishCount <= 0) {
        u.hp = 0;

        log(game, `${u.name}의 멸망 카운트가 0! 기절했다!`);
      } else {
        log(game, `${u.name}의 멸망 카운트: ${u._perishCount}`);
      }
    }
    // 유빈의 팬텀 - 저주
    if (u._mortyCurse && u.hp > 0) {
      applyDamage(game, u, 1, null, true);

      log(game, `${u.name}은(는) 저주로 피해 1!`);
    }
    if (
      u.ability === "misty_miraclestar" &&
      game.weather === "rain" &&
      u.hp < u.maxHp
    ) {
      u.hp = Math.min(u.maxHp, u.hp + 1);

      log(game, `${u.name}의 물의파동! 체력을 1 회복했다.`);
    }

    // 가속
    if (hasAbility(u, "speedboost") && (u._speedBoostStacks || 0) < 3) {
      u._speedBoostStacks = (u._speedBoostStacks || 0) + 1;

      u.atk += 1;

      log(game, `${u.name}의 가속! 공격력 +1!`);
    }

    // 젖은접시
    if (
      hasAbility(u, "raindish") &&
      game.weather === "rain" &&
      u.hp < u.maxHp
    ) {
      const before = u.hp;

      u.hp = Math.min(u.maxHp, u.hp + 1);

      if (u.hp > before) {
        log(game, `${u.name}의 젖은접시! 체력을 1 회복했다!`);
      }
    }

    // 아로마테라피
    if (hasAbility(u, "aromatherapy")) {
      const target = p.field.find((ally) => ally.hp > 0 && ally.status);

      if (target) {
        target.status = null;
        target.statusTurns = 0;

        log(
          game,
          `${u.name}의 아로마테라피! ${target.name}의 상태이상이 회복됐다!`,
        );
      }
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
export function effectiveCost(card, game, side = null) {
  let cost = card.cost;

  if (game.weather === "sun") {
    if (card.ability === "chlorophyll") {
      cost -= 1;
    }

    if (card.id === "solarbeam") {
      cost -= 2;
    }
  }

  // 테오키스 노말폼 - 프레셔
  if (side && card.type === "기술") {
    const foe = game.players[other(side)];

    const pressureCount = foe.field.filter(
      (u) => u.hp > 0 && hasAbility(u, "pressure"),
    ).length;

    cost += pressureCount;
  }

  return Math.max(0, cost);
}

export function effectiveAtk(unit, game) {
  let atk = unit.atk;

  if (
    PINCH_ABILITIES.some((ability) => hasAbility(unit, ability)) &&
    unit.hp <= Math.ceil(unit.maxHp / 2)
  ) {
    atk += 2;
  }

  // 테크니션
  if (hasAbility(unit, "technician") && unit.atk <= 3) {
    atk += 2;
  }

  // 단단한발톱
  if (hasAbility(unit, "toughclaws")) {
    atk += 2;
  }

  // 페어리스킨
  if (hasAbility(unit, "pixilate")) {
    atk += 1;
  }

  // 메가마기라스
  if (game.weather === "sand" && hasAbility(unit, "sandforce")) {
    atk += 2;
  }

  // 천하장사
  if (hasAbility(unit, "hugepower")) {
    atk *= 2;
  }

  // 화상
  if (unit.status === "burn") {
    atk = Math.max(0, Math.floor(atk / 2));
  }

  if (game.weather === "rain" && unit.type === "물") {
    atk += 1;
  }

  if (game.weather === "sun" && unit.type === "불꽃") {
    atk += 1;
  }

  if (game.weather === "sun" && hasAbility(unit, "solarpower")) {
    atk += 2;
  }

  if (game.weather === "rain" && hasAbility(unit, "misty_miraclestar")) {
    atk += 2;
  }

  if (hasAbility(unit, "fortress")) {
    return unit.hp;
  }

  const owner = game.players[unit.side];

  if (owner) {
    owner.field.forEach((u) => {
      if (u.uid !== unit.uid && AURA_TYPES[u.ability] === unit.type) {
        atk += 1;
      }
    });
  }

  return Math.max(0, atk);
}

function effectiveAttackType(unit) {
  return hasAbility(unit, "pixilate") ? "페어리" : unit.type;
}

export function typeMult(attackType, defendType) {
  const row = TYPE_CHART[attackType];
  if (!row) return 1;
  const m = row[defendType];
  return m === undefined ? 1 : m;
}

export function calcTypedDamage(base, attackType, defendType) {
  if (base <= 0) return 0;

  const m = typeMult(attackType, defendType);

  // 타입 무효는 진짜 0
  if (m === 0) return 0;

  if (m > 1) {
    return Math.ceil(base * m);
  }

  // 반감은 최소 1
  if (m < 1) {
    return Math.max(1, Math.floor(base * m));
  }

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
      const actualDamage = Math.abs(diff);

      recordImpact(game, {
        type: "damage",
        side: unit.side,
        targetUid: unit.uid,
        amount: actualDamage,
      });

      // 꼭두의 밀탱크 - 구르기
      // 피해를 받으면 누적 초기화
      if (
        hasAbility(unit, "whitney_rollout") &&
        (unit._rolloutStacks || 0) > 0
      ) {
        unit._rolloutStacks = 0;

        log(game, `${unit.name}의 구르기 연속이 끊겼다!`);
      }

      // 규리의 강철톤 - 바디퍼지
      // 피해를 받을 때마다 공격력 +1
      // 최대 +3
      if (
        hasAbility(unit, "jasmine_autotomize") &&
        unit.hp > 0 &&
        (unit._autotomizeStacks || 0) < 3
      ) {
        unit._autotomizeStacks = (unit._autotomizeStacks || 0) + 1;

        unit.atk += 1;

        log(game, `${unit.name}의 바디퍼지! 공격력 +1!`);
      }
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

  // ============================================================
  // v6 신규 방어 특성
  // ============================================================

  // 불가사의부적
  // 약점 타입의 직접 피해만 통과
  if (!typedIgnore && sourceType && hasAbility(unit, "wonderguard")) {
    const mult = typeMultAgainstUnit(sourceType, unit);

    if (mult <= 1) {
      log(game, `${unit.name}의 불가사의부적! 공격이 통하지 않았다!`);

      return finishImpact(0);
    }
  }

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
  if (!typedIgnore && sourceType === "땅" && hasAbility(unit, "levitate")) {
    log(game, `${unit.name}은(는) 부유로 피해를 받지 않았다!`);

    return finishImpact(0);
  }

  // 타오르는불꽃
  if (!typedIgnore && sourceType === "불꽃" && hasAbility(unit, "flashfire")) {
    log(game, `${unit.name}의 타오르는불꽃! 불꽃 피해를 받지 않는다!`);

    return finishImpact(0);
  }

  // 축전
  if (!typedIgnore && sourceType === "전기" && hasAbility(unit, "voltabsorb")) {
    const heal = Math.min(1, unit.maxHp - unit.hp);

    unit.hp += heal;

    log(game, `${unit.name}의 축전! 전기를 흡수해 체력을 회복했다!`);

    return finishImpact(0);
  }

  // 저수
  if (!typedIgnore && sourceType === "물" && hasAbility(unit, "waterabsorb")) {
    const heal = Math.min(1, unit.maxHp - unit.hp);

    unit.hp += heal;

    log(game, `${unit.name}의 저수! 물을 흡수해 체력을 회복했다!`);

    return finishImpact(0);
  }

  // 두꺼운지방
  if (
    !typedIgnore &&
    (sourceType === "불꽃" || sourceType === "얼음") &&
    hasAbility(unit, "thickfat")
  ) {
    dmg = Math.max(0, dmg - 1);

    if (dmg < amount) {
      log(game, `${unit.name}의 두꺼운지방으로 피해가 줄었다!`);
    }
  }

  // 모래숨기
  if (!typedIgnore && game.weather === "sand" && hasAbility(unit, "sandveil")) {
    dmg = Math.max(0, dmg - 1);

    if (dmg < amount) {
      log(game, `${unit.name}이(가) 모래숨기로 공격을 흘렸다!`);
    }
  }

  // 멀티스케일
  if (
    (hasAbility(unit, "multiscale") || hasAbility(unit, "aeroblast")) &&
    unit.hp === unit.maxHp &&
    dmg > 1
  ) {
    dmg = Math.ceil(dmg / 2);

    log(game, `${unit.name}의 멀티스케일! 피해가 절반이 됐다!`);
  }

  // 조가비갑옷
  if (!typedIgnore && hasAbility(unit, "shellarmor") && dmg > 4) {
    dmg = 4;

    log(game, `${unit.name}의 조가비갑옷! 피해를 4로 줄였다!`);
  }

  // 이상한비늘
  if (unit.status && hasAbility(unit, "marvelscale")) {
    const before = dmg;

    dmg = Math.max(0, dmg - 2);

    if (dmg < before) {
      log(game, `${unit.name}의 이상한비늘! 피해가 2 줄었다!`);
    }
  }

  // 필터
  if (
    !typedIgnore &&
    sourceType &&
    hasAbility(unit, "filter") &&
    typeMultAgainstUnit(sourceType, unit) > 1
  ) {
    const before = dmg;

    dmg = Math.max(0, dmg - 2);

    if (dmg < before) {
      log(game, `${unit.name}의 필터! 약점 피해가 2 줄었다!`);
    }
  }

  // 테오키스 디펜스폼
  if (hasAbility(unit, "deoxys_defense")) {
    const before = dmg;

    dmg = Math.max(0, dmg - 2);

    if (dmg < before) {
      log(game, `${unit.name}의 디펜스폼! 피해가 2 줄었다!`);
    }
  }

  if (dmg <= 0) {
    return finishImpact(0);
  }

  // 따라큐 탈
  if (hasAbility(unit, "disguise") && !unit.sturdyUsed) {
    unit.hp -= 1;
    unit.sturdyUsed = true;

    log(game, `${unit.name}의 탈! 공격을 막고 피해를 1만 받았다!`);

    return finishImpact(1);
  }

  // 옹골참
  if (
    hasAbility(unit, "sturdy") &&
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

  // 켈리몬 - 변색
  if (
    !typedIgnore &&
    sourceType &&
    unit.hp > 0 &&
    hasAbility(unit, "colorchange") &&
    unit.type !== sourceType
  ) {
    unit.type = sourceType;

    log(game, `${unit.name}의 변색! ${sourceType} 타입으로 변했다!`);
  }

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
        if (hasAbility(u, "explode")) {
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
    baseAtk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    rarity: card.rarity,
    emoji: card.emoji,
    ability: card.ability || null,
    secondaryAbility: card.secondaryAbility || null,
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

const DEOXYS_FORMS = {
  normal: {
    label: "노말폼",
    atk: 8,
    hp: 8,
    ability: "pressure",
  },

  attack: {
    label: "어택폼",
    atk: 10,
    hp: 4,
    ability: "deoxys_attack",
  },

  defense: {
    label: "디펜스폼",
    atk: 4,
    hp: 12,
    ability: "deoxys_defense",
  },

  speed: {
    label: "스피드폼",
    atk: 5,
    hp: 9,
    ability: "deoxys_speed",
  },
};

function applyDeoxysForm(game, unit, form) {
  const data = DEOXYS_FORMS[form];

  if (!unit || unit.cardId !== "deoxys" || !data) {
    return false;
  }

  unit.deoxysForm = form;

  unit.name = `테오키스 (${data.label})`;

  unit.type = "에스퍼";

  unit.atk = data.atk;
  unit.baseAtk = data.atk;

  unit.hp = data.hp;
  unit.maxHp = data.hp;

  unit.ability = data.ability;

  unit.secondaryAbility = null;

  // 어택폼
  if (form === "attack") {
    unit.canAttack = true;

    unit._deoxysAttackUsed = false;
  }

  // 스피드폼
  if (form === "speed") {
    unit.canAttack = true;

    unit.extraUsed = false;
  }

  log(game, `${unit.name}(으)로 폼체인지했다!`);

  return true;
}

export function resolveDeoxysForm(game, side, form) {
  const pending = game.pendingDeoxysForm;

  if (!pending || pending.side !== side) {
    return false;
  }

  if (!DEOXYS_FORMS[form]) {
    return false;
  }

  const unit = game.players[side].field.find((u) => u.uid === pending.uid);

  if (!unit) {
    game.pendingDeoxysForm = null;

    return false;
  }

  const result = applyDeoxysForm(game, unit, form);

  if (result) {
    game.pendingDeoxysForm = null;
  }

  return result;
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
        setWeather(game, null);
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
      setWeather(game, "rain");
      foe.field.forEach((u) => applyDamage(game, u, 2, "물"));
      log(
        game,
        `${unit.name}의 근원의바다! 폭우와 함께 적 전체에게 물 피해 2!`,
      );
      cleanupDeaths(game);
      break;
    case "desolateland":
      setWeather(game, "sun");
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
        const lowered = lowerAttack(game, t, 2, "위협");

        if (lowered > 0) {
          log(game, `${unit.name}의 위협! ${t.name}의 공격력이 -${lowered}!`);
        }
      }
      break;
    }
    case "drizzle":
      setWeather(game, "rain");
      log(game, `${unit.name}의 잔비! 비가 내리기 시작했다!`);
      break;
    case "drought":
      setWeather(game, "sun");
      log(game, `${unit.name}의 가뭄! 햇살이 강해졌다!`);
      break;
    case "sandstream":
      setWeather(game, "sand");
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
      setWeather(game, "rain");
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
      setWeather(game, "sun");
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
      setWeather(game, null);
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
        const lowered = lowerAttack(game, t, 2, "사이코커터");

        if (lowered > 0) {
          log(
            game,
            `${unit.name}의 사이코커터! ${t.name}의 공격력이 -${lowered}!`,
          );
        }
      }

      break;
    }

    case "erika_flowerdance":
      setWeather(game, "sun");

      log(game, `${unit.name}의 그래스필드! 햇살이 강해졌다!`);

      break;

    case "janine_toxicdust": {
      const targets = foe.field.filter((u) => u.hp > 0);

      const t = [...targets].sort(
        (a, b) => effectiveAtk(b, game) - effectiveAtk(a, game),
      )[0];

      if (t) {
        applyStatus(game, t, "poison");

        const lowered = lowerAttack(game, t, 1, "독가루");

        if (lowered > 0) {
          log(
            game,
            `${unit.name}의 독가루! ${t.name}은(는) 독 상태, 공격력 -${lowered}!`,
          );
        }
      }

      break;
    }

    case "misty_miraclestar":
      setWeather(game, "rain");

      log(game, `${unit.name}의 물의파동! 비가 내리기 시작했다!`);

      break;

    case "blaine_eruption":
      setWeather(game, "sun");

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

    case "morty_curse": {
      const targets = foe.field.filter((u) => u.hp > 0);

      const t = [...targets].sort(
        (a, b) => effectiveAtk(b, game) - effectiveAtk(a, game),
      )[0];

      if (t) {
        t._mortyCurse = true;

        log(game, `${unit.name}의 저주! ${t.name}에게 저주를 걸었다!`);
      }

      break;
    }

    case "lance_thunder": {
      const targets = foe.field.filter((u) => u.hp > 0);

      const t = [...targets].sort(
        (a, b) => effectiveAtk(b, game) - effectiveAtk(a, game),
      )[0];

      if (t) {
        applyDamage(game, t, 2, "전기");

        if (t.hp > 0) {
          applyStatus(game, t, "para");
        }

        log(game, `${unit.name}의 번개! ${t.name}에게 전기 피해 2 + 마비!`);
      }

      break;
    }

    case "lance_extremespeed": {
      // 소환된 턴 즉시 공격 가능
      unit.canAttack = true;

      // 첫 공격의 반격 방지용
      unit._extremeSpeedGuardUsed = false;

      log(game, `${unit.name}의 신속! 소환된 턴에도 바로 공격할 수 있다!`);

      break;
    }

    // ============================================================
    // v6 신규 등장 특성
    // ============================================================

    case "pickup": {
      if (me.hand.length >= MAX_HAND) {
        log(game, `${unit.name}의 픽업! 손패가 가득 차 있다.`);

        break;
      }

      const candidates = me.deck
        .map((cardId, index) => ({
          cardId,
          index,
          card: CARD_MAP[cardId],
        }))
        .filter(
          (x) => x.card && x.card.type === "도구" && x.card.kind !== "mega",
        );

      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];

        me.deck.splice(pick.index, 1);

        me.hand.push({
          uid: nextUid(),
          cardId: pick.cardId,
        });

        log(game, `${unit.name}의 픽업! ${pick.card.name}을(를) 주워왔다!`);
      } else {
        log(game, `${unit.name}의 픽업! 주울 도구가 없었다.`);
      }

      break;
    }

    case "webtrap": {
      const targets = foe.field.filter((u) => u.hp > 0);

      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];

        lowerAttack(game, t, 1, "거미집");

        applyStatus(game, t, "poison", unit);

        log(game, `${unit.name}의 거미집! ${t.name}의 공격력 -1 + 독!`);
      }

      break;
    }

    case "lusterpurge": {
      const targets = foe.field.filter((u) => u.hp > 0);

      const t = [...targets].sort(
        (a, b) => effectiveAtk(b, game) - effectiveAtk(a, game),
      )[0];

      if (t) {
        const dmg = calcTypedDamageAgainstUnit(4, "에스퍼", t);

        applyDamage(game, t, dmg, "에스퍼");

        if (t.hp > 0) {
          lowerAttack(game, t, 1, "라스터퍼지");
        }

        log(game, `${unit.name}의 라스터퍼지! ${t.name}에게 에스퍼 피해!`);

        cleanupDeaths(game);
      }

      break;
    }

    case "wishmaker": {
      me.field.forEach((ally) => {
        ally.hp = Math.min(ally.maxHp, ally.hp + 2);
      });

      drawCard(game, side);

      log(game, `${unit.name}의 소원메이커! 아군 전체 회복 + 카드 1장 드로우!`);

      break;
    }

    case "formchange": {
      // AI는 알아서 하나 선택
      if (side === "enemy") {
        const forms = ["normal", "attack", "defense", "speed"];

        const form = forms[Math.floor(Math.random() * forms.length)];

        applyDeoxysForm(game, unit, form);
      } else {
        // 플레이어는 Battle.jsx에서 선택
        game.pendingDeoxysForm = {
          side,
          uid: unit.uid,
        };

        log(game, `${unit.name}의 폼체인지! 폼을 선택하세요.`);
      }

      break;
    }

    default:
      break;
  }
  // 캐스퐁 타입 동기화
  refreshForecastUnit(game, unit);

  // 쓱쓱
  if (hasAbility(unit, "swiftswim") && game.weather === "rain") {
    unit.canAttack = true;

    log(game, `${unit.name}은(는) 쓱쓱으로 바로 움직일 수 있다!`);
  }

  // 돌진
  if (hasAbility(unit, "rush")) {
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
  if (effectiveCost(card, game, side) > p.mana) return false;
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
    if (t === "enemy-pokemon") {
      return game.players[other(side)].field.length > 0;
    }
    if (t === "friendly-pokemon") return p.field.length > 0;
    return true;
  }
  return true;
}

// 카드 사용 이벤트 기록 (UI 연출용)
function markPlay(game, side, card, extra = null) {
  markProductiveAction(game, side);

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
  const cost = effectiveCost(card, game, side);

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
    base.baseAtk = card.atk;
    base.maxHp = card.hp;
    base.hp = Math.max(1, card.hp - damageTaken);
    base.rarity = card.rarity;
    base.emoji = card.emoji;
    base.ability = card.ability || null;
    base.secondaryAbility = card.secondaryAbility || null;
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

    if (!base || base.mega || p.megaUsed) {
      return false;
    }

    p.mana -= cost;

    p.hand.splice(handIdx, 1);

    p.megaUsed = true;

    base.mega = true;

    base.name = `메가 ${base.name}`;

    base.atk += card.mega.atk;

    base.maxHp += card.mega.hp;

    base.hp += card.mega.hp;

    base.ability = card.mega.ability || base.ability;

    base.secondaryAbility = card.mega.secondaryAbility || null;

    if (card.mega.type) {
      base.type = card.mega.type;
    }

    // 흑안개가 메가진화 스탯으로 복구하도록
    base.baseAtk = base.atk;

    // Card.jsx에서 사용할 메가 폼
    base.megaSpriteId = card.megaSpriteId || null;

    log(game, `${base.name}(으)로 메가진화했다!!`);

    // 날씨 발동
    if (card.mega.battlecryWeather) {
      setWeather(game, card.mega.battlecryWeather);

      const weatherName = WEATHER_NAME[card.mega.battlecryWeather];

      log(game, `${base.name}의 힘으로 ${weatherName} 날씨가 됐다!`);
    }

    // 팬텀 등 기존 전투의함성 재발동
    if (card.mega.reBattlecry) {
      runBattlecry(game, side, base);
    }

    // 갸라도스 / 썬더볼트
    if (card.mega.reIntimidate) {
      const foes = game.players[other(side)].field.filter((u) => u.hp > 0);

      if (foes.length) {
        const t = foes[Math.floor(Math.random() * foes.length)];

        const lowered = lowerAttack(game, t, 2, "위협");

        if (lowered > 0) {
          log(game, `위협 재발동! ${t.name}의 공격력 -${lowered}!`);
        }
      }
    }

    // 메가후딘 - 트레이스
    if (hasAbility(base, "trace")) {
      const candidates = game.players[other(side)].field.filter(
        (u) => u.hp > 0 && u.ability,
      );

      if (candidates.length) {
        const copied =
          candidates[Math.floor(Math.random() * candidates.length)];

        base.ability = copied.ability;

        log(game, `${base.name}의 트레이스! ${copied.name}의 특성을 복사했다!`);
      }
    }

    // 메가다크펫
    if (card.mega.curseStrongest) {
      const targets = game.players[other(side)].field.filter((u) => u.hp > 0);

      const t = [...targets].sort(
        (a, b) => effectiveAtk(b, game) - effectiveAtk(a, game),
      )[0];

      if (t) {
        t._mortyCurse = true;

        log(game, `${base.name}의 저주! ${t.name}에게 저주를 걸었다!`);
      }
    }

    // 쓱쓱
    if (hasAbility(base, "swiftswim") && game.weather === "rain") {
      base.canAttack = true;

      log(game, `${base.name}의 쓱쓱! 바로 공격할 수 있다!`);
    }

    markPlay(game, side, card, {
      anim: "mega",
      uid: base.uid,
    });

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

      setWeather(game, s.weather);

      log(
        game,
        `${p.name}이(가) ${card.name}을(를) 사용했다! ${WEATHER_NAME[s.weather]}!`,
      );

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

    // ============================================================
    // v6 신규 기술
    // ============================================================

    // ---------- 일격기 ----------
    if (s.effect === "execute") {
      if (!target || target.uid === "hero") {
        return false;
      }

      const u = foe.field.find((x) => x.uid === target.uid);

      if (!u) {
        return false;
      }

      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      const before = u.hp;

      u.hp = 0;

      recordImpact(game, {
        type: "damage",
        side: other(side),
        targetUid: u.uid,
        amount: before,
      });

      log(game, `${card.name}! ${u.name}이(가) 일격에 쓰러졌다!`);

      cleanupDeaths(game);

      markPlay(game, side, card);

      return true;
    }

    // ---------- 단일 피해 + 상태이상 ----------
    if (s.effect === "damage_status") {
      if (!target || target.uid === "hero") {
        return false;
      }

      const u = foe.field.find((x) => x.uid === target.uid);

      if (!u) {
        return false;
      }

      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      const base = spellDamageAmount(card, game);

      const dmg = calcTypedDamageAgainstUnit(base, card.moveType, u);

      const dealt = applyDamage(game, u, dmg, card.moveType);

      if (u.hp > 0 && Math.random() < (s.chance ?? 1)) {
        applyStatus(game, u, s.status);
      }

      log(game, `${card.name}! ${u.name}에게 피해 ${dealt}!`);

      cleanupDeaths(game);

      markPlay(game, side, card);

      return true;
    }

    // ---------- 광역 피해 + 상태이상 ----------
    if (s.effect === "aoe_status") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      const base = spellDamageAmount(card, game);

      foe.field.forEach((u) => {
        const dmg = calcTypedDamageAgainstUnit(base, card.moveType, u);

        applyDamage(game, u, dmg, card.moveType);

        if (u.hp > 0 && Math.random() < (s.chance ?? 1)) {
          applyStatus(game, u, s.status);
        }
      });

      log(game, `${card.name}! 상대 전체를 공격했다!`);

      cleanupDeaths(game);

      markPlay(game, side, card);

      return true;
    }

    // ---------- 용성군 ----------
    if (s.effect === "aoe_self_debuff") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      const base = spellDamageAmount(card, game);

      foe.field.forEach((u) => {
        const dmg = calcTypedDamageAgainstUnit(base, card.moveType, u);

        applyDamage(game, u, dmg, card.moveType);
      });

      p.field.forEach((u) => {
        u.atk = Math.max(0, u.atk + (s.selfAtkDelta || 0));
      });

      log(game, `${card.name}! 상대 전체 공격 후 내 포켓몬 공격력 -1!`);

      cleanupDeaths(game);

      markPlay(game, side, card);

      return true;
    }

    // ---------- 대폭발 ----------
    if (s.effect === "all_field_damage") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      ["player", "enemy"].forEach((fieldSide) => {
        game.players[fieldSide].field.forEach((u) => {
          applyDamage(game, u, s.amount, null, true);
        });
      });

      log(game, `${card.name}! 양쪽 필드 전체에 피해 ${s.amount}!`);

      cleanupDeaths(game);

      markPlay(game, side, card);

      return true;
    }

    // ---------- 멸망의노래 ----------
    if (s.effect === "perish_song") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      ["player", "enemy"].forEach((fieldSide) => {
        game.players[fieldSide].field.forEach((u) => {
          u._perishCount = s.countdown || 2;
        });
      });

      log(game, `${card.name}! 필드의 모든 포켓몬에게 멸망 카운트가 시작됐다!`);

      markPlay(game, side, card);

      return true;
    }

    // ---------- 상태이상 기술 ----------
    if (s.effect === "apply_status") {
      if (!target || target.uid === "hero") {
        return false;
      }

      const u = foe.field.find((x) => x.uid === target.uid);

      if (!u) {
        return false;
      }

      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      const applied = applyStatus(game, u, s.status);

      if (applied && s.immediateDamage) {
        applyDamage(game, u, s.immediateDamage, null, true);
      }

      if (applied) {
        log(game, `${card.name}! ${u.name}에게 상태이상을 걸었다!`);
      } else {
        log(game, `${card.name}! 하지만 효과가 없었다!`);
      }

      cleanupDeaths(game);

      markPlay(game, side, card);

      return true;
    }

    // ---------- 울부짖기 ----------
    if (s.effect === "bounce_enemy") {
      if (!target || target.uid === "hero") {
        return false;
      }

      if (foe.hand.length >= MAX_HAND) {
        return false;
      }

      const index = foe.field.findIndex((u) => u.uid === target.uid);

      if (index === -1) {
        return false;
      }

      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      const [u] = foe.field.splice(index, 1);

      foe.hand.push({
        uid: nextUid(),
        cardId: u.cardId,
      });

      log(game, `${card.name}! ${u.name}을(를) 손으로 되돌렸다!`);

      markPlay(game, side, card);

      return true;
    }

    // ---------- 신비의부적 ----------
    if (s.effect === "team_status_guard") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      p._statusGuardTurns = s.turns || 2;

      log(
        game,
        `${card.name}! ${p.name}의 포켓몬이 상태이상으로부터 보호된다!`,
      );

      markPlay(game, side, card);

      return true;
    }

    // ---------- 흑안개 ----------
    if (s.effect === "reset_attack") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);

      ["player", "enemy"].forEach((fieldSide) => {
        game.players[fieldSide].field.forEach((u) => {
          const original = u.baseAtk ?? CARD_MAP[u.cardId]?.atk;

          if (original != null) {
            u.atk = original;
          }
        });
      });

      log(game, `${card.name}! 모든 포켓몬의 공격력 변화가 초기화됐다!`);

      markPlay(game, side, card);

      return true;
    }

    if (s.effect === "aoe") {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      const base = spellDamageAmount(card, game);
      log(game, `${card.name}! 적 전체 공격!`);
      foe.field.forEach((u) => {
        const dmg = calcTypedDamageAgainstUnit(base, card.moveType, u);

        const mult = typeMultAgainstUnit(card.moveType, u);
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
          const dmg = calcTypedDamageAgainstUnit(base, card.moveType, u);

          const mult = typeMultAgainstUnit(card.moveType, u);
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
  const noguard = attacker && hasAbility(attacker, "noguard");
  const taunts = noguard
    ? []
    : foe.field.filter(
        (u) =>
          (hasAbility(u, "taunt") ||
            hasAbility(u, "deoxys_defense") ||
            hasAbility(u, "fortress") ||
            hasAbility(u, "brock_rockwall") ||
            hasAbility(u, "jasmine_autotomize")) &&
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
  const poke = me.deck
    .map((cardId, index) => ({ cardId, index }))
    .filter(({ cardId }) => CARD_MAP[cardId]?.kind === "pokemon");

  if (poke.length && me.hand.length < MAX_HAND) {
    const pick = poke[Math.floor(Math.random() * poke.length)];

    me.deck.splice(pick.index, 1);
    me.hand.push({
      uid: nextUid(),
      cardId: pick.cardId,
    });

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

function prepareJohtoAttack(game, unit) {
  const result = {
    bonusDamage: 0,
    extremeGuard: false,
  };

  // 꼭두의 밀탱크 - 구르기
  if (hasAbility(unit, "whitney_rollout")) {
    result.bonusDamage = unit._rolloutStacks || 0;

    // 이번 공격이 끝나면
    // 다음 공격은 +1 강해진다.
    unit._rolloutStacks = (unit._rolloutStacks || 0) + 1;

    if (result.bonusDamage > 0) {
      log(game, `${unit.name}의 구르기! 추가 피해 +${result.bonusDamage}!`);
    }
  }

  // 목호의 망나뇽 - 역린
  if (hasAbility(unit, "lance_outrage")) {
    unit.atk += 2;

    log(game, `${unit.name}의 역린! 공격력 +2!`);
  }

  // 목호의 망나뇽 - 신속
  if (
    hasAbility(unit, "lance_extremespeed") &&
    unit.summonedTurn === game.turnCount &&
    !unit._extremeSpeedGuardUsed
  ) {
    result.extremeGuard = true;

    // 첫 공격에 바로 소모
    unit._extremeSpeedGuardUsed = true;
  }

  return result;
}

function finishJohtoAttack(game, unit, foe) {
  if (!unit || unit.hp <= 0) {
    return;
  }

  // 비상의 피죤 - 날개쉬기
  if (hasAbility(unit, "falkner_roost")) {
    if (unit.hp >= unit.maxHp) {
      unit.atk += 1;

      log(game, `${unit.name}의 날개쉬기! 체력이 가득 차 있어 공격력 +1!`);
    } else {
      const before = unit.hp;

      unit.hp = Math.min(unit.maxHp, unit.hp + 1);

      const healed = unit.hp - before;

      if (healed > 0) {
        recordImpact(game, {
          type: "heal",
          side: unit.side,
          targetUid: unit.uid,
          amount: healed,
        });
      }

      log(game, `${unit.name}의 날개쉬기! 체력 ${healed} 회복!`);
    }
  }

  // 호일의 스라크 - 연속자르기
  if (
    hasAbility(unit, "bugsy_furycutter") &&
    (unit._furyCutterStacks || 0) < 3
  ) {
    unit._furyCutterStacks = (unit._furyCutterStacks || 0) + 1;

    unit.atk += 1;

    log(game, `${unit.name}의 연속자르기! 공격력 +1!`);
  }

  // 이향의 킹드라 - 용의파동
  if (hasAbility(unit, "clair_dragonpulse") && foe.hp > 0) {
    foe.hp -= 1;

    recordImpact(game, {
      type: "damage",
      side: other(unit.side),
      targetUid: "hero",
      amount: 1,
    });

    log(game, `${unit.name}의 용의파동! 상대 트레이너에게 피해 1!`);
  }

  // 목호의 망나뇽 - 역린 반동
  if (hasAbility(unit, "lance_outrage") && unit.hp > 0) {
    applyDamage(game, unit, 1, null, true);

    log(game, `${unit.name}의 역린 반동! 피해 1!`);
  }
}

function prepareExpansionAttack(game, unit) {
  const result = {
    bonusDamage: 0,
    noCounter: false,
  };

  // 테오키스 어택폼
  if (hasAbility(unit, "deoxys_attack") && !unit._deoxysAttackUsed) {
    result.bonusDamage = 5;

    result.noCounter = true;

    unit._deoxysAttackUsed = true;

    unit._deoxysAttackDebuffPending = true;

    log(game, `${unit.name}의 사이코부스트! 첫 공격 피해 +5!`);
  }

  return result;
}

function finishExpansionAttack(game, unit) {
  if (unit?._deoxysAttackDebuffPending) {
    unit._deoxysAttackDebuffPending = false;

    unit.atk = Math.max(0, unit.atk - 3);

    log(game, `${unit.name}의 사이코부스트 반동! 공격력 -3!`);
  }
}

function spendAttack(game, unit) {
  const canDouble =
    hasAbility(unit, "skilllink") ||
    hasAbility(unit, "blue_hurricane") ||
    hasAbility(unit, "deoxys_speed");

  if (canDouble && !unit.extraUsed) {
    unit.extraUsed = true;

    if (hasAbility(unit, "deoxys_speed")) {
      log(game, `${unit.name}의 스피드폼! 한 번 더 공격할 수 있다!`);
    } else if (hasAbility(unit, "blue_hurricane")) {
      log(game, `${unit.name}의 폭풍! 한 번 더 공격할 수 있다!`);
    } else {
      log(game, `${unit.name}의 스킬링크! 한 번 더 공격할 수 있다!`);
    }
  } else {
    unit.canAttack = false;

    if (hasAbility(unit, "truant")) {
      unit.resting = true;
    }
  }

  // 레드 피카츄 반동
  if (hasAbility(unit, "red_volttackle") && !hasAbility(unit, "rockhead")) {
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

    const johto = prepareJohtoAttack(game, atkUnit);

    const expansion = prepareExpansionAttack(game, atkUnit);

    let dmg =
      effectiveAtk(atkUnit, game) + johto.bonusDamage + expansion.bonusDamage;

    foe.hp -= dmg;

    recordImpact(game, {
      type: "damage",
      side: other(side),
      targetUid: "hero",
      amount: dmg,
    });

    // 메가캥카 - 부자유친
    if (hasAbility(atkUnit, "parentalbond") && foe.hp > 0) {
      foe.hp -= 2;

      recordImpact(game, {
        type: "damage",
        side: other(side),
        targetUid: "hero",
        amount: 2,
      });

      log(game, `${atkUnit.name}의 부자유친! 추가 피해 2!`);
    }

    spendAttack(game, atkUnit);

    finishJohtoAttack(game, atkUnit, foe);

    finishExpansionAttack(game, atkUnit);

    markProductiveAction(game, side);

    log(
      game,
      `${atkUnit.name}이(가) ${foe.name}을(를) 직접 공격! 피해 ${dmg}!`,
    );

    cleanupDeaths(game);

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

  const johto = prepareJohtoAttack(game, atkUnit);

  const expansion = prepareExpansionAttack(game, atkUnit);

  const attackType = effectiveAttackType(atkUnit);

  const defenseAttackType = effectiveAttackType(defUnit);

  const atkDmgBase = effectiveAtk(atkUnit, game);

  const defDmgBase = effectiveAtk(defUnit, game);

  const bigChanceMult = atkUnit.ability === "bigchance" ? 1.5 : 1;

  // 이향의 용의파동까지 반영한
  // 실제 상성 계산
  let atkDmg = Math.ceil(
    calcTypedDamageAgainstUnit(atkDmgBase, attackType, defUnit) * bigChanceMult,
  );

  // 구르기 누적
  if (atkDmg > 0) {
    atkDmg += johto.bonusDamage;

    atkDmg += expansion.bonusDamage;

    // 우격다짐
    if (hasAbility(atkUnit, "sheerforce") && !defUnit.status) {
      atkDmg += 1;

      log(game, `${atkUnit.name}의 우격다짐! 피해 +1!`);
    }

    // 적응력
    if (
      hasAbility(atkUnit, "adaptability") &&
      typeMultAgainstUnit(attackType, defUnit) > 1
    ) {
      atkDmg += 2;

      log(game, `${atkUnit.name}의 적응력! 약점 피해 +2!`);
    }
  }

  // 류옹의 맘모꾸리 - 얼음뭉치
  if (
    atkDmg > 0 &&
    hasAbility(atkUnit, "pryce_iceshard") &&
    defUnit.status === "ice"
  ) {
    atkDmg += 2;

    log(
      game,
      `${atkUnit.name}의 얼음뭉치! 얼어 있는 ${defUnit.name}에게 추가 피해 2!`,
    );
  }

  let defDmg = calcTypedDamageAgainstUnit(
    defDmgBase,
    defenseAttackType,
    atkUnit,
  );

  // 첫 공격에서는 일반 전투 반격만 무효
  if (johto.extremeGuard || expansion.noCounter) {
    defDmg = 0;

    if (expansion.noCounter) {
      log(game, `${atkUnit.name}의 어택폼! 첫 공격의 반격을 받지 않는다!`);
    } else {
      log(game, `${atkUnit.name}의 신속! 첫 공격의 반격 피해를 받지 않는다!`);
    }
  }

  if (atkUnit.ability === "bigchance" && atkDmgBase > 0)
    log(game, `${atkUnit.name}의 대운! 피해가 1.5배!`);

  const mult = typeMultAgainstUnit(attackType, defUnit);
  const defenderHpBefore = defUnit.hp;

  applyDamage(game, defUnit, atkDmg, attackType);

  const damageDealt = Math.max(0, defenderHpBefore - defUnit.hp);

  // 신속이면 일반 반격 생략
  if (!johto.extremeGuard && !expansion.noCounter) {
    applyDamage(game, atkUnit, defDmg, defenseAttackType);
  }

  // 마자용 - 카운터
  if (hasAbility(defUnit, "counter") && damageDealt > 0 && atkUnit.hp > 0) {
    const counterDamage = Math.ceil(damageDealt / 2);

    applyDamage(game, atkUnit, counterDamage, null, true);

    log(
      game,
      `${defUnit.name}의 카운터! ${atkUnit.name}에게 피해 ${counterDamage}!`,
    );
  }

  // 포자
  if (
    hasAbility(defUnit, "effectspore") &&
    atkUnit.hp > 0 &&
    Math.random() < 0.3
  ) {
    const statuses = ["poison", "para", "sleep"];

    const status = statuses[Math.floor(Math.random() * statuses.length)];

    if (applyStatus(game, atkUnit, status, defUnit)) {
      log(game, `${defUnit.name}의 포자! ${atkUnit.name}에게 상태이상!`);
    }
  }

  // 저주받은바디
  if (hasAbility(defUnit, "cursedbody") && atkUnit.hp > 0) {
    const lowered = lowerAttack(game, atkUnit, 1, "저주받은바디");

    if (lowered > 0) {
      log(game, `${defUnit.name}의 저주받은바디! ${atkUnit.name}의 공격력 -1!`);
    }
  }

  // 메가캥카 - 부자유친
  if (hasAbility(atkUnit, "parentalbond") && defUnit.hp > 0) {
    applyDamage(game, defUnit, 2, null, true);

    log(game, `${atkUnit.name}의 부자유친! 추가 피해 2!`);
  }

  // 메가거북왕 - 메가런처
  if (hasAbility(atkUnit, "megalauncher")) {
    const index = foe.field.findIndex((u) => u.uid === defUnit.uid);

    const neighbors = [foe.field[index - 1], foe.field[index + 1]].filter(
      (u) => u && u.hp > 0,
    );

    neighbors.forEach((u) => {
      applyDamage(game, u, 1, null, true);
    });

    if (neighbors.length) {
      log(game, `${atkUnit.name}의 메가런처! 양옆 포켓몬에게 피해 1!`);
    }
  }

  // 사도의 강챙이 - 폭발펀치
  if (
    hasAbility(atkUnit, "chuck_dynamicpunch") &&
    damageDealt > 0 &&
    defUnit.hp > 0
  ) {
    const lowered = lowerAttack(game, defUnit, 1, "폭발펀치");

    if (lowered > 0) {
      log(game, `${atkUnit.name}의 폭발펀치! ${defUnit.name}의 공격력 -1!`);
    }
  }

  spendAttack(game, atkUnit);

  finishJohtoAttack(game, atkUnit, foe);

  finishExpansionAttack(game, atkUnit);

  markProductiveAction(game, side);

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

  cleanupDeaths(game);

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

  if (t === "enemy-any") {
    return "enemy";
  }

  if (t === "enemy-pokemon") {
    return "enemy";
  }
  if (t === "friendly-pokemon") {
    const e = card.spell.effect;
    if (e === "heal" || e === "fullheal") return "friendly-or-hero";
    if (e === "cure_status" || e === "cure_all_status") return "friendly";
    return "friendly";
  }
  return null;
}
