import * as core from "./wake-balance.js";
import { CARD_MAP } from "../data/cards.js";

export * from "./wake-balance.js";

const CYNTHIA_GIMMICK = "champion_party";
const CYNTHIA_MILOTIC_ID = "sinnoh_cynthia_milotic";
const RELAXED_FRIENDLY_TARGET = "friendly-or-hero";

function handCardInfo(game, side, handIdx) {
  const player = game.players[side];
  const handCard = player?.hand?.[handIdx] || null;
  const card = handCard ? CARD_MAP[handCard.cardId] : null;
  return { player, handCard, card };
}

function canHealTrainer(card) {
  return (
    card?.kind === "spell" &&
    card.spell?.target === "friendly-pokemon" &&
    core.spellNeedsTarget(card) === "friendly-or-hero"
  );
}

function withTrainerTargetAllowed(card, callback) {
  if (!canHealTrainer(card)) return callback();

  const originalTarget = card.spell.target;
  card.spell.target = RELAXED_FRIENDLY_TARGET;

  try {
    return callback();
  } finally {
    card.spell.target = originalTarget;
  }
}

export function canPlayCard(game, side, handIdx) {
  const normal = core.canPlayCard(game, side, handIdx);
  if (normal) return true;

  const { player, card } = handCardInfo(game, side, handIdx);

  // 회복 카드는 포켓몬뿐 아니라 트레이너도 정상적인 대상이다.
  // 기본 엔진은 friendly-pokemon 카드에 필드 포켓몬이 하나 이상 있어야 한다고
  // 먼저 막으므로, 필드가 비었을 때에만 타겟 제약을 완화해 나머지 비용/턴 조건은
  // 기존 canPlayCard가 그대로 검사하도록 한다.
  if (!player || player.field.length > 0 || !canHealTrainer(card)) {
    return false;
  }

  return withTrainerTargetAllowed(card, () =>
    core.canPlayCard(game, side, handIdx),
  );
}

export function playCard(game, side, handIdx, target = null, fieldIndex = null) {
  const { player, card } = handCardInfo(game, side, handIdx);
  const trainerHealWithoutUnits =
    player?.field.length === 0 &&
    target?.uid === "hero" &&
    canHealTrainer(card);

  if (!trainerHealWithoutUnits) {
    return core.playCard(game, side, handIdx, target, fieldIndex);
  }

  // 실제 회복 처리에는 이미 hero 분기가 있으므로, 카드 사용 가능 여부를 검사하는
  // 동안만 friendly-pokemon 제약을 완화한다. 카드 데이터는 호출 직후 원복된다.
  return withTrainerTargetAllowed(card, () =>
    core.playCard(game, side, handIdx, target, fieldIndex),
  );
}

function cynthiaMiloticAtEnemyTurnEnd(game) {
  if (
    game?.trainer?.gimmick !== CYNTHIA_GIMMICK ||
    game.turn !== "enemy" ||
    game.winner
  ) {
    return null;
  }

  return (
    game.players.enemy.field.find(
      (unit) => unit.cardId === CYNTHIA_MILOTIC_ID && unit.hp > 0,
    ) || null
  );
}

export function endTurn(game) {
  const milotic = cynthiaMiloticAtEnemyTurnEnd(game);
  const originalMaxHp = milotic?.maxHp ?? null;
  const missingHp = milotic
    ? Math.max(0, milotic.maxHp - milotic.hp)
    : 0;

  // 난천 엔진의 아쿠아링은 `Math.min(2, maxHp - hp)`를 사용한다.
  // 턴 종료 처리 중에만 회복 가능한 상한을 1칸으로 제한하면 기존 엔진이
  // 로그/impact까지 자연스럽게 +1로 생성한다. 처리 직후 원래 최대 HP를 복원한다.
  if (milotic && missingHp >= 2) {
    milotic.maxHp = milotic.hp + 1;
  }

  try {
    return core.endTurn(game);
  } finally {
    if (milotic && originalMaxHp != null) {
      milotic.maxHp = originalMaxHp;
    }
  }
}
