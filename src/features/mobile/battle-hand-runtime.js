/* Mobile Hearthstone-style hand interaction runtime.
 * Battle/game logic remains in React. This file only owns mobile hand presentation state.
 * A stationary tap never becomes a visual grab; grabbing starts only after real movement.
 */

const MOBILE_BATTLE_QUERY = "(pointer: coarse), (max-width: 1024px)";
const suppressClickUntil = new WeakMap();
const lastHandCount = new WeakMap();
let handGesture = null;

function isMobileBattle() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_BATTLE_QUERY).matches
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
    document.documentElement.style.setProperty(
      "--mobile-battle-vh",
      `${height}px`,
    );
  }
}

function layoutHand(hand) {
  if (!hand) return;

  const wraps = [...hand.querySelectorAll(":scope > .hand-card-wrap")];
  const count = wraps.length;
  if (!count) return;

  const board = hand.closest(".battle-board");
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  const hasDiscardControls = wraps.some((wrap) =>
    wrap.querySelector(":scope > .btn-discard-redraw"),
  );

  board?.classList.toggle("mobile-hand-has-discard", hasDiscardControls);

  const expandedMargin = portrait ? 54 : 74;
  const expandedMax = portrait ? 380 : 560;
  const expandedStepMax = portrait ? 54 : 64;
  const expandedSpan = Math.max(
    0,
    Math.min(window.innerWidth - expandedMargin, expandedMax),
  );
  const expandedStep =
    count > 1 ? Math.min(expandedStepMax, expandedSpan / (count - 1)) : 0;

  // 축소 손패는 기본 포개짐을 유지한다. 버리기 버튼이 있는 경우에도
  // 버튼이 눌릴 정도만 살짝 넓히고, 손패가 화면을 길게 차지하지 않게 제한한다.
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
    Math.max(0, window.innerWidth * collapsedViewportRatio),
  );
  const collapsedStep = count > 1 ? collapsedSpan / (count - 1) : 0;
  const center = (count - 1) / 2;

  wraps.forEach((wrap, index) => {
    const offset = index - center;
    const angle = Math.max(-10, Math.min(10, offset * 2.15));
    const collapsedOffset = hasDiscardControls
      ? (index - (count - 1)) * collapsedStep
      : offset * collapsedStep;

    wrap.style.setProperty(
      "--mobile-expanded-x",
      `${offset * expandedStep}px`,
    );
    wrap.style.setProperty(
      "--mobile-collapsed-x",
      `${collapsedOffset}px`,
    );
    wrap.style.setProperty("--mobile-hand-angle", `${angle}deg`);
    wrap.style.setProperty("--mobile-hand-index", String(index + 1));
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

    // 중요: pointerdown 순간에는 절대 grabbing 클래스를 붙이지 않는다.
    // 탭/가로 스크롤이 실제 카드 드래그처럼 한 프레임 깜빡이는 원인이었다.
    handGesture = {
      board,
      hand,
      cardWrap,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      cardCount,
    };
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

  if (
    !handGesture.moved &&
    Math.hypot(
      event.clientX - handGesture.startX,
      event.clientY - handGesture.startY,
    ) > 10
  ) {
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

function refreshMobileBattleLayout() {
  syncMobileBattleViewport();
  requestAnimationFrame(refreshHands);
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

  const observer = new MutationObserver((mutations) => {
    if (!isMobileBattle()) return;

    if (mutations.some((mutation) => mutation.type === "childList")) {
      requestAnimationFrame(refreshHands);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  requestAnimationFrame(refreshHands);
  window.setTimeout(refreshHands, 60);
  window.setTimeout(refreshHands, 180);

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
