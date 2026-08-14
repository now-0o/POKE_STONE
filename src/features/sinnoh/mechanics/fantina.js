const GHOST_HP = 3;
const DRAIN_MAX_STACKS = 3;

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

export function isFantinaBattle(game) {
  return game?.trainer?.gimmick === "haunted_echoes";
}

export function initFantinaBattle(game) {
  if (!isFantinaBattle(game)) return;
  game._fantinaGhostSeq = 0;
}

export function captureFantinaPlayerField(game) {
  if (!isFantinaBattle(game)) return [];

  return game.players.player.field
    .filter((unit) => !unit._fantinaGhost)
    .map((unit, index) => ({ unit, index }));
}

function makeFantinaGhost(game, source) {
  game._fantinaGhostSeq = (game._fantinaGhostSeq || 0) + 1;

  return {
    uid: `fantina-ghost-${game._fantinaGhostSeq}`,
    cardId: source.cardId,
    name: `${source.name}의 유령`,
    type: "고스트",
    atk: 0,
    baseAtk: 0,
    hp: GHOST_HP,
    maxHp: GHOST_HP,
    rarity: source.rarity,
    emoji: source.emoji,
    ability: null,
    secondaryAbility: null,
    stage: source.stage || 0,
    canAttack: false,
    summonedTurn: game.turnCount,
    frozen: 0,
    status: null,
    statusTurns: 0,
    sturdyUsed: false,
    focusSashUsed: false,
    mega: false,
    item: null,
    noEvolve: true,
    side: "player",
    _fantinaGhost: true,
    _deathProcessed: false,
  };
}

export function spawnFantinaGhostsFromDeaths(game, beforeField) {
  if (!isFantinaBattle(game) || !beforeField?.length) return 0;

  const player = game.players.player;
  const currentUids = new Set(player.field.map((unit) => unit.uid));
  const fieldCapacity = player.fieldCapacity ?? 6;
  let spawned = 0;

  const deaths = beforeField
    .filter(({ unit }) => unit.hp <= 0 && !currentUids.has(unit.uid))
    .sort((a, b) => a.index - b.index);

  deaths.forEach(({ unit, index }) => {
    if (player.field.length >= fieldCapacity) return;

    const ghost = makeFantinaGhost(game, unit);
    const insertAt = Math.max(0, Math.min(index, player.field.length));
    player.field.splice(insertAt, 0, ghost);
    spawned += 1;

    pushLog(
      game,
      `숲의 양옥집의 기운이 ${unit.name}의 유령을 붙잡았다! 유령은 HP 3으로 필드를 막는다.`,
    );
  });

  normalizeFantinaGhosts(game);
  return spawned;
}

export function normalizeFantinaGhosts(game) {
  if (!isFantinaBattle(game)) return;

  game.players.player.field.forEach((unit) => {
    if (!unit._fantinaGhost) return;

    unit.atk = 0;
    unit.baseAtk = 0;
    unit.canAttack = false;
    unit.noEvolve = true;
    unit.status = null;
    unit.frozen = 0;
  });
}

export function fantinaGhostUids(game) {
  if (!isFantinaBattle(game)) return [];

  return game.players.player.field
    .filter((unit) => unit._fantinaGhost)
    .map((unit) => unit.uid);
}

function playGhostVanishAnimation(uid) {
  if (typeof document === "undefined") return;

  const unitElement = document.querySelector(
    `.battle-board[data-battlefield="old_chateau"] .field-unit[data-uid="${uid}"]`,
  );

  if (!unitElement) return;

  const rect = unitElement.getBoundingClientRect();
  const fx = document.createElement("div");
  fx.className = "fantina-ghost-vanish-fx";
  fx.style.left = `${rect.left + rect.width / 2}px`;
  fx.style.top = `${rect.top + rect.height / 2}px`;
  fx.style.width = `${Math.max(48, rect.width * 0.9)}px`;
  fx.style.height = `${Math.max(54, rect.height * 0.9)}px`;
  document.body.appendChild(fx);

  window.setTimeout(() => fx.remove(), 720);
}

function absorbExpiredGhosts(game, count) {
  if (!isFantinaBattle(game) || count <= 0) return;

  const mismagius = game.players.enemy.field.find(
    (unit) => unit.hp > 0 && unit.ability === "fantina_drain",
  );

  if (!mismagius) return;

  let gained = 0;

  while (gained < count && (mismagius._fantinaDrainStacks || 0) < DRAIN_MAX_STACKS) {
    mismagius._fantinaDrainStacks = (mismagius._fantinaDrainStacks || 0) + 1;
    mismagius.atk += 1;
    mismagius.hp += 1;
    mismagius.maxHp += 1;
    gained += 1;
  }

  if (gained > 0) {
    pushLog(
      game,
      `${mismagius.name}의 흡수! 자연 소멸한 유령의 기운 ${gained}개를 흡수해 +${gained}/+${gained}! (${mismagius._fantinaDrainStacks}/${DRAIN_MAX_STACKS})`,
    );
  }
}

export function ageFantinaGhosts(game, eligibleUids) {
  if (!isFantinaBattle(game) || !eligibleUids?.length) return;

  const player = game.players.player;
  const eligible = new Set(eligibleUids);
  const expired = [];

  player.field.forEach((unit) => {
    if (!unit._fantinaGhost || !eligible.has(unit.uid) || unit.hp <= 0) return;

    unit.hp = Math.max(0, unit.hp - 1);

    if (unit.hp > 0) {
      pushLog(game, `${unit.name}의 기운이 약해졌다. (HP ${unit.hp})`);
      return;
    }

    expired.push(unit);
  });

  if (!expired.length) return;

  expired.forEach((unit) => playGhostVanishAnimation(unit.uid));
  absorbExpiredGhosts(game, expired.length);

  const expiredIds = new Set(expired.map((unit) => unit.uid));
  player.field = player.field.filter((unit) => !expiredIds.has(unit.uid));

  expired.forEach((unit) => {
    pushLog(game, `${unit.name}이(가) 안개 속으로 사라졌다.`);
  });
}
