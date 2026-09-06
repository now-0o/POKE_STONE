/* Mobile battle UX bridge.
 *
 * - Expanded-hand taps are resolved explicitly on pointer-up. We dispatch one
 *   synthetic click into React and suppress the following trusted browser click,
 *   so tools, techniques, Mega Stones and evolution cards reliably enter their
 *   existing target-selection flow without being mistaken for drags.
 * - While a tap-target card is active (or React is still rendering that state),
 *   field-unit pointerdown is stopped before attack/inspect gestures can start;
 *   the later click is left untouched so React's onUnitClick resolves the card.
 * - Portrait horizontal movement remains a pure hand scroll, including gestures
 *   that start on an evolution-exchange control or the empty rail between cards.
 * - Landscape basic-Pokemon drags get a real DOM drop-assist over the visible
 *   player field so releasing near the centre resolves as my-field reliably.
 * - VisualViewport metrics keep landscape UI inside Safari's visible rectangle.
 *
 * Important: this module deliberately avoids a document-wide MutationObserver.
 * Battle mounting and animation changes can produce a very large mutation burst
 * immediately after mulligan; polling every class mutation can stall mobile Safari.
 */

const MOBILE_BATTLE_QUERY = "(pointer: coarse), (max-width: 1024px)";
const PORTRAIT_QUERY = "(orientation: portrait)";
const LANDSCAPE_QUERY = "(orientation: landscape)";
const MOVE_THRESHOLD = 8;
const SCROLL_DIRECTION_BIAS = 1.04;

let handGesture = null;
let basicDropAssist = null;
let viewportMetricsKey = "";
let viewportRefreshFrame = 0;
let dropAssistFrame = 0;
const suppressTrustedHandClickUntil = new WeakMap();
const suppressScrollClickUntil = new WeakMap();

function isMobileBattle() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_BATTLE_QUERY).matches
  );
}

function isPortrait() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(PORTRAIT_QUERY).matches
  );
}

function isLandscape() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(LANDSCAPE_QUERY).matches
  );
}

function getBoard(target) {
  return target instanceof Element ? target.closest(".battle-board") : null;
}

function getDirectHand(board) {
  return board?.querySelector(":scope > .hand") || null;
}

function clearVisualGrab(board, wrap) {
  wrap?.classList.remove("mobile-grabbed-card");
  board?.classList.remove("mobile-hand-grabbing");
}

function setVisualGrab(board, wrap) {
  if (!board || !wrap) return;
  board.classList.add("mobile-hand-grabbing");
  wrap.classList.add("mobile-grabbed-card");
}

function syncVisibleViewport() {
  if (!isMobileBattle()) return;

  const viewport = window.visualViewport;
  const width = Math.round(viewport?.width || window.innerWidth || 0);
  const height = Math.round(viewport?.height || window.innerHeight || 0);
  const offsetLeft = Math.round(viewport?.offsetLeft || 0);
  const offsetTop = Math.round(viewport?.offsetTop || 0);
  const centerX = Math.round(offsetLeft + width / 2);
  const nextMetricsKey = `${width}|${height}|${offsetLeft}|${offsetTop}|${centerX}`;

  if (nextMetricsKey === viewportMetricsKey) return;
  viewportMetricsKey = nextMetricsKey;

  const root = document.documentElement;

  if (width > 0) root.style.setProperty("--mobile-battle-vw", `${width}px`);
  if (height > 0) root.style.setProperty("--mobile-battle-vh", `${height}px`);
  root.style.setProperty("--mobile-battle-vx", `${offsetLeft}px`);
  root.style.setProperty("--mobile-battle-vy", `${offsetTop}px`);
  root.style.setProperty("--mobile-battle-cx", `${centerX}px`);
}

function isBasicPokemonCard(handCard) {
  if (!handCard) return false;
  const typeLabel = handCard.querySelector(".card-typebadge")?.textContent || "";
  const stageLine = handCard.querySelector(".card-stageline")?.textContent || "";
  return typeLabel.includes("포켓몬") && stageLine.includes("이전 진화 없음");
}

function isTapPlayableCard(handCard) {
  if (!handCard) return false;
  return !isBasicPokemonCard(handCard);
}

function syncTapTargetState(board) {
  if (!board || !document.contains(board)) return;
  const selected = board.querySelector(":scope > .hand .hand-card.selected");
  board.classList.toggle("mobile-tap-target-active", Boolean(selected));
  if (!selected) board.classList.remove("mobile-tap-target-pending");
}

function queueTapTargetSync(board) {
  requestAnimationFrame(() => {
    syncTapTargetState(board);
    requestAnimationFrame(() => syncTapTargetState(board));
  });
}

function dispatchMobileHandTap(gesture) {
  const { board, wrap, startedOnControl } = gesture;
  if (startedOnControl) return;

  const handCard = wrap?.querySelector(":scope > .hand-card");
  if (!handCard || !isTapPlayableCard(handCard)) return;

  clearVisualGrab(board, wrap);
  board.classList.add("mobile-tap-target-pending");

  suppressTrustedHandClickUntil.set(board, Date.now() + 420);
  handCard.click();
  queueTapTargetSync(board);
}

function beginHandGesture(event) {
  if (!isMobileBattle() || !(event.target instanceof Element)) return;

  const board = getBoard(event.target);
  if (!board || !board.classList.contains("mobile-hand-open")) return;
  if (board.querySelector(":scope > .hand .hand-card.selected")) return;

  const hand = event.target.closest(".hand");
  if (!hand || hand !== getDirectHand(board)) return;

  const wrap = event.target.closest(".hand-card-wrap");

  // In portrait the whole expanded rail is a scroll surface. Previously a swipe
  // starting on the exchange button (or a gap between cards) never created a
  // gesture, which made long hands feel randomly locked.
  if (!wrap && !isPortrait()) return;

  handGesture = {
    board,
    hand,
    wrap,
    startedOnControl: Boolean(event.target.closest("button, a, input, select, textarea")),
    portrait: isPortrait(),
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    moved: false,
    decided: false,
    scrolling: false,
  };
}

function scheduleBasicPokemonDropAssist() {
  if (dropAssistFrame) return;
  dropAssistFrame = requestAnimationFrame(() => {
    dropAssistFrame = 0;
    ensureBasicPokemonDropAssist();
  });
}

function moveHandGesture(event) {
  const gesture = handGesture;
  if (!gesture || !document.contains(gesture.board)) {
    scheduleBasicPokemonDropAssist();
    return;
  }

  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;
  const distance = Math.hypot(dx, dy);

  if (!gesture.decided && distance > MOVE_THRESHOLD) {
    gesture.decided = true;
    gesture.moved = true;

    if (
      gesture.portrait &&
      Math.abs(dx) >= Math.abs(dy) * SCROLL_DIRECTION_BIAS
    ) {
      gesture.scrolling = true;
      clearVisualGrab(gesture.board, gesture.wrap);
      gesture.board.classList.add("mobile-hand-scrolling");
    } else {
      gesture.scrolling = false;
      setVisualGrab(gesture.board, gesture.wrap);
      scheduleBasicPokemonDropAssist();
    }
  }

  if (!gesture.scrolling) {
    gesture.lastX = event.clientX;
    scheduleBasicPokemonDropAssist();
    return;
  }

  const deltaX = event.clientX - gesture.lastX;
  gesture.lastX = event.clientX;
  gesture.hand.scrollLeft -= deltaX;

  suppressScrollClickUntil.set(gesture.board, Date.now() + 500);
  event.preventDefault();
  event.stopImmediatePropagation();
}

function endHandGesture() {
  const gesture = handGesture;
  handGesture = null;
  if (!gesture) {
    scheduleDropAssistRemoval();
    return;
  }

  gesture.board.classList.remove("mobile-hand-scrolling");

  if (!gesture.moved) {
    dispatchMobileHandTap(gesture);
    clearVisualGrab(gesture.board, gesture.wrap);
  } else if (gesture.scrolling) {
    suppressScrollClickUntil.set(gesture.board, Date.now() + 500);
    clearVisualGrab(gesture.board, gesture.wrap);
  }

  scheduleDropAssistRemoval();
}

function blockAttackPointerDownDuringTapTarget(event) {
  if (!isMobileBattle() || !(event.target instanceof Element)) return;
  const board = getBoard(event.target);
  if (!board) return;

  const targeting =
    board.classList.contains("mobile-tap-target-pending") ||
    board.classList.contains("mobile-tap-target-active") ||
    Boolean(board.querySelector(":scope > .hand .hand-card.selected"));

  if (!targeting) return;
  if (!event.target.closest(".field-unit, [data-drop='my-hero'], [data-drop='enemy-hero']")) {
    return;
  }

  event.stopPropagation();
}

function handleClickCapture(event) {
  if (!isMobileBattle() || !(event.target instanceof Element)) return;

  const board = getBoard(event.target);
  if (!board) return;

  if (event.target.closest(".hand")) {
    const scrollUntil = suppressScrollClickUntil.get(board) || 0;
    if (Date.now() < scrollUntil) {
      event.preventDefault();
      event.stopPropagation();
      suppressScrollClickUntil.delete(board);
      return;
    }

    const trustedUntil = suppressTrustedHandClickUntil.get(board) || 0;
    if (event.isTrusted && Date.now() < trustedUntil) {
      event.preventDefault();
      event.stopPropagation();
      suppressTrustedHandClickUntil.delete(board);
    }
  }
}

function getDraggedOriginCard(board) {
  return board?.querySelector(":scope > .hand .hand-card.drag-origin") || null;
}

function removeBasicPokemonDropAssist() {
  if (dropAssistFrame) {
    cancelAnimationFrame(dropAssistFrame);
    dropAssistFrame = 0;
  }
  basicDropAssist?.remove();
  basicDropAssist = null;
}

function scheduleDropAssistRemoval() {
  window.setTimeout(removeBasicPokemonDropAssist, 0);
}

function ensureBasicPokemonDropAssist() {
  if (!isMobileBattle() || !isLandscape()) {
    removeBasicPokemonDropAssist();
    return;
  }

  const board = document.querySelector(".battle.battle-board");
  const origin = getDraggedOriginCard(board);
  const field = board?.querySelector(":scope > .my-field[data-drop='my-field']");

  if (!board?.querySelector(".drag-ghost") || !origin || !isBasicPokemonCard(origin) || !field) {
    removeBasicPokemonDropAssist();
    return;
  }

  const rect = field.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    removeBasicPokemonDropAssist();
    return;
  }

  if (!basicDropAssist) {
    basicDropAssist = document.createElement("div");
    basicDropAssist.className = "mobile-basic-pokemon-drop-assist";
    basicDropAssist.dataset.drop = "my-field";
    basicDropAssist.setAttribute("aria-hidden", "true");
    document.body.appendChild(basicDropAssist);
  }

  const padX = Math.min(54, Math.max(30, rect.width * 0.07));
  const padTop = Math.min(34, Math.max(20, rect.height * 0.28));
  const padBottom = Math.min(48, Math.max(28, rect.height * 0.4));
  const nextLeft = `${rect.left - padX}px`;
  const nextTop = `${rect.top - padTop}px`;
  const nextWidth = `${rect.width + padX * 2}px`;
  const nextHeight = `${rect.height + padTop + padBottom}px`;
  const style = basicDropAssist.style;

  if (style.position !== "fixed") style.position = "fixed";
  if (style.left !== nextLeft) style.left = nextLeft;
  if (style.top !== nextTop) style.top = nextTop;
  if (style.width !== nextWidth) style.width = nextWidth;
  if (style.height !== nextHeight) style.height = nextHeight;
  if (style.background !== "transparent") style.background = "transparent";
  if (style.pointerEvents !== "auto") style.pointerEvents = "auto";
  if (style.zIndex !== "1490") style.zIndex = "1490";
}

function refreshViewportSoon() {
  if (viewportRefreshFrame) return;
  viewportRefreshFrame = requestAnimationFrame(() => {
    viewportRefreshFrame = 0;
    syncVisibleViewport();
    ensureBasicPokemonDropAssist();
  });
}

if (typeof document !== "undefined") {
  syncVisibleViewport();

  window.addEventListener("pointerdown", blockAttackPointerDownDuringTapTarget, true);
  window.addEventListener("pointerdown", beginHandGesture, true);
  window.addEventListener("pointermove", moveHandGesture, true);
  window.addEventListener("pointerup", endHandGesture, true);
  window.addEventListener("pointercancel", endHandGesture, true);

  document.addEventListener("click", handleClickCapture, true);
  document.addEventListener(
    "click",
    (event) => {
      const board = getBoard(event.target);
      if (board) queueTapTargetSync(board);
    },
    false,
  );

  // Do not observe the whole battle subtree. The battle mounts a large DOM tree
  // immediately after mulligan and many feature runtimes mutate classes. A global
  // class observer caused a mutation storm on mobile Safari. Interaction events
  // above already cover every state that needs synchronization.

  window.addEventListener("resize", refreshViewportSoon, { passive: true });
  window.addEventListener(
    "orientationchange",
    () => {
      viewportMetricsKey = "";
      refreshViewportSoon();
      window.setTimeout(() => {
        viewportMetricsKey = "";
        syncVisibleViewport();
      }, 120);
      window.setTimeout(() => {
        viewportMetricsKey = "";
        syncVisibleViewport();
      }, 360);
    },
    { passive: true },
  );
  window.visualViewport?.addEventListener("resize", refreshViewportSoon, {
    passive: true,
  });
  window.visualViewport?.addEventListener("scroll", refreshViewportSoon, {
    passive: true,
  });
}
