const REGION_NAMES = ["관동지방", "성도지방", "호연지방", "신오지방", "하나지방"];

let lastActiveIndex = 0;
let currentContainer = null;
let cleanupCurrent = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function enhanceRegionCarousel(container) {
  if (!container || container.dataset.coverflowReady === "true") return;

  const cards = Array.from(container.querySelectorAll(":scope > .region-card"));
  if (cards.length < 2) return;

  container.dataset.coverflowReady = "true";
  container.classList.add("region-coverflow");

  let activeIndex = clamp(lastActiveIndex, 0, cards.length - 1);
  let visualIndex = activeIndex;
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startIndex = activeIndex;
  let lastX = 0;
  let suppressClickUntil = 0;

  const dots = document.createElement("div");
  dots.className = "region-coverflow-dots";

  const dotButtons = cards.map((card, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `${REGION_NAMES[index] || index + 1} 보기`);
    dot.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activeIndex = index;
      lastActiveIndex = index;
      visualIndex = index;
      render();
    });
    dots.appendChild(dot);
    return dot;
  });

  const hint = document.createElement("div");
  hint.className = "region-coverflow-hint";
  hint.textContent = "드래그해서 지방을 넘겨보세요";

  container.appendChild(hint);
  container.appendChild(dots);

  function render(position = visualIndex) {
    const spacing = clamp(container.clientWidth * 0.215, 145, 235);

    cards.forEach((card, index) => {
      const offset = index - position;
      const abs = Math.abs(offset);
      const x = offset * spacing;
      const y = Math.min(abs, 1.8) * 20;
      const z = -Math.min(abs, 2.4) * 42;
      const scale = Math.max(0.76, 1 - abs * 0.115);
      const opacity = abs >= 2 ? 0 : Math.max(0.32, 1 - abs * 0.23);
      const brightness = Math.max(0.52, 1 - abs * 0.25);
      const saturation = Math.max(0.55, 1 - abs * 0.15);
      const zIndex = 100 - Math.round(abs * 20);
      const isActive = index === Math.round(position) && abs < 0.5;
      const isHidden = abs >= 2;

      card.style.setProperty("--cf-x", `${x}px`);
      card.style.setProperty("--cf-y", `${y}px`);
      card.style.setProperty("--cf-z", `${z}px`);
      card.style.setProperty("--cf-scale", scale.toFixed(3));
      card.style.setProperty("--cf-opacity", opacity.toFixed(3));
      card.style.setProperty("--cf-brightness", brightness.toFixed(3));
      card.style.setProperty("--cf-saturation", saturation.toFixed(3));
      card.style.setProperty("--cf-z-index", String(zIndex));
      card.style.pointerEvents = isHidden ? "none" : "";
      card.classList.toggle("cf-active", isActive);
      card.setAttribute("aria-current", isActive ? "true" : "false");
      card.setAttribute("aria-hidden", isHidden ? "true" : "false");
    });

    dotButtons.forEach((dot, index) => {
      dot.classList.toggle("active", index === Math.round(position));
    });
  }

  function snapTo(index) {
    activeIndex = clamp(index, 0, cards.length - 1);
    lastActiveIndex = activeIndex;
    visualIndex = activeIndex;
    dragging = false;
    container.classList.remove("is-dragging");
    render();
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest(".region-coverflow-dots")) return;

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    startIndex = activeIndex;
    dragging = false;
  }

  function onPointerMove(event) {
    if (pointerId === null || event.pointerId !== pointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!dragging) {
      if (Math.abs(dx) < 7) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.15) return;

      dragging = true;
      container.classList.add("is-dragging");

      try {
        container.setPointerCapture(pointerId);
      } catch {
        // pointer capture 미지원 환경에서도 드래그 유지
      }
    }

    event.preventDefault();
    lastX = event.clientX;

    const dragDistance = clamp(container.clientWidth * 0.2, 120, 210);
    visualIndex = clamp(startIndex - dx / dragDistance, 0, cards.length - 1);
    render(visualIndex);
  }

  function finishPointer(event) {
    if (
      pointerId === null ||
      (event?.pointerId != null && event.pointerId !== pointerId)
    ) return;

    const wasDragging = dragging;
    const dx = (event?.clientX ?? lastX) - startX;

    if (wasDragging) {
      const threshold = clamp(container.clientWidth * 0.075, 42, 78);
      let next = Math.round(visualIndex);

      if (next === startIndex && Math.abs(dx) > threshold) {
        next = startIndex + (dx < 0 ? 1 : -1);
      }

      suppressClickUntil = Date.now() + 260;
      snapTo(next);
    } else {
      container.classList.remove("is-dragging");
      render(activeIndex);
    }

    if (pointerId !== null) {
      try {
        if (container.hasPointerCapture?.(pointerId)) {
          container.releasePointerCapture(pointerId);
        }
      } catch {
        // 무시
      }
    }

    pointerId = null;
    dragging = false;
  }

  function onClickCapture(event) {
    const card = event.target.closest(".region-card");
    if (!card || !container.contains(card)) return;

    const index = cards.indexOf(card);
    if (index === -1) return;

    if (Date.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (index !== activeIndex) {
      event.preventDefault();
      event.stopPropagation();
      snapTo(index);
      return;
    }

    lastActiveIndex = index;
  }

  function onKeyDown(event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      snapTo(activeIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      snapTo(activeIndex + 1);
    }
  }

  function onResize() {
    visualIndex = activeIndex;
    render();
  }

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove, { passive: false });
  container.addEventListener("pointerup", finishPointer);
  container.addEventListener("pointercancel", finishPointer);
  container.addEventListener("click", onClickCapture, true);
  container.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);

  render();

  cleanupCurrent = () => {
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerup", finishPointer);
    container.removeEventListener("pointercancel", finishPointer);
    container.removeEventListener("click", onClickCapture, true);
    container.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onResize);
  };
}

function syncRegionCarousel() {
  const container = document.querySelector(".main-menu .region-select");

  if (container === currentContainer) return;

  cleanupCurrent?.();
  cleanupCurrent = null;
  currentContainer = container;

  if (container) enhanceRegionCarousel(container);
}

function startRegionCarousel() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startRegionCarousel, { once: true });
    return;
  }

  syncRegionCarousel();

  const observer = new MutationObserver(syncRegionCarousel);
  observer.observe(document.body, { childList: true, subtree: true });
}

startRegionCarousel();
