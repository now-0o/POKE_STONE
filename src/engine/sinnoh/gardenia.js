const BASE_FIELD_CAPACITY = 6;

export function isGardeniaBattle(game) {
  return game?.trainer?.gimmick === "eternal_vines";
}

function playerOf(game) {
  return game?.players?.player || null;
}

function capacity(player) {
  return player.fieldCapacity ?? BASE_FIELD_CAPACITY;
}

function setCapacity(player, next) {
  player.fieldCapacity = Math.max(BASE_FIELD_CAPACITY, next);
}

function isAnchor(obstacle) {
  return Boolean(obstacle?._gardeniaLayoutAnchor);
}

function anchorForSlot(slot) {
  return {
    id: `gardenia-layout-anchor-${slot}`,
    type: "layout_anchor",
    slot,
    hp: 0,
    maxHp: 0,
    _gardeniaLayoutAnchor: true,
  };
}

export function captureGardeniaVines(game) {
  if (!isGardeniaBattle(game)) return [];

  return (playerOf(game)?.fieldObstacles || [])
    .filter((obstacle) => obstacle.type === "vine" && obstacle.hp > 0)
    .map((obstacle) => ({ id: obstacle.id, slot: obstacle.slot }));
}

export function preserveRemovedGardeniaVineSlots(game, beforeVines) {
  if (!isGardeniaBattle(game) || !beforeVines?.length) return 0;

  const player = playerOf(game);
  const obstacles = player.fieldObstacles || (player.fieldObstacles = []);
  const remainingIds = new Set(obstacles.map((obstacle) => obstacle.id));
  let added = 0;

  beforeVines.forEach(({ id, slot }) => {
    if (remainingIds.has(id)) return;
    if (!Number.isInteger(slot)) return;
    if (obstacles.some((obstacle) => isAnchor(obstacle) && obstacle.slot === slot)) return;

    obstacles.push(anchorForSlot(slot));
    setCapacity(player, capacity(player) + 1);
    added += 1;
  });

  return added;
}

export function releaseGardeniaAnchorForSummon(game, side, card) {
  if (!isGardeniaBattle(game) || side !== "player") return null;
  if (!card || card.kind !== "pokemon" || card.evolvesFrom) return null;

  const player = playerOf(game);
  const obstacles = player.fieldObstacles || [];
  const index = obstacles.findIndex(isAnchor);
  if (index === -1) return null;

  const [anchor] = obstacles.splice(index, 1);
  setCapacity(player, capacity(player) - 1);
  return anchor;
}

export function restoreGardeniaAnchor(game, anchor) {
  if (!isGardeniaBattle(game) || !anchor) return;

  const player = playerOf(game);
  const obstacles = player.fieldObstacles || (player.fieldObstacles = []);
  const slotOccupied = obstacles.some((obstacle) => obstacle.slot === anchor.slot);

  if (slotOccupied) return;

  obstacles.push(anchor);
  setCapacity(player, capacity(player) + 1);
}

export function releaseGardeniaAnchors(game) {
  if (!isGardeniaBattle(game)) return [];

  const player = playerOf(game);
  const obstacles = player.fieldObstacles || [];
  const anchors = obstacles.filter(isAnchor);

  if (!anchors.length) return [];

  player.fieldObstacles = obstacles.filter((obstacle) => !isAnchor(obstacle));
  setCapacity(player, capacity(player) - anchors.length);
  return anchors;
}

export function restoreUnusedGardeniaAnchors(game, anchors) {
  if (!isGardeniaBattle(game) || !anchors?.length) return;
  anchors.forEach((anchor) => restoreGardeniaAnchor(game, anchor));
}
