/* Mobile Hearthstone-style hand interaction runtime.
 * Battle/game logic remains in React. This file only owns mobile hand presentation state.
 * A stationary tap never becomes a visual grab; grabbing starts only after real movement.
 */

const MOBILE_BATTLE_QUERY = "(pointer: coarse), (max-width: 1024px)";
const suppressClickUntil = new WeakMap();
const lastHandCount = new WeakMap();
const handLayoutState = new WeakMap();
let handGesture = null;
let refreshHandsFrame = 0;

function isMobileBattle() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_BATTLE_QUERY).matches
  );
}

function isPortrait() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(orientation: portrait)").matches
  );
}

function getBoard(target) {
  return target instanceof Element ? target.closest(".battle-board") : null;
}

function getHand(board) {
  return board?.querySelector(":scope > .hand") || null;
}

function getHandCount(board) {
  return (
    getHand(board)?.querySelectorAll(":scope > .hand-card-wrap").length || 0
  );
}

function syncMobileBattleViewport() {
  if (!isMobileBattle()) return;

  const viewport = window.visualViewport;
  const height = Math.round(viewport?.height || window.innerHeight || 0);

  if (height > 0) {
    const next = `${height}px`;
    const root = document.documentElement;
    if (root.style.getPropertyValue("--mobile-battle-vh") !== next) {
      root.style.setProperty("--mobile-battle-vh", next);
    }
  }
}

function setStylePropertyIfChanged(element, name, value) {
  if (element.style.getPropertyValue(name) !== value) {
    element.style.setProperty(name, value);
  }
}

function layoutHand(hand) {
  if (!hand) return;

  const wraps = [...hand.querySelectorAll(":scope > .hand-card-wrap")];
  const count = wraps.length;
  if (!count) {
    handLayoutState.delete(hand);
    return;
  }

  const board = hand.closest(".battle-board");
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  const hasDiscardControls = wraps.some((wrap) =>
    wrap.querySelector(":scope > .btn-discard-redraw"),
  );
  const viewportWidth = Math.round(window.innerWidth || 0);

  board?.classList.toggle("mobile-hand-has-discard", hasDiscardControls);

  const previous = handLayoutState.get(hand);
  const sameLayout =
    previous?.count === count &&
    previous?.portrait === portrait &&
    previous?.hasDiscardControls === hasDiscardControls &&
    previous?.viewportWidth === viewportWidth &&
    previous?.wraps?.length === count &&
    wraps.every((wrap, index) => previous.wraps[index] === wrap);

  if (sameLayout) return;

  const expandedMargin = portrait ? 54 : 74;
  const expandedMax = portrait ? 380 : 560;
  const expandedStepMax = portrait ? 54 : 64;
  const expandedSpan = Math.max(
    0,
    Math.min(viewportWidth - expandedMargin, expandedMax),
  );
  const expandedStep =
    count > 1 ? Math.min(expandedStepMax, expandedSpan / (count - 1)) : 0;

  const collapsedLimit = hasDiscardControls
    ? portrait
      ? 124
      : 128
    : portrait
      ? 96
      : 112;
  const collapsedViewportRatio = hasDiscardControls
    ? portrait
      ? 0.34
      : 0.22
    : portrait
      ? 0.25
      : 0.18;
  const collapsedSpan = Math.min(
    collapsedLimit,
    Math.max(0, viewportWidth * collapsedViewportRatio),
  );
  const collapsedStep = count > 1 ? collapsedSpan / (count - 1) : 0;
  const center = (count - 1) / 2;

  wraps.forEach((wrap, index) => {
    const offset = index - center;
    const angle = Math.max(-10, Math.min(10, offset * 2.15));
    const collapsedOffset = hasDiscardControls
      ? (index - (count - 1)) * collapsedStep
      : offset * collapsedStep;

    setStylePropertyIfChanged(
      wrap,
      "--mobile-expanded-x",
      `${offset * expandedStep}px`,
    );
    setStylePropertyIfChanged(
      wrap,
      "--mobile-collapsed-x",
      `${collapsedOffset}px`,
    );
    setStylePropertyIfChanged(wrap, "--mobile-hand-angle", `${angle}deg`);
    setStylePropertyIfChanged(
      wrap,
      "--mobile-hand-index",
      String(index + 1),
    );
  });

  handLayoutState.set(hand, {
    count,
    portrait,
    hasDiscardControls,
    viewportWidth,
    wraps,
  });
}

function openHand(board) {
  if (
    !board ||
    board.classList.contains("aiming") ||
    board.querySelector(".drag-ghost")
  ) {
    return;
  }

  layoutHand(getHand(board));
  board.classList.add("mobile-hand-open");
}

function closeHand(board) {
  if (!board) return;
  board.classList.remove("mobile-hand-open");
}

function clearGrabState(board, wrap) {
  wrap?.classList.remove("mobile-grabbed-card");
  board?.classList.remove("mobile-hand-grabbing");
}

function setGrabState(board, wrap) {
  if (!board || !wrap) return;
  board.classList.add("mobile-hand-grabbing");
  wrap.classList.add("mobile-grabbed-card");
}

function isEmptyFieldTap(target) {
  const field = target.closest?.(".field");
  if (!field) return false;

  return !target.closest?.(
    ".field-unit, .field-obstacle, .unit-pop, .field-fixed-slot:not(.is-empty), button, .target-hint",
  );
}

function settleAfterGesture(gesture) {
  const { board, cardWrap, cardCount, moved } = gesture;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (!document.contains(board)) return;

        const afterCount = getHandCount(board);
        const selected = board.querySelector(".hand-card.selected");
        const dragging = board.querySelector(".drag-ghost");
        const cardWasUsed = afterCount < cardCount;

        clearGrabState(board, cardWrap);

        if (cardWasUsed) {
          closeHand(board);
        } else if (selected) {
          closeHand(board);
        } else if (!dragging && moved) {
          openHand(board);
        }

        lastHandCount.set(board, afterCount);
        layoutHand(getHand(board));
      }, 24);
    });
  });
}

function onPointerDown(event) {
  if (!isMobileBattle()) return;

  const board = getBoard(event.target);
  if (!board) return;

  if (event.target.closest?.(".btn-discard-redraw")) {
    suppressClickUntil.delete(board);
    return;
  }

  const hand = event.target.closest?.(".hand");
  if (hand && hand === getHand(board)) {
    layoutHand(hand);

    const cardWrap = event.target.closest?.(".hand-card-wrap");
    const wasOpen = board.classList.contains("mobile-hand-open");
    const cardCount = getHandCount(board);
    lastHandCount.set(board, cardCount);

    if (!wasOpen && !board.querySelector(".hand-card.selected")) {
      openHand(board);

      if (cardWrap) {
        suppressClickUntil.set(board, Date.now() + 550);
        event.stopPropagation();
      }
      return;
    }

    handGesture = {
      board,
      hand,
      cardWrap,
      portrait: isPortrait(),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      scrolling: false,
      cardCount,
    };
    return;
  }

  // 기술/도구/진화 카드의 대상 선택 중에는 필드 포켓몬 터치를
  // 공격 제스처로 해석하지 않는다. React의 onUnitClick이 카드 사용을 처리한다.
  if (board.querySelector(":scope > .hand .hand-card.selected")) {
    board.classList.remove("mobile-field-interacting");
    return;
  }

  const unit = event.target.closest?.(".field-unit.can-act");
  if (unit) {
    closeHand(board);
    board.classList.add("mobile-field-interacting");
    return;
  }

  if (isEmptyFieldTap(event.target)) {
    closeHand(board);
  }
}

function onPointerMove(event) {
  if (!handGesture) return;

  const dx = event.clientX - handGesture.startX;
  const dy = event.clientY - handGesture.startY;
  const distance = Math.hypot(dx, dy);

  // Portrait expanded hands are a horizontal rail. Reserve horizontal-dominant
  // movement for scrolling before the legacy grab state can turn it into a card drag.
  if (
    !handGesture.scrolling &&
    handGesture.portrait &&
    handGesture.board.classList.contains("mobile-hand-open") &&
    distance > 8 &&
    Math.abs(dx) >= Math.abs(dy) * 1.04
  ) {
    handGesture.moved = true;
    handGesture.scrolling = true;
    clearGrabState(handGesture.board, handGesture.cardWrap);
    return;
  }

  if (handGesture.scrolling) return;

  if (!handGesture.moved && distance > 10) {
    handGesture.moved = true;
    setGrabState(handGesture.board, handGesture.cardWrap);
  }
}

function holdInspectOpenWhileMoving(event) {
  if (!isMobileBattle()) return;

  if (
    document.querySelector(
      ".inspect-overlay, .mobile-v2-inspect-overlay, .mobile-landscape-inspect",
    )
  ) {
    event.stopImmediatePropagation();
  }
}

function onPointerUp() {
  document
    .querySelectorAll(".battle-board.mobile-field-interacting")
    .forEach((board) => {
      window.setTimeout(
        () => board.classList.remove("mobile-field-interacting"),
        90,
      );
    });

  if (!handGesture) return;

  const gesture = handGesture;
  handGesture = null;
  lastHandCount.set(gesture.board, gesture.cardCount);
  settleAfterGesture(gesture);
}

function onClickCapture(event) {
  if (!isMobileBattle()) return;

  const board = getBoard(event.target);
  if (!board || !event.target.closest?.(".hand")) return;

  if (event.target.closest?.(".btn-discard-redraw")) {
    suppressClickUntil.delete(board);
    return;
  }

  const until = suppressClickUntil.get(board) || 0;
  if (Date.now() < until) {
    event.preventDefault();
    event.stopPropagation();
    suppressClickUntil.delete(board);
  }
}

function onClickBubble(event) {
  if (!isMobileBattle()) return;

  const board = getBoard(event.target);
  const hand = board && event.target.closest?.(".hand");
  if (!board || !hand) return;

  const beforeCount =
    lastHandCount.get(board) ??
    hand.querySelectorAll(":scope > .hand-card-wrap").length;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!document.contains(board)) return;

      const selected = board.querySelector(".hand-card.selected");
      const dragging = board.querySelector(".drag-ghost");
      const afterCount = getHandCount(board);

      if (afterCount < beforeCount || selected || dragging) {
        closeHand(board);
      }

      lastHandCount.set(board, afterCount);
      layoutHand(getHand(board));
    });
  });
}

function refreshHands() {
  if (!isMobileBattle()) return;

  document.querySelectorAll(".battle-board > .hand").forEach((hand) => {
    const board = hand.closest(".battle-board");
    if (!board) return;

    const beforeCount = lastHandCount.get(board);
    const afterCount = getHandCount(board);

    if (beforeCount != null && afterCount < beforeCount) {
      closeHand(board);
      board.classList.remove("mobile-hand-grabbing");
      hand
        .querySelectorAll(":scope > .hand-card-wrap.mobile-grabbed-card")
        .forEach((wrap) => wrap.classList.remove("mobile-grabbed-card"));
    }

    layoutHand(hand);
    lastHandCount.set(board, afterCount);
  });
}

function scheduleRefreshHands() {
  if (refreshHandsFrame) return;
  refreshHandsFrame = requestAnimationFrame(() => {
    refreshHandsFrame = 0;
    refreshHands();
  });
}

function nodeContainsBattleHand(node) {
  if (!(node instanceof Element)) return false;
  return (
    node.matches(".battle-board, .battle-board > .hand, .hand-card-wrap") ||
    Boolean(
      node.querySelector?.(
        ".battle-board, .battle-board > .hand, .battle-board > .hand > .hand-card-wrap",
      ),
    )
  );
}

function mutationTouchesBattleHand(mutation) {
  const target = mutation.target;
  if (
    target instanceof Element &&
    (target.matches(".battle-board > .hand") ||
      Boolean(target.closest(".battle-board > .hand")))
  ) {
    return true;
  }

  for (const node of mutation.addedNodes) {
    if (nodeContainsBattleHand(node)) return true;
  }
  for (const node of mutation.removedNodes) {
    if (nodeContainsBattleHand(node)) return true;
  }
  return false;
}

function refreshMobileBattleLayout() {
  syncMobileBattleViewport();
  scheduleRefreshHands();
}

if (typeof document !== "undefined") {
  syncMobileBattleViewport();

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerUp, true);
  document.addEventListener("click", onClickCapture, true);
  document.addEventListener("click", onClickBubble, false);

  window.addEventListener("pointermove", holdInspectOpenWhileMoving, true);

  // Only hand mount/unmount and hand-card child changes need a relayout.
  // Battle effects add/remove many unrelated DOM nodes, so reacting to every
  // document-wide childList mutation creates a large amount of redundant work.
  const observer = new MutationObserver((mutations) => {
    if (!isMobileBattle()) return;
    if (mutations.some(mutationTouchesBattleHand)) {
      scheduleRefreshHands();
    }
  });

  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });

  scheduleRefreshHands();
  window.setTimeout(scheduleRefreshHands, 60);
  window.setTimeout(scheduleRefreshHands, 180);

  window.addEventListener("resize", refreshMobileBattleLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", refreshMobileBattleLayout, {
    passive: true,
  });
  window.visualViewport?.addEventListener("scroll", refreshMobileBattleLayout, {
    passive: true,
  });

  window.addEventListener(
    "orientationchange",
    () => {
      refreshMobileBattleLayout();
      window.setTimeout(refreshMobileBattleLayout, 120);
      window.setTimeout(refreshMobileBattleLayout, 360);
    },
    { passive: true },
  );
}
