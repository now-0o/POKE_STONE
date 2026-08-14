const MAX_COLD = 3;
const BLIZZARD_DAMAGE = 1;

function pushLog(game, message) {
  game.log.push(message);
  if (game.log.length > 60) game.log.shift();
}

export function isCandiceBattle(game) {
  return game?.trainer?.gimmick === "diamond_dust";
}

export function getCandiceCold(game) {
  return isCandiceBattle(game) ? Math.max(0, game._candiceCold || 0) : 0;
}

export function syncCandiceVisual(game) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const active = isCandiceBattle(game);
  const cold = active ? getCandiceCold(game) : 0;
  const warm = active && game._candiceWarmThisTurn === true;

  if (active) {
    document.body.dataset.candiceCold = String(cold);
    if (warm) document.body.dataset.candiceWarm = "1";
    else delete document.body.dataset.candiceWarm;
  } else {
    delete document.body.dataset.candiceCold;
    delete document.body.dataset.candiceWarm;
  }

  window.dispatchEvent(
    new CustomEvent("candice-cold-change", {
      detail: { active, cold, warm },
    }),
  );
}

export function initCandiceBattle(game) {
  if (!isCandiceBattle(game)) {
    syncCandiceVisual(game);
    return;
  }

  game._candiceCold = 0;
  game._candiceWarmThisTurn = false;
  syncCandiceVisual(game);
}

export function markCandiceFireAction(game, side, source) {
  if (!isCandiceBattle(game) || side !== "player") return false;

  const isFireAction = source?.moveType === "불꽃" || source?.type === "불꽃";
  if (!isFireAction) return false;

  game._candiceWarmThisTurn = true;
  syncCandiceVisual(game);
  return true;
}

export function getCandiceSignatureBonus(game, attacker) {
  if (!isCandiceBattle(game)) return 0;
  if (!attacker || attacker.side !== "enemy") return 0;
  if (attacker.ability !== "candice_snowveil") return 0;
  return getCandiceCold(game) >= 2 ? 2 : 0;
}

function makeBlizzardImpact(side, targetUid, amount) {
  return {
    type: "damage",
    side,
    targetUid,
    amount,
  };
}

export function resolveCandicePlayerTurnEnd(game) {
  if (!isCandiceBattle(game) || game.winner) return false;

  const warmed = game._candiceWarmThisTurn === true;
  game._candiceWarmThisTurn = false;

  if (warmed) {
    const before = getCandiceCold(game);
    game._candiceCold = Math.max(0, before - 1);

    pushLog(
      game,
      before > 0
        ? `불꽃의 열기가 다이아몬드 더스트를 녹였다! 냉기 ${before} → ${game._candiceCold}.`
        : "불꽃의 열기가 눈보라의 냉기를 막아냈다!",
    );

    syncCandiceVisual(game);
    return false;
  }

  game._candiceCold = Math.min(MAX_COLD, getCandiceCold(game) + 1);

  if (game._candiceCold < MAX_COLD) {
    pushLog(
      game,
      `다이아몬드 더스트의 냉기가 짙어진다! (${game._candiceCold}/${MAX_COLD})`,
    );
    syncCandiceVisual(game);
    return false;
  }

  const player = game.players.player;
  const impacts = [];

  const heroBefore = player.hp;
  player.hp = Math.max(0, player.hp - BLIZZARD_DAMAGE);
  const heroDamage = Math.max(0, heroBefore - player.hp);
  if (heroDamage > 0) {
    impacts.push(makeBlizzardImpact("player", "hero", heroDamage));
  }

  player.field.forEach((unit) => {
    if (unit.hp <= 0) return;
    const before = unit.hp;
    unit.hp -= BLIZZARD_DAMAGE;
    const dealt = Math.max(0, before - unit.hp);
    if (dealt > 0) {
      impacts.push(makeBlizzardImpact("player", unit.uid, dealt));
    }
  });

  game._candiceCold = 0;
  game.animSeq = (game.animSeq || 0) + 1;
  game.lastAction = {
    seq: game.animSeq,
    kind: "ability",
    side: "enemy",
    cardId: "sinnoh_candice_froslass",
    impacts,
  };

  pushLog(
    game,
    `다이아몬드 더스트가 눈보라로 폭발했다! 플레이어와 필드 전체에 피해 ${BLIZZARD_DAMAGE}!`,
  );

  syncCandiceVisual(game);
  return true;
}
