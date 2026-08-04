// ============================================================
// 포스스톤 배틀 엔진
// 상태를 직접 변형(mutate)하고, UI는 얕은 복사로 리렌더링
// ============================================================

import { CARD_MAP, TYPE_CHART, SAND_IMMUNE_TYPES } from '../data/cards.js';

const PINCH_ABILITIES = ['torrent', 'blaze', 'overgrow', 'guts'];
const AURA_TYPES = { aura_grass: '풀', aura_electric: '전기', aura_fighting: '격투', aura_dragon: '드래곤' };
const SLEEP_BATTLECRIES = ['sleeppowder', 'hypnosis', 'sing', 'lovelykiss'];
const SURVIVE_ABILITIES = ['sturdy', 'disguise'];

let uidCounter = 1;
const nextUid = () => `u${uidCounter++}`;

export const MAX_FIELD = 6;
export const MAX_HAND = 10;
export const MAX_MANA = 10;

export const WEATHER_NAME = { rain: '비', sun: '쾌청', sand: '모래바람' };

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
  return side === 'player' ? 'enemy' : 'player';
}

// ---------- 게임 생성 ----------
export function createGame(playerDeckIds, trainer) {
  const game = {
    turn: 'player',
    turnCount: 1,
    weather: null,
    log: [],
    winner: null,
    trainer,
    players: {
      player: makePlayer(playerDeckIds, '나'),
      enemy: makePlayer(trainer.deck, trainer.name, trainer.hp),
    },
  };
  // 플레이어 선공: 3장 / 후공 AI: 4장 드로우
  for (let i = 0; i < 3; i++) drawCard(game, 'player', true);
  for (let i = 0; i < 4; i++) drawCard(game, 'enemy', true);
  startTurn(game, 'player');
  log(game, `${trainer.name}와(과)의 배틀 시작!`);
  return game;
}

function makePlayer(deckIds, name, hp = 30) {
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
    log(game, `${p.name}의 손패가 가득 차 ${CARD_MAP[cardId].name}이(가) 불타버렸다!`);
    return null;
  }
  p.hand.push({ uid: nextUid(), cardId });
  if (!silent) log(game, `${p.name}이(가) 카드를 뽑았다.`);
  return cardId;
}

// ---------- 턴 진행 ----------
function startTurn(game, side) {
  const p = game.players[side];
  p.maxMana = Math.min(MAX_MANA, p.maxMana + 1);
  p.mana = p.maxMana;
  p.field.forEach((u) => {
    u.extraUsed = false;
    if (u.resting) {
      u.canAttack = false;
      u.resting = false;
      log(game, `${u.name}은(는) 게으름을 피우고 있다...`);
      if (u.frozen > 0) u.frozen -= 1;
      return;
    }
    u.canAttack = true;
    if (u.frozen > 0) u.frozen -= 1;
  });
  if (game.turnCount > 1 || side === 'enemy') drawCard(game, side);
}

export function endTurn(game) {
  const side = game.turn;
  const p = game.players[side];

  // 럭키 치유의마음: 턴 종료 시 아군 전체 1 회복
  p.field.forEach((u) => {
    if (u.ability === 'regenerator' && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + 2);
      log(game, `${u.name}의 재생력! 체력을 회복했다.`);
    }
    if (u.ability === 'healer') {
      p.field.forEach((f) => {
        f.hp = Math.min(f.maxHp, f.hp + 1);
      });
      log(game, `${u.name}의 치유의마음! 아군 포켓몬이 회복했다.`);
    }
  });

  // 모래바람: 턴 종료 시 땅 타입이 아닌 모든 포켓몬 피해 1 (부유 포함 피해)
  if (game.weather === 'sand') {
    ['player', 'enemy'].forEach((s) => {
      game.players[s].field.forEach((u) => {
        if (!SAND_IMMUNE_TYPES.includes(u.type)) applyDamage(game, u, 1, null, true);
      });
    });
    log(game, '모래바람이 몰아친다!');
    cleanupDeaths(game);
  }

  if (game.winner) return;

  const next = other(side);
  game.turn = next;
  if (next === 'player') game.turnCount += 1;
  startTurn(game, next);
  log(game, `── ${game.players[next].name}의 턴 ──`);
  checkWinner(game);
}

// ---------- 계산 ----------
export function effectiveCost(card, game) {
  let cost = card.cost;
  if (game.weather === 'sun') {
    if (card.ability === 'chlorophyll') cost -= 1;
    if (card.id === 'solarbeam') cost -= 2;
  }
  return Math.max(0, cost);
}

export function effectiveAtk(unit, game) {
  let atk = unit.atk;
  if (PINCH_ABILITIES.includes(unit.ability) && unit.hp <= Math.ceil(unit.maxHp / 2)) atk += 2;
  if (game.weather === 'rain' && unit.type === '물') atk += 1;
  if (game.weather === 'sun' && unit.type === '불꽃') atk += 1;
  if (game.weather === 'sun' && unit.ability === 'solarpower') atk += 2;
  if (unit.ability === 'fortress') return unit.hp;
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
  if (game.weather === 'rain') {
    if (mt === '물') amount += 1;
    if (mt === '불꽃') amount -= 1;
  }
  if (game.weather === 'sun') {
    if (mt === '불꽃') amount += 1;
    if (mt === '물') amount -= 1;
  }
  return Math.max(0, amount);
}

// ---------- 피해 처리 ----------
// source: 공격 유닛 또는 null(기술/환경), typedIgnore: 상성/부유 무시(모래바람 등)
function applyDamage(game, unit, amount, sourceType = null, typedIgnore = false) {
  if (amount <= 0) return 0;
  if (!typedIgnore && sourceType === '땅' && unit.ability === 'levitate') {
    log(game, `${unit.name}은(는) 부유로 피해를 받지 않았다!`);
    return 0;
  }
  // 타오르는불꽃: 불꽃 무효
  if (!typedIgnore && sourceType === '불꽃' && unit.ability === 'flashfire') {
    log(game, `${unit.name}의 타오르는불꽃! 불꽃 피해를 받지 않는다!`);
    return 0;
  }
  // 축전: 전기 타입 공격은 피해 대신 회복
  if (!typedIgnore && sourceType === '전기' && unit.ability === 'voltabsorb') {
    const heal = Math.min(2, unit.maxHp - unit.hp);
    unit.hp += heal;
    log(game, `${unit.name}의 축전! 전기를 흡수해 체력을 회복했다!`);
    return 0;
  }
  // 저수: 물 타입 공격은 피해 대신 회복
  if (!typedIgnore && sourceType === '물' && unit.ability === 'waterabsorb') {
    const heal = Math.min(2, unit.maxHp - unit.hp);
    unit.hp += heal;
    log(game, `${unit.name}의 저수! 물을 흡수해 체력을 회복했다!`);
    return 0;
  }
  let dmg = amount;
  // 두꺼운지방: 불꽃/얼음 피해 감소
  if (!typedIgnore && (sourceType === '불꽃' || sourceType === '얼음') && unit.ability === 'thickfat') {
    dmg = Math.max(0, dmg - 1);
    if (dmg < amount) log(game, `${unit.name}의 두꺼운지방으로 피해가 줄었다!`);
  }
  // 모래숨기: 모래바람일 때 피해 감소
  if (!typedIgnore && game.weather === 'sand' && unit.ability === 'sandveil') {
    dmg = Math.max(0, dmg - 1);
    if (dmg < amount) log(game, `${unit.name}이(가) 모래숨기로 공격을 흘렸다!`);
  }
  // 멀티스케일: 체력 가득이면 피해 절반
  if (unit.ability === 'multiscale' && unit.hp === unit.maxHp && dmg > 1) {
    dmg = Math.ceil(dmg / 2);
    log(game, `${unit.name}의 멀티스케일! 피해가 절반이 됐다!`);
  }
  if (dmg <= 0) return 0;
  if (SURVIVE_ABILITIES.includes(unit.ability) && !unit.sturdyUsed && dmg >= unit.hp) {
    unit.hp = 1;
    unit.sturdyUsed = true;
    log(game, `${unit.name}은(는) 옹골참으로 버텼다!`);
    return dmg;
  }
  unit.hp -= dmg;
  return dmg;
}

function cleanupDeaths(game) {
  // 대폭발 연쇄를 위해 시체가 없어질 때까지 반복 (최대 20회 안전장치)
  for (let pass = 0; pass < 20; pass++) {
    let anyDead = false;
    ['player', 'enemy'].forEach((side) => {
      const p = game.players[side];
      const dead = p.field.filter((u) => u.hp <= 0);
      if (dead.length === 0) return;
      anyDead = true;
      p.field = p.field.filter((u) => u.hp > 0);
      dead.forEach((u) => {
        log(game, `${u.name}이(가) 기절했다!`);
        // 죽음의 메아리
        if (u.ability === 'deathdraw') {
          drawCard(game, side);
          log(game, `${u.name}의 예지몽! 카드를 1장 뽑았다.`);
        }
        if (u.ability === 'explode') {
          const foes = game.players[other(side)].field.filter((f) => f.hp > 0);
          if (foes.length > 0) {
            const t = foes[Math.floor(Math.random() * foes.length)];
            applyDamage(game, t, 2, '전기');
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
  if (pDead && eDead) game.winner = 'enemy';
  else if (eDead) game.winner = 'player';
  else if (pDead) game.winner = 'enemy';
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
    frozen: 0,
    sturdyUsed: false,
    mega: false,
    side,
  };
}

function runBattlecry(game, side, unit) {
  const foe = game.players[other(side)];
  const me = game.players[side];
  switch (unit.ability) {
    case 'foresight':
      drawCard(game, side);
      drawCard(game, side);
      log(game, `${unit.name}의 예지! 카드를 2장 뽑았다.`);
      break;
    case 'download':
      unit.atk += 1;
      unit.hp += 1;
      unit.maxHp += 1;
      log(game, `${unit.name}의 다운로드! +1/+1을 얻었다.`);
      break;
    case 'airlock':
      if (game.weather) {
        game.weather = null;
        log(game, `${unit.name}의 에어록! 날씨가 사라졌다!`);
      }
      break;
    case 'purify':
      me.field.forEach((u) => {
        u.hp = Math.min(u.maxHp, u.hp + 2);
        u.frozen = 0;
      });
      log(game, `${unit.name}의 정화! 아군이 회복하고 상태이상이 풀렸다.`);
      break;
    case 'sacredflame':
      me.field.forEach((u) => (u.hp = Math.min(u.maxHp, u.hp + 3)));
      log(game, `${unit.name}의 성스러운불꽃! 아군 전체가 크게 회복했다.`);
      break;
    case 'muddywater':
      foe.field.forEach((u) => applyDamage(game, u, 1, '물'));
      log(game, `${unit.name}의 탁류! 적 전체에게 물 피해 1!`);
      cleanupDeaths(game);
      break;
    case 'eruption':
      foe.field.forEach((u) => applyDamage(game, u, 2, '불꽃'));
      log(game, `${unit.name}의 분화! 적 전체에게 불꽃 피해 2!`);
      cleanupDeaths(game);
      break;
    case 'earthpower': {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        applyDamage(game, t, 3, '땅');
        log(game, `${unit.name}의 대지의힘! ${t.name}에게 땅 피해 3!`);
        cleanupDeaths(game);
      }
      break;
    }
    case 'primordialsea':
      game.weather = 'rain';
      foe.field.forEach((u) => applyDamage(game, u, 2, '물'));
      log(game, `${unit.name}의 근원의바다! 폭우와 함께 적 전체에게 물 피해 2!`);
      cleanupDeaths(game);
      break;
    case 'desolateland':
      game.weather = 'sun';
      foe.field.forEach((u) => applyDamage(game, u, 2, '땅'));
      log(game, `${unit.name}의 끝의대지! 대지가 갈라지며 적 전체에게 땅 피해 2!`);
      cleanupDeaths(game);
      break;
    case 'blizzard': {
      foe.field.forEach((u) => applyDamage(game, u, 1, '얼음'));
      const alive = foe.field.filter((u) => u.hp > 0);
      if (alive.length) {
        const t = alive[Math.floor(Math.random() * alive.length)];
        t.frozen = 2;
        log(game, `${unit.name}의 눈보라! 적 전체 얼음 피해 1, ${t.name}이(가) 얼어붙었다!`);
      }
      cleanupDeaths(game);
      break;
    }
    case 'ancestor': {
      const idx = me.deck.findIndex((c) => c.kind === 'pokemon');
      if (idx !== -1 && me.hand.length < 10) {
        const picks = me.deck.filter((c) => c.kind === 'pokemon');
        const pick = picks[Math.floor(Math.random() * picks.length)];
        me.deck.splice(me.deck.indexOf(pick), 1);
        me.hand.push(pick);
        log(game, `${unit.name}의 만물의시조! ${pick.name}을(를) 손으로 가져왔다.`);
      }
      break;
    }
    case 'supremeoverlord': {
      const others = me.field.filter((u) => u.uid !== unit.uid && u.hp > 0);
      const n = others.length;
      others.forEach((u) => (u.hp = 0));
      if (n > 0) {
        unit.atk += n;
        unit.hp += n;
        unit.maxHp += n;
        log(game, `${unit.name}의 총대장! 아군 ${n}마리를 희생하고 +${n}/+${n}을 얻었다!`);
        cleanupDeaths(game);
      }
      break;
    }
    case 'transform': {
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
    case 'intimidate': {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.atk = Math.max(0, t.atk - 2);
        log(game, `${unit.name}의 위협! ${t.name}의 공격력이 2 떨어졌다!`);
      }
      break;
    }
    case 'drizzle':
      game.weather = 'rain';
      log(game, `${unit.name}의 잔비! 비가 내리기 시작했다!`);
      break;
    case 'drought':
      game.weather = 'sun';
      log(game, `${unit.name}의 가뭄! 햇살이 강해졌다!`);
      break;
    case 'sandstream':
      game.weather = 'sand';
      log(game, `${unit.name}의 모래날림! 모래바람이 불기 시작했다!`);
      break;
    case 'keeneye':
      drawCard(game, side);
      log(game, `${unit.name}의 예리한눈! 카드를 1장 뽑았다.`);
      break;
    case 'teleport':
      drawCard(game, side);
      log(game, `${unit.name}의 텔레포트! 카드를 1장 뽑았다.`);
      break;
    case 'moonlight':
      me.field.forEach((u) => (u.hp = Math.min(u.maxHp, u.hp + 2)));
      log(game, `${unit.name}의 달빛! 아군 포켓몬이 회복했다.`);
      break;
    case 'psystrike':
      foe.field.forEach((u) => applyDamage(game, u, 3, '에스퍼'));
      log(game, `${unit.name}의 사이코브레이크! 적 전체에게 에스퍼 피해 3!`);
      cleanupDeaths(game);
      break;
    case 'timetravel':
      me.field.forEach((u) => (u.hp = Math.min(u.maxHp, u.hp + 2)));
      drawCard(game, side);
      log(game, `${unit.name}의 자연회복! 아군 전체 회복 + 드로우!`);
      break;
    case 'thunderstrike':
      foe.field.forEach((u) => applyDamage(game, u, 2, '전기'));
      log(game, `${unit.name}의 번개! 적 전체에게 피해 2!`);
      cleanupDeaths(game);
      break;
    case 'flamesiege': {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        applyDamage(game, t, 3, '불꽃');
        log(game, `${unit.name}의 불대문자! ${t.name}에게 피해 3!`);
        cleanupDeaths(game);
      }
      break;
    }
    case 'hypnosis':
    case 'sing':
    case 'lovelykiss':
    case 'sleeppowder': {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.frozen = 2; // 다음 자기 턴까지 공격 불가
        const skillName = { hypnosis: '최면술', sing: '자장가', lovelykiss: '악마의키스', sleeppowder: '수면가루' }[unit.ability];
        log(game, `${unit.name}의 ${skillName}! ${t.name}이(가) 잠들었다!`);
      }
      break;
    }
    case 'freezer': {
      const targets = foe.field.filter((u) => u.hp > 0);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.frozen = 2;
        log(game, `${unit.name}의 냉동빔! ${t.name}이(가) 얼어붙었다!`);
      }
      break;
    }
    default:
      break;
  }
  // 쓱쓱: 비면 소환 즉시 공격 가능
  if (unit.ability === 'swiftswim' && game.weather === 'rain') {
    unit.canAttack = true;
    log(game, `${unit.name}은(는) 쓱쓱으로 바로 움직일 수 있다!`);
  }
  if (unit.ability === 'rush') {
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
  if (card.kind === 'pokemon' && !card.evolvesFrom && p.field.length >= MAX_FIELD) return false;
  if (card.kind === 'pokemon' && card.evolvesFrom) {
    // 이번 턴에 나왔거나 진화한 포켓몬은 진화 불가 (메가진화는 예외)
    return p.field.some((u) => u.cardId === card.evolvesFrom && u.summonedTurn !== game.turnCount);
  }
  if (card.kind === 'mega') {
    if (p.megaUsed) return false;
    return p.field.some((u) => u.cardId === card.megaFor && !u.mega);
  }
  if (card.kind === 'spell') {
    const t = card.spell.target;
    if (t === 'enemy-any') return true; // 영웅은 항상 있음
    if (t === 'friendly-pokemon') return p.field.length > 0;
    return true;
  }
  return true;
}

// 카드 사용 이벤트 기록 (UI 연출용)
function markPlay(game, side, card, extra = null) {
  game.animSeq = (game.animSeq || 0) + 1;
  game.lastAction = { seq: game.animSeq, kind: 'play', side, cardId: card.id, ...(extra || {}) };
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const p = game.players[side];
  if (game.turn !== side || game.winner) return false;
  if (!canPlayCard(game, side, handIdx)) return false;
  const h = p.hand[handIdx];
  const card = CARD_MAP[h.cardId];
  const cost = effectiveCost(card, game);

  // ----- 포켓몬 (기본) -----
  if (card.kind === 'pokemon' && !card.evolvesFrom) {
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
  if (card.kind === 'pokemon' && card.evolvesFrom) {
    const base = target
      ? p.field.find((u) => u.uid === target.uid && u.cardId === card.evolvesFrom && u.summonedTurn !== game.turnCount)
      : p.field.find((u) => u.cardId === card.evolvesFrom && u.summonedTurn !== game.turnCount);
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
    base.summonedTurn = game.turnCount; // 이번 턴엔 다음 단계로 진화 불가
    // canAttack 상태는 유지 (진화해도 소환멀미 그대로)
    log(game, `${base.name}(으)로 진화했다!`);
    runBattlecry(game, side, base);
    cleanupDeaths(game);
    markPlay(game, side, card, { anim: 'evolve', uid: base.uid });
    return true;
  }

  // ----- 메가진화 -----
  if (card.kind === 'mega') {
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
    if (base.ability === 'swiftswim' && game.weather === 'rain' && !base.canAttack) {
      base.canAttack = true;
      log(game, `쓱쓱 발동! ${base.name}이(가) 바로 움직일 수 있다!`);
    }
    markPlay(game, side, card, { anim: 'mega', uid: base.uid });
    return true;
  }

  // ----- 기술 카드 -----
  if (card.kind === 'spell') {
    const s = card.spell;
    const foe = game.players[other(side)];

    if (s.effect === 'weather') {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      game.weather = s.weather;
      log(game, `${p.name}이(가) ${card.name}을(를) 사용했다! ${WEATHER_NAME[s.weather]}!`);
      markPlay(game, side, card);
    return true;
    }

    if (s.effect === 'tutor_pokemon') {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      const idxs = p.deck
        .map((id, i) => ({ id, i }))
        .filter((x) => CARD_MAP[x.id].kind === 'pokemon');
      if (idxs.length > 0) {
        const pick = idxs[Math.floor(Math.random() * idxs.length)];
        p.deck.splice(pick.i, 1);
        if (p.hand.length < MAX_HAND) {
          p.hand.push({ uid: nextUid(), cardId: pick.id });
          log(game, `몬스터볼! ${CARD_MAP[pick.id].name}을(를) 손에 넣었다!`);
        }
      } else {
        log(game, '몬스터볼을 던졌지만 덱에 포켓몬이 없었다...');
      }
      markPlay(game, side, card);
    return true;
    }

    if (s.effect === 'aoe') {
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      const base = spellDamageAmount(card, game);
      log(game, `${card.name}! 적 전체 공격!`);
      foe.field.forEach((u) => {
        const dmg = calcTypedDamage(base, card.moveType, u.type);
        const mult = typeMult(card.moveType, u.type);
        const dealt = applyDamage(game, u, dmg, card.moveType);
        let note = '';
        if (mult > 1) note = ' 효과가 굉장했다!';
        else if (mult === 0) note = ' 효과가 없는 것 같다...';
        else if (mult < 1) note = ' 효과가 별로인 듯하다...';
        if (mult === 0 || dealt > 0) log(game, `- ${u.name}에게 피해 ${dealt}.${note}`);
      });
      cleanupDeaths(game);
      markPlay(game, side, card);
    return true;
    }

    if (s.effect === 'damage' || s.effect === 'damage_draw' || s.effect === 'damage_freeze') {
      if (!target) return false;
      if (target.uid !== 'hero' && !foe.field.some((x) => x.uid === target.uid)) return false;
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      const base = spellDamageAmount(card, game);
      if (target.uid === 'hero') {
        foe.hp -= base;
        log(game, `${card.name}! ${foe.name}에게 피해 ${base}!`);
      } else {
        const u = foe.field.find((x) => x.uid === target.uid);
        if (u) {
          const dmg = calcTypedDamage(base, card.moveType, u.type);
          const mult = typeMult(card.moveType, u.type);
          const dealt = applyDamage(game, u, dmg, card.moveType);
          let note = '';
          if (mult > 1) note = ' 효과가 굉장했다!';
          else if (mult === 0) note = ' 효과가 없는 것 같다...';
          else if (mult < 1) note = ' 효과가 별로인 듯하다...';
          log(game, `${card.name}! ${u.name}에게 피해 ${dealt}!${note}`);
        }
      }
      if (s.effect === 'damage_draw') drawCard(game, side);
      if (s.effect === 'damage_freeze' && target.uid !== 'hero') {
        const u = foe.field.find((x) => x.uid === target.uid);
        if (u && u.hp > 0) {
          u.frozen = 2;
          log(game, `${u.name}이(가) 얼어붙었다!`);
        }
      }
      cleanupDeaths(game);
      markPlay(game, side, card);
    return true;
    }

    if (s.effect === 'heal') {
      if (!target) return false;
      const u = p.field.find((x) => x.uid === target.uid);
      if (!u) return false;
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      u.hp = Math.min(u.maxHp, u.hp + s.amount);
      log(game, `${card.name}! ${u.name}의 체력이 회복됐다.`);
      markPlay(game, side, card);
    return true;
    }

    if (s.effect === 'fullheal') {
      if (!target) return false;
      const u = p.field.find((x) => x.uid === target.uid);
      if (!u) return false;
      p.mana -= cost;
      p.hand.splice(handIdx, 1);
      u.hp = u.maxHp;
      u.frozen = 0;
      log(game, `${card.name}! ${u.name}이(가) 완전히 회복됐다!`);
      markPlay(game, side, card);
    return true;
    }
  }
  return false;
}

// ---------- 공격 ----------
export function canAttack(game, side, unitUid) {
  const p = game.players[side];
  const u = p.field.find((x) => x.uid === unitUid);
  if (!u) return false;
  if (u.ability === 'fortress') return false;
  if (!u.canAttack || u.frozen > 0) return false;
  if (effectiveAtk(u, game) <= 0) return false;
  return true;
}

export function validAttackTargets(game, side, attackerUid = null) {
  const foe = game.players[other(side)];
  const attacker = attackerUid ? game.players[side].field.find((u) => u.uid === attackerUid) : null;
  const noguard = attacker && attacker.ability === 'noguard';
  const taunts = noguard ? [] : foe.field.filter((u) => (u.ability === 'taunt' || u.ability === 'fortress') && u.hp > 0);
  if (taunts.length > 0) return { units: taunts, hero: false };
  return { units: foe.field, hero: true };
}

function spendAttack(game, unit) {
  if (unit.ability === 'skilllink' && !unit.extraUsed) {
    unit.extraUsed = true;
    log(game, `${unit.name}의 스킬링크! 한 번 더 공격할 수 있다!`);
  } else {
    unit.canAttack = false;
    if (unit.ability === 'truant') unit.resting = true;
  }
}

export function attack(game, side, attackerUid, target) {
  if (game.turn !== side || game.winner) return false;
  const p = game.players[side];
  const foe = game.players[other(side)];
  const atkUnit = p.field.find((u) => u.uid === attackerUid);
  if (!atkUnit || !canAttack(game, side, attackerUid)) return false;

  const { units, hero } = validAttackTargets(game, side, attackerUid);

  if (target.uid === 'hero') {
    if (!hero) return false;
    const dmg = effectiveAtk(atkUnit, game);
    foe.hp -= dmg;
    spendAttack(game, atkUnit);
    log(game, `${atkUnit.name}이(가) ${foe.name}을(를) 직접 공격! 피해 ${dmg}!`);
    game.animSeq = (game.animSeq || 0) + 1;
    game.lastAction = { seq: game.animSeq, kind: 'attack', side, uid: attackerUid, targetUid: 'hero' };
    checkWinner(game);
    return true;
  }

  const defUnit = units.find((u) => u.uid === target.uid);
  if (!defUnit) return false;

  const atkDmgBase = effectiveAtk(atkUnit, game);
  const defDmgBase = effectiveAtk(defUnit, game);
  const atkDmg = calcTypedDamage(atkDmgBase, atkUnit.type, defUnit.type);
  const defDmg = calcTypedDamage(defDmgBase, defUnit.type, atkUnit.type);

  const mult = typeMult(atkUnit.type, defUnit.type);
  applyDamage(game, defUnit, atkDmg, atkUnit.type);
  applyDamage(game, atkUnit, defDmg, defUnit.type);
  spendAttack(game, atkUnit);

  let note = '';
  if (mult > 1) note = ' 효과가 굉장했다!';
  else if (mult === 0) note = ' 효과가 없었다...';
  else if (mult < 1) note = ' 효과가 별로였다...';
  log(game, `${atkUnit.name} ➜ ${defUnit.name} 공격! 피해 ${atkDmg}, 반격 ${defDmg}.${note}`);

  // 까칠한피부: 공격자에게 2
  if (defUnit.ability === 'roughskin' && atkUnit.hp > 0) {
    applyDamage(game, atkUnit, 2, null);
    log(game, `${defUnit.name}의 까칠한피부! ${atkUnit.name}이(가) 피해 2를 받았다!`);
  }
  // 정전기: 공격당한 쪽이 정전기면 공격자에게 1
  if (defUnit.ability === 'static' && atkUnit.hp > 0) {
    applyDamage(game, atkUnit, 1, '전기');
    log(game, `${defUnit.name}의 정전기! ${atkUnit.name}에게 피해 1!`);
  }

  if (defUnit.hp <= 0 && atkUnit.hp > 0 && atkUnit.ability === 'moxie') {
    atkUnit.atk += 2;
    log(game, `${atkUnit.name}의 자기과신! 공격력이 2 올랐다!`);
  }
  game.animSeq = (game.animSeq || 0) + 1;
  game.lastAction = { seq: game.animSeq, kind: 'attack', side, uid: attackerUid, targetUid: target.uid };
  cleanupDeaths(game);
  return true;
}

// ---------- 기술 카드 타겟 필요 여부 ----------
export function spellNeedsTarget(card) {
  if (card.kind === 'pokemon' && card.evolvesFrom) return 'evolve';
  if (card.kind === 'mega') return 'mega';
  if (card.kind !== 'spell') return null;
  const t = card.spell.target;
  if (t === 'enemy-any') return 'enemy';
  if (t === 'friendly-pokemon') return 'friendly';
  return null;
}
