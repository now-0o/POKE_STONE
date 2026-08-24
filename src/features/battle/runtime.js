import "./battle-screen-counters.css";
import "./unovaMoveFxRuntime.js";

function syncEndTurnLabel() {
  const button = document.querySelector(".battle.battle-board .btn-endturn");
  if (!button) return;

  const turn = document.body.dataset.battleTurn;
  const label =
    turn === "player" ? "턴 종료" : turn === "enemy" ? "상대 턴..." : null;

  if (label && button.textContent !== label) {
    button.textContent = label;
  }
}

function getBattleGame() {
  return window.__pokeNState?.game || null;
}

function screenCharge(player, key) {
  const value = Number(player?.[key]) || 0;
  return Math.max(0, Math.floor(value));
}

function screenCounterMarkup(player) {
  const reflect = screenCharge(player, "_reflectCharges");
  const lightScreen = screenCharge(player, "_lightScreenCharges");
  const parts = [];

  if (reflect > 0) {
    parts.push(
      `<span class="battle-screen-counter is-reflect" title="리플렉터 남은 방어 횟수"><span aria-hidden="true">🪞</span><span>리플렉터</span><strong>${reflect}</strong></span>`,
    );
  }

  if (lightScreen > 0) {
    parts.push(
      `<span class="battle-screen-counter is-light-screen" title="빛의장막 남은 방어 횟수"><span aria-hidden="true">✨</span><span>빛의장막</span><strong>${lightScreen}</strong></span>`,
    );
  }

  return parts.join("");
}

function syncBattleScreenCounterForSide(side, player) {
  const info = document.querySelector(
    side === "player"
      ? ".battle.battle-board .my-hero-cluster .hero-info"
      : ".battle.battle-board .enemy-hero-cluster .hero-info",
  );

  if (!info) return;

  const html = screenCounterMarkup(player);
  let counters = info.querySelector(
    `.battle-screen-counters[data-screen-side="${side}"]`,
  );

  if (!html) {
    counters?.remove();
    return;
  }

  if (!counters) {
    counters = document.createElement("div");
    counters.className = "battle-screen-counters";
    counters.dataset.screenSide = side;
    counters.setAttribute(
      "aria-label",
      side === "player" ? "내 장막 남은 횟수" : "상대 장막 남은 횟수",
    );
    info.appendChild(counters);
  }

  if (counters.innerHTML !== html) {
    counters.innerHTML = html;
  }
}

function syncBattleScreenCounters() {
  const game = getBattleGame();
  if (!game?.players) return;

  syncBattleScreenCounterForSide("enemy", game.players.enemy);
  syncBattleScreenCounterForSide("player", game.players.player);
}

function getCandiceFieldContentRect() {
  const myField = document.querySelector(
    '.battle.battle-board[data-battlefield="snowpoint_snowfield"] .my-field[data-candice-fixed-field="1"]',
  );

  if (!myField) return null;

  const rect = myField.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const style = window.getComputedStyle(myField);
  const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
  const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
  const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
  const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(style.paddingRight) || 0;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;

  const left = rect.left + borderLeft + paddingLeft;
  const top = rect.top + borderTop + paddingTop;
  const width = Math.max(
    0,
    rect.width - borderLeft - borderRight - paddingLeft - paddingRight,
  );
  const height = Math.max(
    0,
    rect.height - borderTop - borderBottom - paddingTop - paddingBottom,
  );

  return { myField, left, top, width, height };
}

function syncCandiceOverlayAlignment() {
  const overlay = document.querySelector(".candice-slot-overlay");
  if (!overlay) return;

  const contentRect = getCandiceFieldContentRect();
  if (!contentRect) {
    overlay.style.display = "none";
    return;
  }

  overlay.style.left = `${contentRect.left}px`;
  overlay.style.top = `${contentRect.top}px`;
  overlay.style.width = `${contentRect.width}px`;
  overlay.style.height = `${contentRect.height}px`;
  overlay.style.display = "grid";
}

function queueCandiceOverlayAlignment() {
  window.requestAnimationFrame(syncCandiceOverlayAlignment);
}

function rememberCandiceDropSlot(event) {
  if (
    document.body.dataset.battlefield !== "snowpoint_snowfield" ||
    document.body.dataset.battleTurn !== "player"
  ) {
    delete window.__pokeCandicePreferredSlot;
    return;
  }

  const contentRect = getCandiceFieldContentRect();
  if (!contentRect || contentRect.width <= 0) {
    delete window.__pokeCandicePreferredSlot;
    return;
  }

  const { clientX, clientY } = event;
  const inside =
    clientX >= contentRect.left &&
    clientX <= contentRect.left + contentRect.width &&
    clientY >= contentRect.top &&
    clientY <= contentRect.top + contentRect.height;

  if (!inside) {
    delete window.__pokeCandicePreferredSlot;
    return;
  }

  const trackWidth = contentRect.width / 6;
  const slot = Math.max(
    0,
    Math.min(5, Math.floor((clientX - contentRect.left) / trackWidth)),
  );

  window.__pokeCandicePreferredSlot = {
    slot,
    at: Date.now(),
  };
}

// 기본 포켓몬의 클릭 소환은 막고 드래그 소환만 유지한다.
// 모바일 진화체는 기존 React의 evolve 대상 선택 흐름으로 클릭을 통과시킨다.
function blockPokemonHandClick(event) {
  if (!(event.target instanceof Element)) return;

  const handCard = event.target.closest(
    ".battle.battle-board .hand .hand-card",
  );
  if (!handCard) return;

  const typeLabel = handCard.querySelector(".card-typebadge")?.textContent || "";
  if (!typeLabel.includes("포켓몬")) return;

  const stageLine = handCard.querySelector(".card-stageline")?.textContent || "";
  const isEvolution = Boolean(stageLine) && !stageLine.includes("이전 진화 없음");
  const isMobile = window.matchMedia?.(
    "(pointer: coarse), (max-width: 1024px)",
  ).matches;

  if (isMobile && isEvolution) return;

  event.preventDefault();
  event.stopPropagation();
}

function syncBattlePageState() {
  const battleSurface = document.querySelector(
    ".battle-intro, .battle.battle-board",
  );

  const locked = Boolean(battleSurface);

  document.documentElement.classList.toggle("battle-page-locked", locked);
  document.body.classList.toggle("battle-page-locked", locked);

  syncEndTurnLabel();
  syncBattleScreenCounters();
  queueCandiceOverlayAlignment();
}

function startBattleRuntime() {
  syncBattlePageState();

  window.addEventListener("battle-turn-change", () => {
    syncEndTurnLabel();
    syncBattleScreenCounters();
    queueCandiceOverlayAlignment();
  });
  window.addEventListener("unova-n-state-change", syncBattleScreenCounters);
  window.addEventListener(
    "candice-whiteout-change",
    queueCandiceOverlayAlignment,
  );
  window.addEventListener("resize", queueCandiceOverlayAlignment);
  window.addEventListener("pointerup", rememberCandiceDropSlot, true);
  document.addEventListener("click", blockPokemonHandClick, true);

  const observer = new MutationObserver(syncBattlePageState);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

if (document.body) {
  startBattleRuntime();
} else {
  window.addEventListener("DOMContentLoaded", startBattleRuntime, { once: true });
}
