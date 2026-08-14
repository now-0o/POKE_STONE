const MAX_ARMOR = 2;
const METAL_BURST_DAMAGE = 1;

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

export function isByronBattle(game) {
  return game?.trainer?.gimmick === "foundry_armor";
}

function bindArmorHp(unit) {
  if (unit._byronArmorBound) return;

  const initialHp = Math.max(0, Number(unit.hp) || 0);
  unit._byronRealHp = initialHp;
  unit._byronArmor = MAX_ARMOR;
  unit._byronArmorBound = true;
  unit._byronArmorAbsorbedPending = 0;

  Object.defineProperty(unit, "hp", {
    configurable: true,
    enumerable: true,
    get() {
      return this._byronRealHp;
    },
    set(value) {
      const next = Number(value);
      if (!Number.isFinite(next)) {
        this._byronRealHp = value;
        return;
      }

      const currentHp = Math.max(0, Number(this._byronRealHp) || 0);
      const armorBefore = Math.max(0, Number(this._byronArmor) || 0);

      if (next >= currentHp) {
        this._byronRealHp = next;
        return;
      }

      const incomingDamage = Math.max(0, currentHp - next);
      const totalDurabilityBefore = currentHp + armorBefore;
      const totalDurabilityAfter = Math.max(
        0,
        totalDurabilityBefore - incomingDamage,
      );
      const armorAfter = Math.max(0, armorBefore - incomingDamage);
      const hpAfter = Math.max(0, totalDurabilityAfter - armorAfter);
      const absorbed = Math.max(0, armorBefore - armorAfter);

      this._byronArmor = armorAfter;
      this._byronRealHp = hpAfter;
      this._byronArmorAbsorbedPending =
        (this._byronArmorAbsorbedPending || 0) + absorbed;
    },
  });
}

export function ensureByronArmor(game) {
  if (!isByronBattle(game)) {
    clearByronArmorVisual();
    return;
  }

  game.players.enemy.field.forEach((unit) => {
    bindArmorHp(unit);
  });

  syncByronArmorVisual(game);
}

export function getByronArmor(unit) {
  return Math.max(0, unit?._byronArmor || 0);
}

export function flushByronArmorLogs(game) {
  if (!isByronBattle(game)) return;

  game.players.enemy.field.forEach((unit) => {
    const absorbed = unit._byronArmorAbsorbedPending || 0;
    if (absorbed <= 0) return;

    unit._byronArmorAbsorbedPending = 0;
    const armor = getByronArmor(unit);
    const hp = Math.max(0, Number(unit.hp) || 0);

    pushLog(
      game,
      `${unit.name}의 방어도가 피해 ${absorbed}을 흡수했다! (방어도 ${armor} + HP ${hp} = 내구 ${armor + hp})`,
    );
  });
}

function addDamageImpact(game, targetUid, amount) {
  if (!game.lastAction || amount <= 0) return;
  if (!Array.isArray(game.lastAction.impacts)) game.lastAction.impacts = [];

  game.lastAction.impacts.push({
    type: "damage",
    side: "player",
    targetUid,
    amount,
  });
}

export function handleByronMetalBurst(game, attacker, target, armorBefore) {
  if (!isByronBattle(game)) return false;
  if (!attacker || attacker.side !== "player") return false;
  if (!target || target.ability !== "byron_ironwall") return false;
  if (armorBefore <= 0 || getByronArmor(target) > 0) return false;

  const beforeHp = attacker.hp;
  attacker.hp -= METAL_BURST_DAMAGE;
  const dealt = Math.max(0, beforeHp - attacker.hp);
  addDamageImpact(game, attacker.uid, dealt);

  pushLog(
    game,
    `${target.name}의 메탈버스트! 방어도가 완전히 파괴되며 공격한 ${attacker.name}에게 피해 ${dealt}!`,
  );

  return dealt > 0;
}

export function regenByronBastiodonArmor(game) {
  if (!isByronBattle(game)) return false;

  const bastiodon = game.players.enemy.field.find(
    (unit) => unit.hp > 0 && unit.ability === "byron_ironwall",
  );

  if (!bastiodon) return false;
  if (getByronArmor(bastiodon) >= MAX_ARMOR) return false;

  bastiodon._byronArmor = Math.min(MAX_ARMOR, getByronArmor(bastiodon) + 1);
  pushLog(
    game,
    `${bastiodon.name}의 철벽! 방어도 +1. (방어도 ${getByronArmor(bastiodon)})`,
  );
  syncByronArmorVisual(game);
  return true;
}

export function initByronBattle(game) {
  if (!isByronBattle(game)) {
    clearByronArmorVisual();
    return;
  }

  ensureByronArmor(game);
}

export function syncByronArmorVisual(game) {
  if (typeof window === "undefined") return;

  if (!isByronBattle(game)) {
    clearByronArmorVisual();
    return;
  }

  const armors = {};
  game.players.enemy.field.forEach((unit) => {
    if (!unit._byronArmorBound) return;
    armors[unit.uid] = getByronArmor(unit);
  });

  window.__pokeSinnohArmor = armors;
  window.dispatchEvent(
    new CustomEvent("byron-armor-change", {
      detail: { armors },
    }),
  );
}

export function clearByronArmorVisual() {
  if (typeof window === "undefined") return;
  window.__pokeSinnohArmor = {};
  window.dispatchEvent(
    new CustomEvent("byron-armor-change", {
      detail: { armors: {} },
    }),
  );
}
