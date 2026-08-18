// ============================================================
// 지방 선택 모바일 캐러셀 (모바일 터치 최적화)
// - 데스크톱: 기존 카드 그리드 그대로
// - 모바일: 한 장씩 스냅 + 터치 스와이프
// - transform 기반 이동이라 레이아웃 리플로우 최소화
// ============================================================

const REGION_NAMES = ["관동지방", "성도지방", "호연지방", "신오지방", "하나지방"];

let activeIndex = 0;
let dots = [];
let boundContainer = null;
let scrollRaf = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStartScrollLeft = 0;
let touchDragging = false;
let touchMoved = false;

function isMobileCarousel() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function getRegionContainer() {
  return document.querySelector(".main-menu .region-select");
}

function getRegionCards(container) {
  return container ? Array.from(container.querySelectorAll(":scope > .region-card")) : [];
}

function getCardCenter(container, card) {
  return card.offsetLeft + card.offsetWidth / 2 - container.clientWidth / 2;
}

function clampIndex(index, count) {
  return Math.max(0, Math.min(count - 1, index));
}

function setActiveIndex(index, count) {
  activeIndex = clampIndex(index, count);
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === activeIndex);
    dot.setAttribute("aria-current", i === activeIndex ? "true" : "false");
  });
}

function nearestCardIndex(container, cards) {
  if (!cards.length) return 0;
  const center = container.scrollLeft + container.clientWidth / 2;
  let bestIndex = 0;
  let bestDistance = Infinity;

  cards.forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const distance = Math.abs(cardCenter - center);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function scrollToCard(container, cards, index, behavior = "smooth") {
  if (!container || !cards.length) return;
  const safeIndex = clampIndex(index, cards.length);
  const target = Math.max(0, getCardCenter(container, cards[safeIndex]));

  container.scrollTo({
    left: target,
    behavior,
  });
  setActiveIndex(safeIndex, cards.length);
}

function clearIndicators() {
  const old = document.querySelector(".region-carousel-indicators");
  old?.remove();
  dots = [];
}

function makeIndicators(container, cards) {
  clearIndicators();
  if (!isMobileCarousel() || cards.length <= 1) return;

  const wrap = document.createElement("div");
  wrap.className = "region-carousel-indicators";
  wrap.setAttribute("aria-label", "지방 선택 페이지");

  dots = cards.map((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "region-carousel-dot";
    button.setAttribute(
      "aria-label",
      `${REGION_NAMES[index] || `${index + 1}번째 지방`} 보기`,
    );
    button.addEventListener("click", () => scrollToCard(container, cards, index));
    wrap.appendChild(button);
    return button;
  });

  container.insertAdjacentElement("afterend", wrap);
  setActiveIndex(nearestCardIndex(container, cards), cards.length);
}

function onScroll() {
  if (!boundContainer || !isMobileCarousel()) return;
  if (scrollRaf) cancelAnimationFrame(scrollRaf);

  scrollRaf = requestAnimationFrame(() => {
    const cards = getRegionCards(boundContainer);
    if (cards.length) setActiveIndex(nearestCardIndex(boundContainer, cards), cards.length);
  });
}

function onTouchStart(event) {
  if (!boundContainer || !isMobileCarousel()) return;
  const touch = event.touches?.[0];
  if (!touch) return;

  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartScrollLeft = boundContainer.scrollLeft;
  touchDragging = false;
  touchMoved = false;
}

function onTouchMove(event) {
  if (!boundContainer || !isMobileCarousel()) return;
  const touch = event.touches?.[0];
  if (!touch) return;

  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (!touchDragging) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    touchDragging = true;
  }

  if (event.cancelable) event.preventDefault();
  touchMoved = true;
  boundContainer.scrollLeft = touchStartScrollLeft - dx;
}

function onTouchEnd(event) {
  if (!boundContainer || !isMobileCarousel()) return;
  const cards = getRegionCards(boundContainer);
  if (!cards.length) return;

  const changedTouch = event.changedTouches?.[0];
  const endX = changedTouch?.clientX ?? touchStartX;
  const deltaX = endX - touchStartX;

  let targetIndex = nearestCardIndex(boundContainer, cards);
  if (touchMoved && Math.abs(deltaX) > 42) {
    targetIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
  }

  scrollToCard(boundContainer, cards, targetIndex);
  touchDragging = false;
  touchMoved = false;
}

function unbindContainer() {
  if (!boundContainer) return;
  boundContainer.removeEventListener("scroll", onScroll);
  boundContainer.removeEventListener("touchstart", onTouchStart);
  boundContainer.removeEventListener("touchmove", onTouchMove);
  boundContainer.removeEventListener("touchend", onTouchEnd);
  boundContainer.removeEventListener("touchcancel", onTouchEnd);
  boundContainer = null;
}

function bindContainer(container) {
  if (boundContainer === container) {
    const cards = getRegionCards(container);
    if (dots.length !== cards.length) makeIndicators(container, cards);
    return;
  }

  unbindContainer();
  boundContainer = container;
  const cards = getRegionCards(container);
  if (!cards.length) return;

  container.addEventListener("scroll", onScroll, { passive: true });
  container.addEventListener("touchstart", onTouchStart, { passive: true });
  container.addEventListener("touchmove", onTouchMove, { passive: false });
  container.addEventListener("touchend", onTouchEnd, { passive: true });
  container.addEventListener("touchcancel", onTouchEnd, { passive: true });
  makeIndicators(container, cards);

  if (isMobileCarousel()) {
    requestAnimationFrame(() => scrollToCard(container, cards, activeIndex, "auto"));
  }
}

function syncRegionCarousel() {
  const container = getRegionContainer();
  if (!container) {
    unbindContainer();
    clearIndicators();
    return;
  }

  bindContainer(container);
}

let syncQueued = false;
function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => {
    syncQueued = false;
    syncRegionCarousel();
  });
}

function start() {
  syncRegionCarousel();

  const observer = new MutationObserver(queueSync);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("resize", queueSync, { passive: true });
  window.addEventListener("orientationchange", queueSync, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
