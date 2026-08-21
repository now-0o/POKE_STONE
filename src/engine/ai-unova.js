import * as legacyAI from "./ai.js";
import { CARD_MAP } from "../data/cards.js";
import {
  playCard,
  attack,
  endTurn,
  canPlayCard,
  canAttack,
  validAttackTargets,
  effectiveAtk,
  effectiveCost,
  calcTypedDamage,
  spellDamageAmount,
  spellNeedsTarget,
  discardToDraw,
} from "./engine.js";

const SIDE = "enemy";

function isUnova(game) {
  return game?.trainer?.region === "unova";
}

function hasAbility(unit, ability) {
  return unit?.ability === ability || unit?.secondaryAbility === ability;
}

function cardIdOf(entry) {
  return typeof entry === "string" ? entry : entry?.cardId;
}

function unitValue(unit, game) {
  if (!unit) return 0;
  let value = effectiveAtk(unit, game) * 2.2 + unit.hp + unit.maxHp * 0.45;
  if (unit.stage) value += unit.stage * 4;
  if (unit.rarity === "L") value += 14;
  else if (unit.rarity === "E") value += 7;
  if (unit.ability === "taunt" || unit.ability === "fortress") value += 7;
  if (unit.item) value += 3;
  return value;
}

function isEvolutionCard(card) {
  return card?.kind === "pokemon" && !!card.evolvesFrom;
}

function nextEvolutionInHand(game, cardId) {
  return game.players[SIDE].hand.some((entry) => {
    const card = CARD_MAP[entry.cardId];
    return card?.kind === "pokemon" && card.evolvesFrom === cardId;
  });
}

function evolutionBaseExists(game, evolvesFrom) {
  const me = game.players[SIDE];
  return (
    me.field.some((unit) => unit.cardId === evolvesFrom && unit.hp > 0 && !unit.noEvolve) ||
    me.hand.some((entry) => entry.cardId === evolvesFrom) ||
    me.deck.some((entry) => cardIdOf(entry) === evolvesFrom)
  );
}

function isFreeVoltReplay(handCard, card) {
  return !!handCard?._voltSwitchFreePlay && isEvolutionCard(card);
}

function itemTarget(game, card) {
  const me = game.players[SIDE];
  const effect = card.item?.effect;
  let candidates = me.field.filter((unit) => unit.hp > 0 && !unit.item);

  // 풍선은 이미 땅 면역인 비행/부유 포켓몬에게 낭비하지 않는다.
  if (effect === "air_balloon") {
    candidates = candidates.filter(
      (unit) => unit.type !== "비행" && !hasAbility(unit, "levitate"),
    );
  }
  if (!candidates.length) return null;

  const score = (unit) => {
    let s = unitValue(unit, game);
    if (effect === "air_balloon") {
      s += unit.type === "전기" || unit.type === "불꽃" || unit.type === "강철" ? 6 : 0;
    }
    if (effect === "lifeorb") s += effectiveAtk(unit, game) * 3;
    if (effect === "focussash") {
      s += unit.hp === unit.maxHp ? effectiveAtk(unit, game) * 3 : -30;
      if (hasAbility(unit, "sturdy") || hasAbility(unit, "disguise")) s -= 35;
    }
    if (effect === "shellbell") s += (unit.maxHp - unit.hp) * 2 + effectiveAtk(unit, game);
    if (effect === "eject_button" || effect === "red_card") s += unit.hp * 1.2;
    return s;
  };

  candidates.sort((a, b) => score(b) - score(a));
  return { uid: candidates[0].uid };
}

function friendlyTarget(game, card) {
  const me = game.players[SIDE];
  if (card.kind === "item") return itemTarget(game, card);

  const effect = card.spell?.effect;
  if (effect === "heal" || effect === "fullheal") {
    const options = [];
    if (me.hp < me.maxHp) {
      options.push({ uid: "hero", score: (me.maxHp - me.hp) * 7 + (me.hp <= 12 ? 24 : 0) });
    }
    for (const unit of me.field) {
      const missing = unit.maxHp - unit.hp;
      if (missing <= 0 && !unit.status) continue;
      options.push({
        uid: unit.uid,
        score: missing * 7 + unitValue(unit, game) * 0.35 + (unit.status ? 10 : 0),
      });
    }
    options.sort((a, b) => b.score - a.score);
    return options[0] ? { uid: options[0].uid } : null;
  }

  if (effect === "cure_status" || effect === "cure_all_status") {
    const candidates = me.field.filter((unit) => unit.status);
    candidates.sort((a, b) => unitValue(b, game) - unitValue(a, game));
    return candidates[0] ? { uid: candidates[0].uid } : null;
  }

  const candidates = [...me.field].sort((a, b) => unitValue(b, game) - unitValue(a, game));
  return candidates[0] ? { uid: candidates[0].uid } : null;
}

function directDamageEffect(effect) {
  return [
    "damage",
    "damage_draw",
    "damage_freeze",
    "damage_status",
    "multi_damage",
    "piercing_damage",
    "damage_bounce",
    "damage_recall_friendly",
    "damage_grant_rush",
    "acrobatics",
  ].includes(effect);
}

function spellTarget(game, card, handCard) {
  if (isFreeVoltReplay(handCard, card)) return null;
  const me = game.players[SIDE];
  const foe = game.players.player;
  const need = spellNeedsTarget(card);

  if (need === "evolve") {
    const bases = me.field.filter(
      (unit) => unit.cardId === card.evolvesFrom && unit.hp > 0 && !unit.noEvolve,
    );
    bases.sort((a, b) => b.hp / b.maxHp - a.hp / a.maxHp);
    return bases[0] ? { uid: bases[0].uid } : null;
  }

  if (need === "mega") {
    const bases = me.field.filter((unit) => unit.cardId === card.megaFor && !unit.mega);
    bases.sort((a, b) => unitValue(b, game) - unitValue(a, game));
    return bases[0] ? { uid: bases[0].uid } : null;
  }

  if (need === "friendly" || need === "friendly-or-hero") {
    return friendlyTarget(game, card);
  }

  if (need === "enemy") {
    const base = spellDamageAmount(card, game);
    const effect = card.spell?.effect;

    // 하나지방부터는 적 필드가 비었다고 기술을 무조건 본체에 버리지 않는다.
    // 확정 킬 또는 현재 공격까지 합친 킬각일 때만 본체 기술 사용을 허용한다.
    if (!foe.field.length) {
      const faceDamage = game.players[SIDE].field
        .filter((unit) => canAttack(game, SIDE, unit.uid))
        .filter((unit) => validAttackTargets(game, SIDE, unit.uid).hero)
        .reduce((sum, unit) => sum + effectiveAtk(unit, game), 0);
      if (directDamageEffect(effect) && (foe.hp <= base || foe.hp <= base + faceDamage)) {
        return { uid: "hero" };
      }
      return null;
    }

    const scored = foe.field.map((unit) => {
      const dmg = calcTypedDamage(base, card.moveType, unit.type);
      const lethal = dmg >= unit.hp;
      return {
        uid: unit.uid,
        score: lethal ? 100 + unitValue(unit, game) : dmg * 5 + unitValue(unit, game) * 0.5,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0] ? { uid: scored[0].uid } : null;
  }

  return null;
}

function playableCards(game) {
  const me = game.players[SIDE];
  const result = [];
  me.hand.forEach((handCard, idx) => {
    if (!canPlayCard(game, SIDE, idx)) return;
    const card = CARD_MAP[handCard.cardId];
    if (card) result.push({ idx, handCard, card });
  });
  return result;
}

function boardWideScore(game, card) {
  const foe = game.players.player;
  const base = spellDamageAmount(card, game);
  if (!foe.field.length) return -100;
  let score = foe.field.length * 16;
  for (const unit of foe.field) {
    const dmg = calcTypedDamage(base, card.moveType, unit.type);
    score += Math.min(dmg, unit.hp) * 5;
    if (dmg >= unit.hp) score += 28 + unitValue(unit, game) * 0.6;
  }
  if (foe.field.length >= 3) score += 45;
  if (foe.field.length >= 5) score += 35;
  return score;
}

function cardScore(game, entry) {
  const { card, handCard } = entry;
  const me = game.players[SIDE];
  const foe = game.players.player;
  const cost = effectiveCost(card, game, SIDE, handCard);
  let score = 12 + cost * 5;

  if (card.kind === "pokemon") {
    score += (card.atk || 0) * 2 + (card.hp || 0);

    if (isFreeVoltReplay(handCard, card)) score += 85 + (card.stage || 0) * 15;

    if (card.evolvesFrom && !isFreeVoltReplay(handCard, card)) {
      const baseOnField = me.field.some((unit) => unit.cardId === card.evolvesFrom && !unit.noEvolve);
      if (baseOnField) score += 90 + (card.stage || 0) * 18;
    } else if (nextEvolutionInHand(game, card.id)) {
      score += 52;
    }

    if (!card.evolvesFrom && me.field.length === 0) score += 48;
    if (card.signature || card.id === game.trainer?.signatureCard) score += 24;
    if (foe.field.length >= 3 && card.ability === "intimidate") score += 18;
  }

  if (card.kind === "item") {
    if (!itemTarget(game, card)) return -999;
    if (card.item?.effect === "air_balloon") score += 18;
    if (card.item?.effect === "lifeorb") score += 22;
    if (card.item?.effect === "focussash") score += 20;
  }

  if (card.kind === "spell") {
    const effect = card.spell?.effect;

    if (effect === "aoe") return boardWideScore(game, card);

    if (directDamageEffect(effect)) {
      const base = spellDamageAmount(card, game);
      if (!foe.field.length) {
        const faceDamage = me.field
          .filter((unit) => canAttack(game, SIDE, unit.uid))
          .reduce((sum, unit) => sum + effectiveAtk(unit, game), 0);
        if (foe.hp <= base) return 1000;
        if (foe.hp <= base + faceDamage) return 650;
        return -160;
      }

      let best = 0;
      for (const unit of foe.field) {
        const dmg = calcTypedDamage(base, card.moveType, unit.type);
        best = Math.max(
          best,
          dmg >= unit.hp
            ? 65 + unitValue(unit, game)
            : dmg * 5 + unitValue(unit, game) * 0.25,
        );
      }
      score += best;
      if (effect === "damage_draw") score += 12;
    }

    if (effect === "weather") {
      if (game.weather === card.spell.weather) return -120;
      score += me.field.length * 6;
    }

    if (["heal", "fullheal", "cure_status", "cure_all_status"].includes(effect)) {
      if (!friendlyTarget(game, card)) return -999;
      if (me.hp <= 12) score += 35;
    }

    if (effect === "reflect" && foe.field.length >= 2) score += 35;
    if (effect === "light_screen" && foe.hand.length >= 3) score += 24;
    if (effect?.startsWith?.("tutor_")) score += 20;
  }

  return score;
}

function chooseAttack(game) {
  const me = game.players[SIDE];
  const foe = game.players.player;
  const attackers = me.field.filter((unit) => canAttack(game, SIDE, unit.uid));
  let best = null;
  let bestScore = -Infinity;

  for (const attacker of attackers) {
    const targets = validAttackTargets(game, SIDE, attacker.uid);
    const protectedEvolutionBase = nextEvolutionInHand(game, attacker.cardId);

    for (const defender of targets.units) {
      const dmg = calcTypedDamage(effectiveAtk(attacker, game), attacker.type, defender.type);
      const back = calcTypedDamage(effectiveAtk(defender, game), defender.type, attacker.type);
      const kills = dmg >= defender.hp;
      const dies = back >= attacker.hp;
      let score = kills ? 70 + unitValue(defender, game) * 2 : dmg * 4;
      if (dies) score -= unitValue(attacker, game) * 2.5;
      if (dies && !kills) score -= 40;
      if (protectedEvolutionBase && dies) score -= 65;
      if (kills && !dies) score += 28;
      if (score > bestScore) {
        bestScore = score;
        best = { attacker, target: { uid: defender.uid } };
      }
    }

    if (targets.hero) {
      let score = effectiveAtk(attacker, game) * 2;
      if (foe.hp <= effectiveAtk(attacker, game)) score += 1000;
      if (!foe.field.length) score += 25;
      if (protectedEvolutionBase) score += 18; // 진화 기반을 살리며 안전하게 직공
      if (score > bestScore) {
        bestScore = score;
        best = { attacker, target: { uid: "hero" } };
      }
    }
  }
  return best;
}

function impossibleEvolutionDiscard(game, force = false) {
  const me = game.players[SIDE];
  if (me.discardUsedThisTurn) return null;

  const candidates = me.hand
    .map((handCard, idx) => ({ handCard, idx, card: CARD_MAP[handCard.cardId] }))
    .filter(({ card, handCard }) => isEvolutionCard(card) && !isFreeVoltReplay(handCard, card))
    .filter(({ idx }) => !canPlayCard(game, SIDE, idx));

  if (!candidates.length) return null;

  const deadRoute = candidates.filter(({ card }) => !evolutionBaseExists(game, card.evolvesFrom));
  if (deadRoute.length) {
    deadRoute.sort((a, b) => (a.card.cost || 0) - (b.card.cost || 0));
    return deadRoute[0].idx;
  }

  // 루트가 덱/손에 살아 있으면 웬만하면 진화체를 보존한다.
  if (!force && me.hand.length < 8) return null;
  candidates.sort((a, b) => (a.card.cost || 0) - (b.card.cost || 0));
  return candidates[0].idx;
}

function drawScore(game, card) {
  if (!card) return -999;
  const me = game.players[SIDE];
  const foe = game.players.player;
  const nextMana = Math.min(10, (me.maxMana || 0) + 1);
  let score = 0;

  if ((card.cost || 0) <= nextMana) score += 18;
  else score -= Math.min(30, ((card.cost || 0) - nextMana) * 8);

  if (card.kind === "pokemon") {
    const baseOnField = card.evolvesFrom && me.field.some(
      (unit) => unit.cardId === card.evolvesFrom && unit.hp > 0 && !unit.noEvolve,
    );
    if (baseOnField) score += 145 + (card.stage || 0) * 20;
    if (!card.evolvesFrom && nextEvolutionInHand(game, card.id)) score += 105;
    if (!card.evolvesFrom && me.field.length === 0) score += 75;
    if (card.id === game.trainer?.signatureCard) score += 35;
  }

  if (card.kind === "spell") {
    const effect = card.spell?.effect;
    if (effect === "aoe") {
      score += foe.field.length >= 3 ? 130 + foe.field.length * 15 : -25;
    } else if (directDamageEffect(effect)) {
      if (!foe.field.length) score -= 70;
      else {
        const base = spellDamageAmount(card, game);
        const kills = foe.field.filter(
          (unit) => calcTypedDamage(base, card.moveType, unit.type) >= unit.hp,
        ).length;
        score += foe.field.length * 10 + kills * 45;
      }
    }
    if ((effect === "heal" || effect === "fullheal") && me.hp <= 14) score += 80;
  }

  if (card.kind === "item") {
    if (card.item?.effect === "air_balloon") {
      const useful = me.field.some(
        (unit) => !unit.item && unit.type !== "비행" && !hasAbility(unit, "levitate"),
      );
      score += useful ? 20 : -55;
    }
  }

  return score;
}

function prepareSituationalNextDraw(game) {
  const me = game.players[SIDE];
  if (!me.deck?.length) return;
  const scored = me.deck
    .map((entry, idx) => ({ idx, entry, card: CARD_MAP[cardIdOf(entry)] }))
    .map((entry) => ({ ...entry, score: drawScore(game, entry.card) }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return;
  const assist = Math.max(0.75, Math.min(0.99, Number(game.trainer?.consistencyAssist) || 0.95));
  const pick = Math.random() < assist
    ? scored[0]
    : scored[Math.floor(Math.random() * Math.min(3, scored.length))];
  if (!pick || pick.idx === me.deck.length - 1) return;

  const [entry] = me.deck.splice(pick.idx, 1);
  me.deck.push(entry); // drawCard가 pop()을 쓰므로 다음 드로우 위치
}

function handlePendingWithLegacy(game) {
  if (game.pendingBattlecry?.side === SIDE) return legacyAI.aiStep(game);
  return null;
}

export function aiStep(game) {
  if (!isUnova(game)) return legacyAI.aiStep(game);
  if (game.winner || game.turn !== SIDE) return false;

  if (
    game.trainer?.gimmick === "elesa_spotlight" &&
    typeof window !== "undefined" &&
    window.__pokeElesaSpotlightBusy
  ) {
    return false;
  }

  const pending = handlePendingWithLegacy(game);
  if (pending !== null) return pending;

  const playable = playableCards(game)
    .map((entry) => ({ ...entry, score: cardScore(game, entry) }))
    .sort((a, b) => b.score - a.score);

  for (const entry of playable) {
    if (entry.score <= -900) continue;
    const target = spellTarget(game, entry.card, entry.handCard);
    const need = isFreeVoltReplay(entry.handCard, entry.card)
      ? null
      : spellNeedsTarget(entry.card);
    if (need && !target) continue;
    if (playCard(game, SIDE, entry.idx, target)) return true;
  }

  // 진화 루트가 완전히 끊긴 카드는 손이 적어도 바로 순환시킨다.
  let discardIdx = impossibleEvolutionDiscard(game, false);
  if (discardIdx !== null && discardToDraw(game, SIDE, discardIdx)) return true;

  const choice = chooseAttack(game);
  if (choice && attack(game, SIDE, choice.attacker.uid, choice.target)) return true;

  // 아무 행동도 못 했을 때는 루트가 남은 막힌 진화패도 손이 차면 순환한다.
  discardIdx = impossibleEvolutionDiscard(game, true);
  if (discardIdx !== null && game.players[SIDE].hand.length >= 7) {
    if (discardToDraw(game, SIDE, discardIdx)) return true;
  }

  prepareSituationalNextDraw(game);
  endTurn(game);
  return false;
}
