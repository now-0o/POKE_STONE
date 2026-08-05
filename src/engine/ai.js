// ============================================================
// AI: 트레이너 난이도별 행동 결정
// 레벨 1: 랜덤 / 2: 그리디 / 3: 시너지·교환 평가 / 4: 킬각+최적화
// aiStep(game) -> 행동 1개 수행 후 true, 턴 종료 시 false 반환
// ============================================================

import { CARD_MAP } from '../data/cards.js';
import {
  playCard, attack, endTurn, canPlayCard, canAttack,
  validAttackTargets, effectiveAtk, effectiveCost,
  calcTypedDamage, typeMult, spellDamageAmount, spellNeedsTarget, other,
  resolveMoldbreaker,
} from './engine.js';

const SIDE = 'enemy';

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- 행동 수집 ----------
function playableCards(game) {
  const p = game.players[SIDE];
  const list = [];
  p.hand.forEach((h, idx) => {
    if (canPlayCard(game, SIDE, idx)) list.push({ idx, card: CARD_MAP[h.cardId] });
  });
  return list;
}

function readyAttackers(game) {
  return game.players[SIDE].field.filter((u) => canAttack(game, SIDE, u.uid));
}

// ---------- 기술 카드 타겟 선택 ----------
function pickSpellTarget(game, card, level) {
  const foe = game.players.player;
  const me = game.players[SIDE];
  const need = spellNeedsTarget(card);

  if (need === 'enemy') {
    const base = spellDamageAmount(card, game);
    // 킬각: 영웅 마무리 가능하면 얼굴
    if (foe.hp <= base) return { uid: 'hero' };
    if (level <= 1) {
      const pool = [...foe.field.map((u) => ({ uid: u.uid })), { uid: 'hero' }];
      return rand(pool);
    }
    // 제거 가치가 높은 대상: 죽일 수 있는 것 중 스탯 합 최대
    const killable = foe.field
      .map((u) => ({ u, dmg: calcTypedDamage(base, card.moveType, u.type) }))
      .filter((x) => x.dmg >= x.u.hp)
      .sort((a, b) => (b.u.atk + b.u.maxHp) - (a.u.atk + a.u.maxHp));
    if (killable.length > 0) return { uid: killable[0].u.uid };
    if (level >= 3 && foe.field.length > 0) {
      // 못 죽여도 가장 위협적인 대상에 피해
      const threat = [...foe.field].sort((a, b) => effectiveAtk(b, game) - effectiveAtk(a, game))[0];
      const dmg = calcTypedDamage(base, card.moveType, threat.type);
      if (dmg > 0) return { uid: threat.uid };
    }
    return { uid: 'hero' };
  }

  if (need === 'friendly') {
    if (card.kind === 'item') {
      const candidates = me.field.filter((u) => !u.item).sort((a, b) => (b.atk + b.maxHp) - (a.atk + a.maxHp));
      if (candidates.length === 0) return null;
      return { uid: candidates[0].uid };
    }
    const hurt = me.field
      .filter((u) => u.hp < u.maxHp)
      .sort((a, b) => (b.maxHp - b.hp) - (a.maxHp - a.hp));
    if (hurt.length === 0) return null;
    return { uid: hurt[0].uid };
  }

  if (need === 'evolve') {
    const base = me.field.find((u) => u.cardId === card.evolvesFrom && !u.noEvolve);
    return base ? { uid: base.uid } : null;
  }
  if (need === 'mega') {
    const base = me.field.find((u) => u.cardId === card.megaFor && !u.mega);
    return base ? { uid: base.uid } : null;
  }
  return null;
}

// ---------- 카드 사용 우선순위 ----------
function scoreCard(game, card, level) {
  const me = game.players[SIDE];
  const foe = game.players.player;
  let score = card.cost * 10; // 기본: 비싼 카드부터
  // 총대장: 아군을 다 잡아먹으니 필드가 넓을수록 자충수
  if (card.ability === 'supremeoverlord') {
    const others = me.field.length;
    if (others >= 3) score -= 60;
    else if (others === 2) score -= 25;
    else if (others <= 1) score += 10;
  }
  if (card.ability === 'foresight' || card.ability === 'ancestor') score += 8;

  if (card.kind === 'pokemon') {
    if (card.evolvesFrom) score += 25; // 진화는 가치 높음
    if (level >= 3) {
      // 날씨 시너지
      if (game.weather === 'rain' && (card.type === '물' || card.ability === 'swiftswim')) score += 15;
      if (game.weather === 'sun' && (card.type === '불꽃' || card.ability === 'chlorophyll')) score += 15;
      if (card.ability === 'drizzle' && me.hand.some((h) => CARD_MAP[h.cardId].type === '물')) score += 10;
      if (card.ability === 'drought' && me.hand.some((h) => CARD_MAP[h.cardId].type === '불꽃')) score += 10;
      if (card.ability === 'taunt' && foe.field.length >= 2) score += 12;
    }
  }

  if (card.kind === 'spell') {
    const s = card.spell;
    if (s.effect === 'weather') {
      if (game.weather === s.weather) return -100; // 이미 그 날씨면 낭비
      if (level >= 3) {
        const synergyCount = me.field.filter((u) =>
          (s.weather === 'rain' && u.type === '물') ||
          (s.weather === 'sun' && u.type === '불꽃') ||
          (s.weather === 'sand' && ['바위','땅','강철'].includes(u.type))
        ).length;
        score += synergyCount * 8;
        if (synergyCount === 0 && level >= 3) score -= 30;
      }
    }
    if (s.effect === 'aoe') {
      const base = spellDamageAmount(card, game);
      const totalValue = foe.field.reduce((acc, u) => {
        const dmg = calcTypedDamage(base, card.moveType, u.type);
        return acc + (dmg >= u.hp ? u.atk + u.maxHp : Math.min(dmg, u.hp));
      }, 0);
      score = totalValue * 8 - 10;
      if (level >= 2 && foe.field.length <= 1) score -= 25;
    }
    if ((s.effect === 'damage' || s.effect === 'damage_draw' || s.effect === 'damage_freeze') && level >= 2) {
      const base = spellDamageAmount(card, game);
      if (foe.hp <= base) score += 999; // 킬각
      const killable = foe.field.some((u) => calcTypedDamage(base, card.moveType, u.type) >= u.hp);
      if (killable) score += 20;
      else if (level >= 3 && foe.field.length === 0 && foe.hp > base * 3) score -= 15; // 아껴두기
    }
    if (s.effect === 'heal' || s.effect === 'fullheal') {
      const hurt = me.field.filter((u) => u.hp < u.maxHp);
      if (hurt.length === 0) return -100;
      const worst = Math.max(...hurt.map((u) => u.maxHp - u.hp));
      score = worst * 6;
      if (s.effect === 'fullheal' && worst < 4 && level >= 3) score -= 20;
    }
    if (s.effect === 'tutor_pokemon') score += 5;
  }

  if (card.kind === 'mega') {
    score += 40;
    if (level >= 4) {
      // 승호: 필드가 안정적일 때 or 킬각 보조일 때 메가
      const base = me.field.find((u) => u.cardId === card.megaFor && !u.mega);
      if (base && !base.canAttack && game.weather !== 'rain') score -= 10;
    }
  }

  return score;
}

// ---------- 공격 평가 ----------
function chooseAttack(game, level) {
  const attackers = readyAttackers(game);
  if (attackers.length === 0) return null;
  const foe = game.players.player;
  const { units, hero } = validAttackTargets(game, SIDE);

  // 킬각 체크 (레벨 2+): 얼굴 총딜이 충분하면 전부 얼굴
  if (level >= 2 && hero) {
    const totalFace = attackers.reduce((a, u) => a + effectiveAtk(u, game), 0);
    if (totalFace >= foe.hp) {
      return { attacker: attackers[0], target: { uid: 'hero' } };
    }
  }

  if (level === 1) {
    const attacker = rand(attackers);
    const pool = [...units.map((u) => ({ uid: u.uid }))];
    if (hero) pool.push({ uid: 'hero' }, { uid: 'hero' }); // 얼굴 약간 선호
    return { attacker, target: rand(pool) };
  }

  // 그리디: 좋은 교환 찾기
  let best = null;
  let bestScore = -Infinity;
  attackers.forEach((a) => {
    const myAtk = effectiveAtk(a, game);
    units.forEach((d) => {
      const dmg = calcTypedDamage(myAtk, a.type, d.type);
      const back = calcTypedDamage(effectiveAtk(d, game), d.type, a.type);
      const kills = dmg >= d.hp;
      const dies = back >= a.hp;
      let score = 0;
      if (kills) score += (d.atk + d.maxHp) * 3;
      else score += dmg;
      if (dies) score -= (a.atk + a.maxHp) * (level >= 3 ? 3 : 2);
      if (kills && !dies) score += 20; // 완승 교환
      if (typeMult(a.type, d.type) > 1) score += 5;
      if (score > bestScore) {
        bestScore = score;
        best = { attacker: a, target: { uid: d.uid }, score };
      }
    });
    if (hero) {
      // 얼굴 공격 점수
      let faceScore = myAtk * (level >= 3 ? 1.2 : 2);
      if (foe.hp < 12) faceScore += 15;
      if (faceScore > bestScore) {
        bestScore = faceScore;
        best = { attacker: a, target: { uid: 'hero' }, score: faceScore };
      }
    }
  });

  // 레벨 3+: 명백히 손해인 공격은 보류 (도발 강제 제외)
  if (best && level >= 3 && best.score < 0 && hero) {
    return { attacker: best.attacker, target: { uid: 'hero' } };
  }
  return best;
}

// ---------- 메인: 행동 1개 수행 ----------
export function aiStep(game) {
  if (game.winner || game.turn !== SIDE) return false;
  const level = game.trainer.aiLevel;
  const me = game.players[SIDE];

  // 0) 틀깨기 보류 중이면 즉시 해소 (가장 위협적인 도발 포켓몬부터 제거)
  if (game.pendingBattlecry && game.pendingBattlecry.side === SIDE) {
    const targets = game.players.player.field.filter((u) => game.pendingBattlecry.targets.includes(u.uid));
    const pick = targets.sort((a, b) => (effectiveAtk(b, game) + b.maxHp) - (effectiveAtk(a, game) + a.maxHp))[0];
    if (pick) resolveMoldbreaker(game, SIDE, pick.uid);
    else game.pendingBattlecry = null;
    return true;
  }

  // 1) 카드 사용
  const playable = playableCards(game);
  if (playable.length > 0) {
    if (level === 1) {
      // 랜덤: 가끔 카드 안 내고 넘어가기도 함
      if (Math.random() < 0.85) {
        const pick = rand(playable);
        const target = pickSpellTarget(game, pick.card, level);
        const need = spellNeedsTarget(pick.card);
        if (!need || target) {
          if (playCard(game, SIDE, pick.idx, target)) return true;
        }
      }
    } else {
      const scored = playable
        .map((pc) => ({ ...pc, score: scoreCard(game, pc.card, level) }))
        .filter((pc) => pc.score > -50)
        .sort((a, b) => b.score - a.score);
      if (scored.length > 0) {
        const pick = scored[0];
        const target = pickSpellTarget(game, pick.card, level);
        const need = spellNeedsTarget(pick.card);
        if (!need || target) {
          if (playCard(game, SIDE, pick.idx, target)) return true;
        } else if (scored.length > 1) {
          const alt = scored[1];
          const altTarget = pickSpellTarget(game, alt.card, level);
          const altNeed = spellNeedsTarget(alt.card);
          if (!altNeed || altTarget) {
            if (playCard(game, SIDE, alt.idx, altTarget)) return true;
          }
        }
      }
    }
  }

  // 2) 공격
  const atkChoice = chooseAttack(game, level);
  if (atkChoice) {
    if (attack(game, SIDE, atkChoice.attacker.uid, atkChoice.target)) return true;
  }

  // 3) 더 할 게 없으면 턴 종료
  endTurn(game);
  return false;
}
