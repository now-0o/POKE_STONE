import * as core from "./wake-balance.js";
import { CARD_MAP } from "../data/cards.js";

export * from "./wake-balance.js";

const CYNTHIA_GIMMICK = "champion_party";
const CYNTHIA_MILOTIC_ID = "sinnoh_cynthia_milotic";
const FULL_RESTORE_ID = "fullrestore";
const STEVEN_METAGROSS_ID = "hoenn_steven_metagross";
const STEVEN_METAGROSSITE_ID = "hoenn_steven_metagrossite";
const STEVEN_MEGA_METAGROSS_NAME = "성호의 메가 메타그로스";
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

function normalizeStevenMegaMetagross(game, side, card, target, logStart) {
  if (card?.id !== STEVEN_METAGROSSITE_ID) return;

  const player = game.players[side];
  const unit = target?.uid
    ? player.field.find((entry) => entry.uid === target.uid)
    : player.field.find((entry) => entry.cardId === STEVEN_METAGROSS_ID && entry.mega);

  if (!unit || unit.cardId !== STEVEN_METAGROSS_ID || !unit.mega) return;

  unit.name = STEVEN_MEGA_METAGROSS_NAME;

  for (let i = logStart; i < game.log.length; i += 1) {
    if (typeof game.log[i] !== "string") continue;
    game.log[i] = game.log[i].replace(
      "메가 성호의 메타그로스",
      STEVEN_MEGA_METAGROSS_NAME,
    );
  }
}

function fullyRestoreTrainer(game, side, card, target, hpBeforePlay) {
  if (
    card?.id !== FULL_RESTORE_ID ||
    target?.uid !== "hero" ||
    !Number.isFinite(hpBeforePlay)
  ) {
    return;
  }

  const player = game.players[side];
  if (!player || !Number.isFinite(player.maxHp)) return;

  player.hp = player.maxHp;
  const healed = Math.max(0, player.hp - hpBeforePlay);

  // 기본 엔진은 트레이너 대상 풀회복약을 +8로 처리한다.
  // 카드 의미에 맞게 최대 체력까지 회복시키고, 연출 수치도 실제 총 회복량으로 맞춘다.
  if (game.lastAction?.cardId === FULL_RESTORE_ID) {
    if (!Array.isArray(game.lastAction.impacts)) {
      game.lastAction.impacts = [];
    }

    const impact = game.lastAction.impacts.find(
      (entry) =>
        entry?.type === "heal" &&
        entry.side === side &&
        entry.targetUid === "hero",
    );

    if (healed > 0) {
      if (impact) {
        impact.amount = healed;
      } else {
        game.lastAction.impacts.push({
          type: "heal",
          side,
          targetUid: "hero",
          amount: healed,
        });
      }
    }
  }

  // 기본 로그의 +8 회복량이 남지 않도록 실제 총 회복량으로 맞춘다.
  for (let i = game.log.length - 1; i >= 0; i -= 1) {
    const message = game.log[i];
    if (typeof message !== "string") continue;
    if (!message.includes("풀회복약!")) continue;

    game.log[i] = `풀회복약! ${player.name}의 체력이 ${healed} 회복됐다!`;
    break;
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
  const logStart = game.log.length;
  const fullRestoreHeroHpBefore =
    card?.id === FULL_RESTORE_ID &&
    target?.uid === "hero" &&
    Number.isFinite(player?.hp)
      ? player.hp
      : null;
  const trainerHealWithoutUnits =
    player?.field.length === 0 &&
    target?.uid === "hero" &&
    canHealTrainer(card);

  const result = trainerHealWithoutUnits
    ? withTrainerTargetAllowed(card, () =>
        core.playCard(game, side, handIdx, target, fieldIndex),
      )
    : core.playCard(game, side, handIdx, target, fieldIndex);

  if (!result) return result;

  fullyRestoreTrainer(game, side, card, target, fullRestoreHeroHpBefore);
  normalizeStevenMegaMetagross(game, side, card, target, logStart);

  return result;
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
