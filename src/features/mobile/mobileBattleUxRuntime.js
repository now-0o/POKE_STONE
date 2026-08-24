/* Mobile battle UX bridge.
 *
 * - A tap never enters the visual "grab" state. Grabbing starts only after
 *   actual pointer movement, so tapped techniques/items/evolutions reliably
 *   reach React's click/target-selection flow.
 * - Portrait expanded hand uses a straight rail. Horizontal movement scrolls
 *   that rail and is stopped before React's drag listeners see it; vertical
 *   movement remains the existing drag-to-play gesture.
 * - VisualViewport metrics are exposed as CSS variables so landscape battle UI
 *   follows Safari's actually visible area when browser chrome appears.
 */

const MOBILE_BATTLE_QUERY = "(pointer: coarse), (max-width: 1024px)";
const PORTRAIT_QUERY = "(orientation: portrait)";
const MOVE_THRESHOLD = 9;
const SCROLL_DIRECTION_BIAS = 1.08;

let handGesture = null;
const suppressClickUntil = new WeakMap();

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
  const root = document.documentElement;

  if (width > 0) root.style.setProperty("--mobile-battle-vw", `${width}px`);
  if (height > 0) root.style.setProperty("--mobile-battle-vh", `${height}px`);
  root.style.setProperty("--mobile-battle-vx", `${offsetLeft}px`);
  root.style.setProperty("--mobile-battle-vy", `${offsetTop}px`);
  root.style.setProperty("--mobile-battle-cx", `${centerX}px`);
}

function beginHandGesture(event) {
  if (!isMobileBattle() || !(event.target instanceof Element)) return;

  const board = getBoard(event.target);
  if (!board || !board.classList.contains("mobile-hand-open")) return;
  if (board.querySelector(":scope > .hand .hand-card.selected")) return;
  if (event.target.closest(".btn-discard-redraw")) return;

  const hand = event.target.closest(".hand");
  if (!hand || hand !== getDirectHand(board)) return;

  const wrap = event.target.closest(".hand-card-wrap");
  if (!wrap) return;

  handGesture = {
    board,
    hand,
    wrap,
    portrait: isPortrait(),
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    moved: false,
    decided: false,
    scrolling: false,
  };

  // battle-hand-runtime runs on document capture later in this same pointerdown
  // and historically adds its grabbing class immediately. Clear it after the
  // pointerdown dispatch. A stationary tap should never visually/semantically
  // become a card drag, regardless of orientation or card kind.
  queueMicrotask(() => {
    if (!handGesture || handGesture.wrap !== wrap || handGesture.moved) return;
    clearVisualGrab(board, wrap);
  });
}

function moveHandGesture(event) {
  const gesture = handGesture;
  if (!gesture || !document.contains(gesture.board)) return;

  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;
  const distance = Math.hypot(dx, dy);

  if (!gesture.decided && distance > MOVE_THRESHOLD) {
    gesture.decided = true;
    gesture.moved = true;

    if (
      gesture.portrait &&
      Math.abs(dx) > Math.abs(dy) * SCROLL_DIRECTION_BIAS
    ) {
      gesture.scrolling = true;
      clearVisualGrab(gesture.board, gesture.wrap);
    } else {
      gesture.scrolling = false;
      // Re-enable the existing grabbed-card presentation only after the user
      // has actually moved far enough to mean a drag.
      setVisualGrab(gesture.board, gesture.wrap);
    }
  }

  if (!gesture.scrolling) {
    gesture.lastX = event.clientX;
    return;
  }

  const deltaX = event.clientX - gesture.lastX;
  gesture.lastX = event.clientX;
  gesture.hand.scrollLeft -= deltaX;

  suppressClickUntil.set(gesture.board, Date.now() + 500);
  event.preventDefault();

  // Important: React adds temporary pointermove listeners on window after the
  // card pointerdown. stopPropagation() alone still lets later listeners on the
  // same Window fire, which turned a horizontal swipe into a card drag. Stop
  // same-target listeners too so this gesture remains a pure hand scroll.
  event.stopImmediatePropagation();
}

function endHandGesture() {
  const gesture = handGesture;
  handGesture = null;
  if (!gesture) return;

  if (!gesture.moved || gesture.scrolling) {
    clearVisualGrab(gesture.board, gesture.wrap);
  }

  if (gesture.scrolling) {
    suppressClickUntil.set(gesture.board, Date.now() + 500);
  }
}

function isEvolutionHandCard(handCard) {
  const stageLine = handCard.querySelector(".card-stageline")?.textContent || "";
  return Boolean(stageLine) && !stageLine.includes("이전 진화 없음");
}

function handleClickCapture(event) {
  if (!isMobileBattle() || !(event.target instanceof Element)) return;

  const board = getBoard(event.target);
  if (!board) return;

  const blockedUntil = suppressClickUntil.get(board) || 0;
  if (Date.now() < blockedUntil && event.target.closest(".hand")) {
    event.preventDefault();
    event.stopPropagation();
    suppressClickUntil.delete(board);
    return;
  }

  const handCard = event.target.closest(".hand .hand-card");
  if (!handCard || !isEvolutionHandCard(handCard)) return;

  const badge = handCard.querySelector(".card-typebadge");
  const original = badge?.textContent || "";
  if (!badge || !original.includes("포켓몬")) return;

  // runtime.js deliberately blocks basic Pokémon clicks by inspecting this
  // badge. Evolution cards temporarily hide only that token for this click so
  // React can enter its already-existing spellNeedsTarget(card) === "evolve"
  // flow. The visible label is restored before paint.
  badge.textContent = original.replace("포켓몬", "진화");
  queueMicrotask(() => {
    if (badge.isConnected) badge.textContent = original;
  });
}

function refreshViewportSoon() {
  syncVisibleViewport();
  requestAnimationFrame(syncVisibleViewport);
}

if (typeof document !== "undefined") {
  syncVisibleViewport();

  // Window capture runs before document capture in battle-hand-runtime and
  // before temporary Window listeners installed by Battle.jsx.
  window.addEventListener("pointerdown", beginHandGesture, true);
  window.addEventListener("pointermove", moveHandGesture, true);
  window.addEventListener("pointerup", endHandGesture, true);
  window.addEventListener("pointercancel", endHandGesture, true);

  // Imported before battle/runtime.js, so evolution clicks are adjusted before
  // its basic-Pokémon click guard runs.
  document.addEventListener("click", handleClickCapture, true);

  window.addEventListener("resize", refreshViewportSoon, { passive: true });
  window.addEventListener("orientationchange", () => {
    refreshViewportSoon();
    window.setTimeout(syncVisibleViewport, 120);
    window.setTimeout(syncVisibleViewport, 360);
  }, { passive: true });
  window.visualViewport?.addEventListener("resize", refreshViewportSoon, {
    passive: true,
  });
  window.visualViewport?.addEventListener("scroll", refreshViewportSoon, {
    passive: true,
  });
}
