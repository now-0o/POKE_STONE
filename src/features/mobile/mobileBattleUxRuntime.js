/* Mobile battle UX bridge.
 *
 * 1) Evolution Pokémon may be tapped to enter the existing React "evolve"
 *    target-selection flow. Basic Pokémon remain drag-only, so a simple tap can
 *    never summon them by accident.
 * 2) In portrait expanded-hand mode, horizontal swipes scroll the straight hand
 *    rail instead of starting a card drag. Vertical movement still becomes the
 *    existing drag gesture, so drag-to-play is preserved.
 */

const MOBILE_BATTLE_QUERY = "(pointer: coarse), (max-width: 1024px)";
const PORTRAIT_QUERY = "(orientation: portrait)";
const SCROLL_THRESHOLD = 9;
const SCROLL_DIRECTION_BIAS = 1.08;

let portraitGesture = null;
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

function beginPortraitHandGesture(event) {
  if (!isMobileBattle() || !isPortrait()) return;
  if (!(event.target instanceof Element)) return;

  const board = getBoard(event.target);
  if (!board || !board.classList.contains("mobile-hand-open")) return;
  if (board.querySelector(":scope > .hand .hand-card.selected")) return;
  if (event.target.closest(".btn-discard-redraw")) return;

  const hand = event.target.closest(".hand");
  if (!hand || hand !== getDirectHand(board)) return;

  const wrap = event.target.closest(".hand-card-wrap");
  if (!wrap) return;

  portraitGesture = {
    board,
    hand,
    wrap,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    decided: false,
    scrolling: false,
  };

  // battle-hand-runtime marks a touched expanded card as "grabbing" during the
  // same pointerdown event. In portrait we delay that visual state until motion
  // proves the gesture is a vertical card drag; a plain tap or horizontal swipe
  // should keep the full straight hand rail visible.
  queueMicrotask(() => {
    if (!portraitGesture || portraitGesture.wrap !== wrap) return;
    if (portraitGesture.decided) return;
    clearVisualGrab(board, wrap);
  });
}

function movePortraitHandGesture(event) {
  const gesture = portraitGesture;
  if (!gesture || !document.contains(gesture.board)) return;

  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;
  const distance = Math.hypot(dx, dy);

  if (!gesture.decided && distance > SCROLL_THRESHOLD) {
    if (Math.abs(dx) > Math.abs(dy) * SCROLL_DIRECTION_BIAS) {
      gesture.decided = true;
      gesture.scrolling = true;
      clearVisualGrab(gesture.board, gesture.wrap);
    } else {
      gesture.decided = true;
      gesture.scrolling = false;
      gesture.board.classList.add("mobile-hand-grabbing");
      gesture.wrap.classList.add("mobile-grabbed-card");
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

  // Stop this move before the existing React drag listener sees it. Pointer-up
  // is deliberately allowed through later so React can clean up its listeners.
  event.stopPropagation();
}

function endPortraitHandGesture() {
  const gesture = portraitGesture;
  portraitGesture = null;
  if (!gesture) return;

  if (gesture.scrolling) {
    suppressClickUntil.set(gesture.board, Date.now() + 500);
    clearVisualGrab(gesture.board, gesture.wrap);
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

  // runtime.js intentionally blocks click-to-play on Pokémon by checking this
  // visible badge text. For an evolution card only, hide the "포켓몬" token for
  // the duration of this single click dispatch. React then receives the click,
  // sees spellNeedsTarget(card) === "evolve", and opens its existing target
  // selector. The text is restored before the browser can paint, so the card UI
  // never visibly changes.
  badge.textContent = original.replace("포켓몬", "진화");
  queueMicrotask(() => {
    if (badge.isConnected) badge.textContent = original;
  });
}

if (typeof document !== "undefined") {
  // Window capture runs before document capture used by battle-hand-runtime.
  window.addEventListener("pointerdown", beginPortraitHandGesture, true);
  window.addEventListener("pointermove", movePortraitHandGesture, true);
  window.addEventListener("pointerup", endPortraitHandGesture, true);
  window.addEventListener("pointercancel", endPortraitHandGesture, true);

  // This module is imported before battle/runtime.js, so this click-capture
  // listener runs before its basic-Pokémon click guard.
  document.addEventListener("click", handleClickCapture, true);
}
