const MAX_MANA = 10;
const LUXRAY_MAX_CHARGES = 3;
const LUXRAY_REQUIRED_MANA = 2;

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

export function isVolknerBattle(game) {
  return game?.trainer?.gimmick === "valley_windworks";
}

export function isElectricCard(card) {
  return card?.type === "전기" || card?.moveType === "전기";
}

function findVolknerLuxray(game) {
  return game.players.enemy.field.find(
    (unit) => unit.hp > 0 && unit.ability === "volkner_charge",
  );
}

export function syncVolknerVisual(game) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const active = isVolknerBattle(game);
  const luxray = active ? findVolknerLuxray(game) : null;
  const stacks = Math.max(0, luxray?._volknerChargeStacks || 0);
  const discountAvailable =
    active && game.turn === "enemy" && !game._volknerFirstElectricUsed;

  if (active) {
    document.body.dataset.volknerCharge = String(stacks);
    document.body.dataset.volknerDiscount = discountAvailable ? "1" : "0";
  } else {
    delete document.body.dataset.volknerCharge;
    delete document.body.dataset.volknerDiscount;
  }

  window.dispatchEvent(
    new CustomEvent("volkner-state-change", {
      detail: { active, stacks, discountAvailable },
    }),
  );
}

export function applyVolknerTurnStart(game, side) {
  if (!isVolknerBattle(game) || game.winner) return false;

  const player = game.players[side];
  const before = player.maxMana;

  // 기본 엔진이 턴마다 +1을 적용한 직후 추가로 +1을 더해 총 +2가 된다.
  player.maxMana = Math.min(MAX_MANA, player.maxMana + 1);
  player.mana = player.maxMana;

  if (side === "enemy") {
    game._volknerFirstElectricUsed = false;
  }

  if (player.maxMana > before) {
    pushLog(
      game,
      `골짜기발전소의 전력 공급! ${player.name}의 최대 마나가 이번 턴 총 2 증가했다.`,
    );
  }

  syncVolknerVisual(game);
  return true;
}

export function initVolknerBattle(game) {
  game._volknerFirstElectricUsed = false;

  if (!isVolknerBattle(game)) {
    syncVolknerVisual(game);
    return;
  }

  applyVolknerTurnStart(game, game.turn);
}

export function getVolknerCardDiscount(game, side, card) {
  if (!isVolknerBattle(game) || side !== "enemy") return 0;
  if (game._volknerFirstElectricUsed) return 0;
  return isElectricCard(card) ? 1 : 0;
}

export function markVolknerElectricCardPlayed(game, side, card) {
  if (getVolknerCardDiscount(game, side, card) <= 0) return false;

  game._volknerFirstElectricUsed = true;
  pushLog(game, "발전소 전력 지원! 전진의 첫 전기 카드 비용이 1 감소했다.");
  syncVolknerVisual(game);
  return true;
}

export function shouldReserveVolknerMana(game, side) {
  if (!isVolknerBattle(game) || side !== "enemy" || game.turn !== "enemy") {
    return false;
  }

  const luxray = findVolknerLuxray(game);
  if (!luxray) return false;

  return (luxray._volknerChargeStacks || 0) < LUXRAY_MAX_CHARGES;
}

export function resolveVolknerPlayerManaPenalty(game) {
  if (!isVolknerBattle(game) || game.turn !== "player" || game.winner) {
    return 0;
  }

  const player = game.players.player;
  const remainingMana = Math.max(0, Number(player.mana) || 0);
  const rawDamage = Math.floor(remainingMana / 2);
  const damage = Math.min(rawDamage, Math.max(0, player.hp));

  if (damage <= 0) return 0;

  player.hp = Math.max(0, player.hp - damage);

  game.animSeq = (game.animSeq || 0) + 1;
  game.lastAction = {
    seq: game.animSeq,
    kind: "ability",
    side: "enemy",
    cardId: "sinnoh_volkner_luxray",
    impacts: [
      {
        type: "damage",
        side: "player",
        targetUid: "hero",
        amount: damage,
      },
    ],
  };

  pushLog(
    game,
    `발전소 과부하! 남은 마나 ${remainingMana}의 절반(내림)만큼 플레이어가 피해 ${damage}을 받았다!`,
  );

  if (player.hp <= 0 && !game.winner) {
    game.winner = "enemy";
  }

  return damage;
}

export function resolveVolknerTurnEnd(game) {
  if (!isVolknerBattle(game) || game.turn !== "enemy" || game.winner) {
    return false;
  }

  const enemy = game.players.enemy;
  const luxray = findVolknerLuxray(game);

  if (!luxray || enemy.mana < LUXRAY_REQUIRED_MANA) return false;
  if ((luxray._volknerChargeStacks || 0) >= LUXRAY_MAX_CHARGES) return false;

  luxray._volknerChargeStacks = (luxray._volknerChargeStacks || 0) + 1;
  luxray.atk += 1;
  luxray.baseAtk = (luxray.baseAtk ?? luxray.atk - 1) + 1;
  luxray.maxHp += 1;
  luxray.hp += 1;

  game.animSeq = (game.animSeq || 0) + 1;
  game.lastAction = {
    seq: game.animSeq,
    kind: "ability",
    side: "enemy",
    cardId: "sinnoh_volkner_luxray",
    uid: luxray.uid,
    impacts: [
      {
        type: "buff",
        side: "enemy",
        targetUid: luxray.uid,
        amount: 1,
      },
      {
        type: "heal",
        side: "enemy",
        targetUid: luxray.uid,
        amount: 1,
      },
    ],
  };

  pushLog(
    game,
    `${luxray.name}의 충전! 마나 2 이상을 남겨 +1/+1! (${luxray._volknerChargeStacks}/${LUXRAY_MAX_CHARGES})`,
  );

  syncVolknerVisual(game);
  return true;
}
