import * as rules from "./engine.rules.js";
import { CARD_MAP } from "../data/cards.js";
import "../styles/damage-preview.css";

const TARGETED_DAMAGE_EFFECTS = new Set([
  "execute",
  "damage",
  "damage_draw",
  "damage_freeze",
  "damage_status",
  "piercing_damage",
  "multi_damage",
  "damage_bounce",
  "damage_recall_friendly",
  "damage_grant_rush",
  "acrobatics",
]);

let currentGame = null;
let overlay = null;
let lastKey = "";
let lastPreview = null;

export function registerDamagePreviewGame(game) {
  currentGame = game || null;
}

function cloneGame(game) {
  if (!game) return null;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(game);
    } catch {
      // JSON clone fallback below
    }
  }
  try {
    return JSON.parse(JSON.stringify(game));
  } catch {
    return null;
  }
}

function damageFromImpacts(action, side, targetUid) {
  return (action?.impacts || []).reduce((sum, impact) => {
    if (
      impact?.type === "damage" &&
      impact.side === side &&
      impact.targetUid === targetUid
    ) {
      return sum + Math.max(0, Number(impact.amount) || 0);
    }
    return sum;
  }, 0);
}

function previewAttack(game, attackerUid, targetUid) {
  const cloned = cloneGame(game);
  if (!cloned) return null;

  const attacker = cloned.players?.player?.field?.find(
    (unit) => unit.uid === attackerUid,
  );
  const target = cloned.players?.enemy?.field?.find(
    (unit) => unit.uid === targetUid,
  );
  if (!attacker || !target) return null;

  const ok = rules.attack(cloned, "player", attackerUid, { uid: targetUid });
  if (!ok) return null;

  const action = cloned.lastAction;
  const dealt = damageFromImpacts(action, "enemy", targetUid);
  const received = damageFromImpacts(action, "player", attackerUid);

  return {
    kind: "attack",
    dealt,
    received,
  };
}

function isTargetedDamageCard(card) {
  if (!card || card.kind !== "spell" || card.type !== "기술") return false;
  if (rules.spellNeedsTarget(card) !== "enemy") return false;
  const amount = Number(card.spell?.amount);
  return amount > 0 || TARGETED_DAMAGE_EFFECTS.has(card.spell?.effect);
}

function previewTechnique(game, handIdx, targetUid) {
  const cardId = game.players?.player?.hand?.[handIdx]?.cardId;
  const card = CARD_MAP[cardId];
  if (!isTargetedDamageCard(card)) return null;

  const cloned = cloneGame(game);
  if (!cloned) return null;
  const target = cloned.players?.enemy?.field?.find(
    (unit) => unit.uid === targetUid,
  );
  if (!target) return null;

  const ok = rules.playCard(cloned, "player", handIdx, { uid: targetUid });
  if (!ok) return null;

  const dealt = damageFromImpacts(cloned.lastAction, "enemy", targetUid);
  return {
    kind: "technique",
    dealt,
  };
}

function activePreviewSource(game) {
  if (typeof document === "undefined" || !game) return null;

  const attackerEl = document.querySelector(
    '.field-unit.selected[data-drop="unit-player"][data-uid]',
  );
  const attackerUid = attackerEl?.dataset?.uid;
  if (
    attackerUid &&
    game.players?.player?.field?.some((unit) => unit.uid === attackerUid)
  ) {
    return { kind: "attack", attackerUid };
  }

  const handEl =
    document.querySelector(".drag-ghost .hand-card") ||
    document.querySelector(".hand-card.selected");
  const cardName = handEl?.querySelector(".card-name")?.textContent?.trim();
  if (!cardName) return null;

  const handIdx = game.players?.player?.hand?.findIndex(
    (entry) => CARD_MAP[entry.cardId]?.name === cardName,
  );
  if (!Number.isInteger(handIdx) || handIdx < 0) return null;

  const card = CARD_MAP[game.players.player.hand[handIdx]?.cardId];
  if (!isTargetedDamageCard(card)) return null;

  return { kind: "technique", handIdx, cardId: card.id };
}

function ensureOverlay() {
  if (typeof document === "undefined") return null;
  if (overlay?.isConnected) return overlay;

  overlay = document.createElement("div");
  overlay.className = "damage-preview-popover";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);
  return overlay;
}

function hideOverlay() {
  if (overlay) overlay.classList.remove("is-visible", "is-below");
  lastKey = "";
  lastPreview = null;
}

function renderPreview(targetEl, preview) {
  const el = ensureOverlay();
  if (!el || !targetEl || !preview) return;

  if (preview.kind === "attack") {
    el.innerHTML = `
      <div class="damage-preview-row damage-preview-deal">
        <span>주는 피해</span><strong>${preview.dealt}</strong>
      </div>
      <div class="damage-preview-row damage-preview-take">
        <span>받는 피해</span><strong>${preview.received}</strong>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="damage-preview-row damage-preview-deal">
        <span>예상 피해</span><strong>${preview.dealt}</strong>
      </div>
    `;
  }

  const rect = targetEl.getBoundingClientRect();
  const halfWidth = 92;
  const x = Math.max(
    halfWidth + 8,
    Math.min(window.innerWidth - halfWidth - 8, rect.left + rect.width / 2),
  );
  const placeBelow = rect.top < 90;

  el.style.left = `${x}px`;
  if (placeBelow) {
    el.style.top = `${Math.min(window.innerHeight - 8, rect.bottom + 8)}px`;
    el.classList.add("is-below");
  } else {
    el.style.top = `${Math.max(8, rect.top - 8)}px`;
    el.classList.remove("is-below");
  }
  el.classList.add("is-visible");
}

function handlePointerMove(event) {
  if (
    typeof document === "undefined" ||
    !currentGame ||
    currentGame.winner ||
    currentGame.turn !== "player"
  ) {
    hideOverlay();
    return;
  }

  const underPointer = document.elementFromPoint(event.clientX, event.clientY);
  const targetEl = underPointer?.closest?.(
    '.field-unit.targetable[data-drop="unit-enemy"][data-uid]',
  );
  const targetUid = targetEl?.dataset?.uid;
  if (!targetEl || !targetUid) {
    hideOverlay();
    return;
  }

  const source = activePreviewSource(currentGame);
  if (!source) {
    hideOverlay();
    return;
  }

  const target = currentGame.players?.enemy?.field?.find(
    (unit) => unit.uid === targetUid,
  );
  const sourceKey =
    source.kind === "attack"
      ? `attack:${source.attackerUid}`
      : `technique:${source.handIdx}:${source.cardId}`;
  const key = [
    currentGame.animSeq || 0,
    currentGame.turnCount || 0,
    sourceKey,
    targetUid,
    target?.hp ?? "",
    target?.atk ?? "",
  ].join(":");

  if (key !== lastKey) {
    lastKey = key;
    lastPreview =
      source.kind === "attack"
        ? previewAttack(currentGame, source.attackerUid, targetUid)
        : previewTechnique(currentGame, source.handIdx, targetUid);
  }

  if (!lastPreview) {
    hideOverlay();
    return;
  }
  renderPreview(targetEl, lastPreview);
}

if (typeof document !== "undefined") {
  document.addEventListener("pointermove", handlePointerMove, true);
  document.addEventListener("pointerup", hideOverlay, true);
  document.addEventListener("pointercancel", hideOverlay, true);
  window.addEventListener("blur", hideOverlay);
}
