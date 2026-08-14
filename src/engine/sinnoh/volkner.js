const MAX_VOLTAGE = 3;
const OVERLOAD_DAMAGE = 1;
const MAX_ELECTIVIRE_STACKS = 3;

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

export function isVolknerBattle(game) {
  return game?.trainer?.gimmick === "power_grid";
}

export function getVolknerVoltage(game) {
  return isVolknerBattle(game) ? Math.max(0, game._volknerVoltage || 0) : 0;
}

export function syncVolknerVisual(game) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const active = isVolknerBattle(game);
  const voltage = active ? getVolknerVoltage(game) : 0;

  if (active) document.body.dataset.volknerVoltage = String(voltage);
  else delete document.body.dataset.volknerVoltage;

  window.dispatchEvent(
    new CustomEvent("volkner-voltage-change", {
      detail: { active, voltage },
    }),
  );
}

export function initVolknerBattle(game) {
  if (!isVolknerBattle(game)) {
    syncVolknerVisual(game);
    return;
  }

  game._volknerVoltage = 0;
  syncVolknerVisual(game);
}

function appendImpact(game, impact) {
  if (!game.lastAction) return;
  if (!Array.isArray(game.lastAction.impacts)) game.lastAction.impacts = [];

  const existing = game.lastAction.impacts.find(
    (entry) =>
      entry.type === impact.type &&
      entry.side === impact.side &&
      entry.targetUid === impact.targetUid,
  );

  if (existing && impact.type === "damage") existing.amount += impact.amount;
  else game.lastAction.impacts.push(impact);
}

function boostVolknerElectivire(game) {
  const electivire = game.players.enemy.field.find(
    (unit) => unit.hp > 0 && unit.ability === "volkner_overdrive",
  );

  if (!electivire) return false;
  if ((electivire._volknerOverdriveStacks || 0) >= MAX_ELECTIVIRE_STACKS) {
    return false;
  }

  electivire._volknerOverdriveStacks =
    (electivire._volknerOverdriveStacks || 0) + 1;
  electivire.atk += 1;
  electivire.baseAtk = (electivire.baseAtk ?? electivire.atk - 1) + 1;

  appendImpact(game, {
    type: "buff",
    side: "enemy",
    targetUid: electivire.uid,
    amount: 1,
  });

  pushLog(
    game,
    `${electivire.name}의 오버드라이브! 과부하를 흡수해 공격력 +1! (${electivire._volknerOverdriveStacks}/${MAX_ELECTIVIRE_STACKS})`,
  );

  return true;
}

export function chargeVolknerGrid(game, attacker) {
  if (!isVolknerBattle(game) || game.winner) return false;
  if (!attacker || attacker.side !== "enemy" || attacker.type !== "전기") {
    return false;
  }

  game._volknerVoltage = Math.min(
    MAX_VOLTAGE,
    getVolknerVoltage(game) + 1,
  );

  if (game._volknerVoltage < MAX_VOLTAGE) {
    pushLog(
      game,
      `전진의 전력망이 충전된다! (${game._volknerVoltage}/${MAX_VOLTAGE})`,
    );
    syncVolknerVisual(game);
    return false;
  }

  const player = game.players.player;

  const heroBefore = player.hp;
  player.hp = Math.max(0, player.hp - OVERLOAD_DAMAGE);
  const heroDamage = Math.max(0, heroBefore - player.hp);
  if (heroDamage > 0) {
    appendImpact(game, {
      type: "damage",
      side: "player",
      targetUid: "hero",
      amount: heroDamage,
    });
  }

  player.field.forEach((unit) => {
    if (unit.hp <= 0) return;
    const before = unit.hp;
    unit.hp -= OVERLOAD_DAMAGE;
    const dealt = Math.max(0, before - unit.hp);
    if (dealt > 0) {
      appendImpact(game, {
        type: "damage",
        side: "player",
        targetUid: unit.uid,
        amount: dealt,
      });
    }
  });

  game._volknerVoltage = 0;

  pushLog(
    game,
    `전력망 과부하! 플레이어와 필드 전체에 피해 ${OVERLOAD_DAMAGE}!`,
  );

  boostVolknerElectivire(game);
  syncVolknerVisual(game);
  return true;
}

export function resetVolknerGridIfEnemyDefeated(game, beforeIds) {
  if (!isVolknerBattle(game) || !beforeIds || getVolknerVoltage(game) <= 0) {
    return false;
  }

  const defeated = [...beforeIds].some((uid) => {
    const unit = game.players.enemy.field.find((entry) => entry.uid === uid);
    return !unit || unit.hp <= 0;
  });

  if (!defeated) return false;

  game._volknerVoltage = 0;
  pushLog(game, "전진의 포켓몬이 쓰러져 전력망의 충전이 끊겼다!");
  syncVolknerVisual(game);
  return true;
}
