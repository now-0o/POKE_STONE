import { CARD_MAP } from "../data/cards.js";

let currentGame = null;
let resolveSelection = null;
let overlay = null;
let pendingKey = "";
let optimisticSelected = new Set();

function hasAbility(unit, ability) {
  return !!unit &&
    (unit.ability === ability || unit.secondaryAbility === ability);
}

function activeSealSource(game, side, handCard) {
  const sourceUid = handCard?._glaciateSealedByUid;
  if (!sourceUid) return null;

  const sourceSide = side === "player" ? "enemy" : "player";
  return game.players?.[sourceSide]?.field?.find(
    (unit) =>
      unit.uid === sourceUid &&
      unit.hp > 0 &&
      hasAbility(unit, "glaciate"),
  ) || null;
}

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById("kyurem-seal-runtime-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "kyurem-seal-runtime-style";
  style.textContent = `
    .kyurem-seal-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147482500;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      background: rgba(7, 16, 29, .72);
      backdrop-filter: blur(5px);
    }
    .kyurem-seal-overlay.is-visible { display: flex; }
    .kyurem-seal-panel {
      width: min(680px, 96vw);
      max-height: min(620px, 88dvh);
      overflow: auto;
      padding: 22px;
      box-sizing: border-box;
      border: 1px solid rgba(151, 226, 255, .48);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(19, 40, 61, .98), rgba(8, 20, 35, .98));
      box-shadow: 0 24px 80px rgba(0, 0, 0, .55), 0 0 32px rgba(100, 210, 255, .15);
      color: #f4fbff;
    }
    .kyurem-seal-kicker {
      margin: 0 0 5px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .15em;
      color: #8edcff;
    }
    .kyurem-seal-title { margin: 0; font-size: 25px; }
    .kyurem-seal-desc { margin: 8px 0 18px; color: rgba(232, 246, 255, .75); font-size: 14px; }
    .kyurem-seal-progress {
      display: inline-flex;
      margin-bottom: 14px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(111, 211, 255, .12);
      color: #a7e5ff;
      font-size: 12px;
      font-weight: 800;
    }
    .kyurem-seal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 10px;
    }
    .kyurem-seal-card {
      appearance: none;
      min-height: 92px;
      padding: 13px;
      text-align: left;
      border: 1px solid rgba(255, 255, 255, .14);
      border-radius: 13px;
      background: rgba(255, 255, 255, .055);
      color: inherit;
      cursor: pointer;
      transition: transform .13s ease, border-color .13s ease, background .13s ease;
    }
    .kyurem-seal-card:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: rgba(134, 222, 255, .65);
      background: rgba(94, 195, 238, .13);
    }
    .kyurem-seal-card:disabled { opacity: .43; cursor: default; }
    .kyurem-seal-card strong { display: block; margin-bottom: 8px; font-size: 15px; }
    .kyurem-seal-card-meta { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: rgba(229, 244, 255, .68); }
    .kyurem-seal-card.is-selected {
      border-color: rgba(112, 215, 255, .7);
      background: rgba(68, 165, 214, .18);
    }
    .hand-card-wrap.kyurem-sealed-hand { position: relative; }
    .hand-card-wrap.kyurem-sealed-hand .hand-card {
      filter: saturate(.3) brightness(.72) contrast(.92);
    }
    .kyurem-sealed-badge {
      position: absolute;
      z-index: 15;
      left: 50%;
      top: 42%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      padding: 5px 9px;
      border: 1px solid rgba(165, 229, 255, .8);
      border-radius: 999px;
      background: rgba(12, 49, 72, .92);
      box-shadow: 0 0 15px rgba(104, 209, 255, .32);
      color: #d9f5ff;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }
    @media (max-width: 640px) {
      .kyurem-seal-overlay { padding: 12px; }
      .kyurem-seal-panel { padding: 17px; border-radius: 15px; }
      .kyurem-seal-title { font-size: 21px; }
      .kyurem-seal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .kyurem-seal-card { min-height: 82px; padding: 11px; }
    }
  `;
  document.head.appendChild(style);
}

function ensureOverlay() {
  if (typeof document === "undefined") return null;
  ensureStyles();
  if (overlay?.isConnected) return overlay;

  overlay = document.createElement("div");
  overlay.className = "kyurem-seal-overlay";
  overlay.innerHTML = `
    <section class="kyurem-seal-panel" role="dialog" aria-modal="true" aria-label="큐레무 카드 봉인">
      <div class="kyurem-seal-kicker">KYUREM · GLACIATE</div>
      <h2 class="kyurem-seal-title">얼어붙은세계</h2>
      <p class="kyurem-seal-desc">큐레무가 필드에 있는 동안 사용할 수 없게 만들 상대 손패를 선택하세요.</p>
      <div class="kyurem-seal-progress"></div>
      <div class="kyurem-seal-grid"></div>
    </section>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function syncOwnHandSealBadges() {
  if (typeof document === "undefined" || !currentGame?.players?.player) return;

  const wraps = [...document.querySelectorAll(".hand .hand-card-wrap")];
  wraps.forEach((wrap, index) => {
    const handCard = currentGame.players.player.hand?.[index];
    const sealed = !!activeSealSource(currentGame, "player", handCard);
    wrap.classList.toggle("kyurem-sealed-hand", sealed);

    let badge = wrap.querySelector(":scope > .kyurem-sealed-badge");
    if (sealed && !badge) {
      badge = document.createElement("div");
      badge.className = "kyurem-sealed-badge";
      badge.textContent = "얼어붙은세계 · 봉인";
      wrap.appendChild(badge);
    } else if (!sealed && badge) {
      badge.remove();
    }
  });
}

function localPending(game) {
  const pending = game?.pendingBattlecry;
  if (
    !pending ||
    pending.ability !== "glaciate" ||
    pending.side !== "player" ||
    pending.targetSide !== "enemy"
  ) {
    return null;
  }

  const source = game.players?.player?.field?.find(
    (unit) =>
      unit.uid === pending.uid &&
      unit.hp > 0 &&
      hasAbility(unit, "glaciate"),
  );
  return source ? pending : null;
}

function syncOverlay() {
  const root = ensureOverlay();
  if (!root) return;

  syncOwnHandSealBadges();

  const pending = localPending(currentGame);
  if (!pending) {
    root.classList.remove("is-visible");
    pendingKey = "";
    optimisticSelected.clear();
    return;
  }

  const nextKey = `${pending.uid}:${pending.count}:${(pending.targets || []).join(",")}`;
  if (nextKey !== pendingKey) {
    pendingKey = nextKey;
    optimisticSelected.clear();
  }

  const serverSelected = new Set(pending.selected || []);
  const selectedCount = new Set([
    ...serverSelected,
    ...optimisticSelected,
  ]).size;
  const progress = root.querySelector(".kyurem-seal-progress");
  const grid = root.querySelector(".kyurem-seal-grid");
  if (!progress || !grid) return;

  progress.textContent = `${Math.min(selectedCount, pending.count)} / ${pending.count} 선택`;
  grid.replaceChildren();

  for (const handUid of pending.targets || []) {
    const handCard = currentGame.players?.enemy?.hand?.find(
      (entry) => entry.uid === handUid,
    );
    if (!handCard) continue;

    const card = CARD_MAP[handCard.cardId];
    const selected = serverSelected.has(handUid) || optimisticSelected.has(handUid);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `kyurem-seal-card${selected ? " is-selected" : ""}`;
    button.disabled = selected || selectedCount >= pending.count;
    button.innerHTML = `
      <strong>${card?.name || "카드"}</strong>
      <div class="kyurem-seal-card-meta">
        <span>${card?.kind === "pokemon" ? `${card.type} 포켓몬` : card?.type || card?.kind || "카드"}</span>
        <span>${Number.isFinite(card?.cost) ? `${card.cost} COST` : ""}</span>
      </div>
    `;
    button.addEventListener("click", () => {
      if (!resolveSelection || optimisticSelected.has(handUid)) return;
      optimisticSelected.add(handUid);
      syncOverlay();

      try {
        const result = resolveSelection(handUid);
        if (result === false) optimisticSelected.delete(handUid);
        Promise.resolve(result).catch(() => {
          optimisticSelected.delete(handUid);
          syncOverlay();
        });
      } catch {
        optimisticSelected.delete(handUid);
      }

      window.setTimeout(syncOverlay, 80);
    });
    grid.appendChild(button);
  }

  root.classList.add("is-visible");
}

export function registerKyuremSealRuntime(game, resolver) {
  currentGame = game || null;
  if (typeof resolver === "function") resolveSelection = resolver;

  if (typeof window !== "undefined") {
    window.requestAnimationFrame(syncOverlay);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("focus", syncOverlay);
  document.addEventListener("visibilitychange", syncOverlay);
}
