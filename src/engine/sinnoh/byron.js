const MAX_ARMOR = 2;
const METAL_BURST_DAMAGE = 1;
const BYRON_STURDY_ABILITY = "byron_sturdy";
const BYRON_FOCUS_SASH_ITEM = "byron_focussash";

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

export function isByronBattle(game) {
  return game?.trainer?.gimmick === "foundry_armor";
}

function normalizeByronSurvivalTriggers(unit) {
  // 기본 엔진의 옹골참/기합의띠는 실제 HP만 보고 치명타를 판정한다.
  // 동관전에서는 방어도 + HP가 총내구이므로 전용 식별자로 바꾼 뒤
  // 아래 HP setter에서 총내구 기준으로 직접 판정한다.
  if (unit.ability === "sturdy") {
    unit.ability = BYRON_STURDY_ABILITY;
  }

  if (unit.secondaryAbility === "sturdy") {
    unit.secondaryAbility = BYRON_STURDY_ABILITY;
  }

  if (unit.item === "focussash") {
    unit.item = BYRON_FOCUS_SASH_ITEM;
  }
}

function hasByronSturdy(unit) {
  return (
    unit.ability === BYRON_STURDY_ABILITY ||
    unit.secondaryAbility === BYRON_STURDY_ABILITY
  );
}

function hasByronFocusSash(unit) {
  return unit.item === BYRON_FOCUS_SASH_ITEM && !unit.focusSashUsed;
}

function bindArmorHp(unit, game) {
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

      // 회복과 최대 HP 증가는 실제 HP에만 적용한다.
      // 방어도는 철벽 기믹으로만 회복된다.
      if (next >= currentHp) {
        this._byronRealHp = next;
        return;
      }

      // 멸망의노래는 피해가 아니라 강제 기절 판정이다.
      // 방어도 및 옹골참/기합의띠로 막지 않는다.
      if (next <= 0 && this._perishCount != null && this._perishCount <= 0) {
        this._byronArmor = 0;
        this._byronRealHp = 0;
        this._byronArmorAbsorbedPending = 0;
        return;
      }

      // 방어도는 공격 횟수제가 아니라 HP 앞에 붙은 추가 내구도다.
      // 예) 방어도 2 + HP 3에 피해 4 => 방어도 0 + HP 1.
      const incomingDamage = Math.max(0, currentHp - next);
      const totalDurabilityBefore = currentHp + armorBefore;
      let totalDurabilityAfter = Math.max(
        0,
        totalDurabilityBefore - incomingDamage,
      );

      // 옹골참과 기합의띠도 방어도를 포함한 총내구가
      // 한 번에 전부 소진될 때만 체력 1을 남긴다.
      const atFullHp = currentHp === Math.max(0, Number(this.maxHp) || 0);
      let survivalMessage = null;

      if (totalDurabilityAfter <= 0 && atFullHp) {
        if (hasByronSturdy(this)) {
          totalDurabilityAfter = 1;
          survivalMessage = `${this.name}의 옹골참! 방어도까지 무너졌지만 체력 1을 남기고 버텼다!`;
        } else if (hasByronFocusSash(this)) {
          totalDurabilityAfter = 1;
          this.focusSashUsed = true;
          survivalMessage = `${this.name}은(는) 기합의띠로 방어도까지 무너진 공격을 버티고 체력 1이 남았다!`;
        }
      }

      const armorAfter = Math.max(0, armorBefore - incomingDamage);
      const hpAfter = Math.max(0, totalDurabilityAfter - armorAfter);
      const absorbed = Math.max(0, armorBefore - armorAfter);

      this._byronArmor = armorAfter;
      this._byronRealHp = hpAfter;
      this._byronArmorAbsorbedPending =
        (this._byronArmorAbsorbedPending || 0) + absorbed;

      if (survivalMessage) {
        pushLog(game, survivalMessage);
      }
    },
  });
}

export function ensureByronArmor(game) {
  if (!isByronBattle(game)) {
    clearByronArmorVisual();
    return;
  }

  game.players.enemy.field.forEach((unit) => {
    bindArmorHp(unit, game);
    normalizeByronSurvivalTriggers(unit);
  });

  syncByronArmorVisual(game);
}

export function getByronArmor(unit) {
  return Math.max(0, unit?._byronArmor || 0);
}

export function getByronDurability(unit) {
  const hp = Math.max(0, Number(unit?.hp) || 0);
  return hp + getByronArmor(unit);
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
