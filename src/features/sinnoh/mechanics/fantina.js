const GHOST_LIFETIME_PLAYER_TURNS = 2;
const GHOST_HP = 2;
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
    _fantinaGhostTurns: GHOST_LIFETIME_PLAYER_TURNS,
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
      `숲의 양옥집의 기운이 ${unit.name}의 유령을 붙잡았다! 유령은 잠시 필드에 남는다.`,
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

export function ageFantinaGhosts(game, eligibleUids) {
  if (!isFantinaBattle(game) || !eligibleUids?.length) return;

  const player = game.players.player;
  const eligible = new Set(eligibleUids);
  const expired = [];

  player.field.forEach((unit) => {
    if (!unit._fantinaGhost || !eligible.has(unit.uid) || unit.hp <= 0) return;

    unit._fantinaGhostTurns = Math.max(0, (unit._fantinaGhostTurns || 1) - 1);
    if (unit._fantinaGhostTurns <= 0) expired.push(unit.uid);
  });

  if (!expired.length) return;

  const expiredSet = new Set(expired);
  const names = player.field
    .filter((unit) => expiredSet.has(unit.uid))
    .map((unit) => unit.name);

  player.field = player.field.filter((unit) => !expiredSet.has(unit.uid));

  names.forEach((name) => {
    pushLog(game, `${name}이(가) 안개 속으로 사라졌다.`);
  });
}

function addBuffImpact(game, unit) {
  if (!game.lastAction) return;
  if (!Array.isArray(game.lastAction.impacts)) game.lastAction.impacts = [];

  game.lastAction.impacts.push({
    type: "buff",
    side: unit.side,
    targetUid: unit.uid,
    amount: 1,
  });
}

export function handleFantinaDrain(game, attacker, target) {
  if (!isFantinaBattle(game)) return false;
  if (!attacker || attacker.ability !== "fantina_drain") return false;
  if (!target?._fantinaGhost || target.hp > 0 || target._fantinaDrainClaimed) {
    return false;
  }

  target._fantinaDrainClaimed = true;

  const stacks = attacker._fantinaDrainStacks || 0;
  if (stacks >= DRAIN_MAX_STACKS) {
    pushLog(game, `${attacker.name}의 흡수는 이미 최대치다!`);
    return false;
  }

  attacker._fantinaDrainStacks = stacks + 1;
  attacker.atk += 1;
  attacker.hp += 1;
  attacker.maxHp += 1;
  addBuffImpact(game, attacker);

  pushLog(
    game,
    `${attacker.name}의 흡수! 유령의 기운을 삼켜 +1/+1! (${attacker._fantinaDrainStacks}/${DRAIN_MAX_STACKS})`,
  );

  return true;
}
