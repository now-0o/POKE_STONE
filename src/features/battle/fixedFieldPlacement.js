const SLOT_COUNT = 6;
const DROP_MARKER_TTL_MS = 1200;

const FIXED_BATTLEFIELDS = {
  snowpoint_snowfield: "whiteout",
  pastoria_gym: "rising_tide",
};

function activeFixedField() {
  const battle = document.querySelector(".battle.battle-board[data-battlefield]");
  const battlefield = battle?.dataset.battlefield || "";
  const gimmick = FIXED_BATTLEFIELDS[battlefield];
  const field = gimmick ? battle?.querySelector(".my-field") : null;

  if (!battle || !field || !gimmick) return null;
  return { battle, field, battlefield, gimmick };
}

function fieldContentRect(field) {
  const rect = field.getBoundingClientRect();
  const style = window.getComputedStyle(field);
  const leftPad = Number.parseFloat(style.paddingLeft) || 0;
  const rightPad = Number.parseFloat(style.paddingRight) || 0;
  const topPad = Number.parseFloat(style.paddingTop) || 0;
  const bottomPad = Number.parseFloat(style.paddingBottom) || 0;

  return {
    left: rect.left + leftPad,
    right: rect.right - rightPad,
    top: rect.top + topPad,
    bottom: rect.bottom - bottomPad,
    width: Math.max(0, rect.width - leftPad - rightPad),
  };
}

function slotAtPointer(field, clientX, clientY) {
  const rect = fieldContentRect(field);
  if (
    rect.width <= 0 ||
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null;
  }

  const relativeX = Math.min(rect.width - 0.001, Math.max(0, clientX - rect.left));
  const slot = Math.floor((relativeX / rect.width) * SLOT_COUNT);
  return Math.max(0, Math.min(SLOT_COUNT - 1, slot));
}

function clearDropTargetClasses() {
  document
    .querySelectorAll(
      ".candice-slot-zone.is-drop-target, .wake-field-slot.is-drop-target",
    )
    .forEach((element) => element.classList.remove("is-drop-target"));
}

function showDropTarget(gimmick, slot) {
  clearDropTargetClasses();
  if (!Number.isInteger(slot)) return;

  const selector =
    gimmick === "whiteout"
      ? ".candice-slot-zone"
      : gimmick === "rising_tide"
        ? ".wake-field-slot"
        : null;
  if (!selector) return;

  const zones = document.querySelectorAll(selector);
  zones[slot]?.classList.add("is-drop-target");
}

function isDraggingBattleCard() {
  return Boolean(document.querySelector(".battle.battle-board .drag-ghost"));
}

function onPointerMove(event) {
  if (!isDraggingBattleCard()) {
    clearDropTargetClasses();
    return;
  }

  const fixed = activeFixedField();
  if (!fixed) {
    clearDropTargetClasses();
    return;
  }

  const slot = slotAtPointer(fixed.field, event.clientX, event.clientY);
  showDropTarget(fixed.gimmick, slot);
}

function onPointerUpCapture(event) {
  const dragging = isDraggingBattleCard();
  const fixed = dragging ? activeFixedField() : null;
  const slot = fixed
    ? slotAtPointer(fixed.field, event.clientX, event.clientY)
    : null;

  clearDropTargetClasses();

  if (!fixed || !Number.isInteger(slot)) {
    delete window.__pokeFixedFieldPreferredDrop;
    return;
  }

  const marker = {
    gimmick: fixed.gimmick,
    slot,
    at: Date.now(),
  };
  window.__pokeFixedFieldPreferredDrop = marker;

  // Battle의 window pointerup 핸들러가 같은 이벤트에서 playCard를 호출한 뒤
  // 사용되지 않은 마커만 제거한다.
  window.setTimeout(() => {
    if (
      window.__pokeFixedFieldPreferredDrop === marker &&
      Date.now() - marker.at < DROP_MARKER_TTL_MS
    ) {
      delete window.__pokeFixedFieldPreferredDrop;
    }
  }, 0);
}

if (typeof window !== "undefined") {
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUpCapture, true);
  window.addEventListener("pointercancel", clearDropTargetClasses, true);
}
