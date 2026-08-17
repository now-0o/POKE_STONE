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

function fixedSlotMap(gimmick) {
  if (gimmick === "whiteout") return window.__pokeCandiceSlots || {};
  if (gimmick === "rising_tide") return window.__pokeWakeSlots || {};
  return {};
}

function floodedWakeSlots() {
  return new Set(
    Array.isArray(window.__pokeWakeFloodSlots)
      ? window.__pokeWakeFloodSlots.map(Number)
      : [],
  );
}

function syncFixedFieldUnitPositions() {
  const fixed = activeFixedField();

  if (!fixed) {
    document
      .querySelectorAll(".field-unit[data-fixed-field-slot]")
      .forEach((element) => {
        delete element.dataset.fixedFieldSlot;
        delete element.dataset.candiceSlot;
        delete element.dataset.wakeSlot;
        element.style.removeProperty("grid-column");
        element.style.removeProperty("grid-row");
      });
    return;
  }

  const { field, gimmick } = fixed;
  const slotMap = fixedSlotMap(gimmick);

  // 필드 자체도 이 런타임에서 고정 그리드 상태를 보장한다.
  if (gimmick === "whiteout") {
    field.dataset.candiceFixedField = "1";
    delete field.dataset.wakeFixedField;
  } else {
    field.dataset.wakeFixedField = "1";
    delete field.dataset.candiceFixedField;
  }

  field.querySelectorAll(".field-unit[data-uid]").forEach((element) => {
    const slot = Number(slotMap[element.dataset.uid]);

    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) {
      delete element.dataset.fixedFieldSlot;
      element.style.removeProperty("grid-column");
      element.style.removeProperty("grid-row");
      return;
    }

    element.dataset.fixedFieldSlot = String(slot);
    element.style.setProperty("grid-column", String(slot + 1));
    element.style.setProperty("grid-row", "1");

    if (gimmick === "whiteout") {
      element.dataset.candiceSlot = String(slot);
      delete element.dataset.wakeSlot;
    } else {
      element.dataset.wakeSlot = String(slot);
      delete element.dataset.candiceSlot;
    }
  });
}

function clearDropTargetClasses() {
  document
    .querySelectorAll(
      ".candice-slot-zone.is-drop-target, .wake-field-slot.is-drop-target",
    )
    .forEach((element) => {
      element.classList.remove("is-drop-target");
      element.classList.remove("is-drop-blocked");
    });
}

function isBlockedSlot(gimmick, slot) {
  if (!Number.isInteger(slot)) return false;

  const occupied = Object.values(fixedSlotMap(gimmick)).some(
    (value) => Number(value) === slot,
  );

  if (gimmick === "whiteout") return occupied;
  if (gimmick === "rising_tide") {
    return occupied || floodedWakeSlots().has(slot);
  }

  return false;
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
  const target = zones[slot];
  if (!target) return;

  target.classList.add("is-drop-target");
  if (isBlockedSlot(gimmick, slot)) {
    target.classList.add("is-drop-blocked");
  }
}

function isDraggingBattleCard() {
  return Boolean(document.querySelector(".battle.battle-board .drag-ghost"));
}

function onPointerMove(event) {
  syncFixedFieldUnitPositions();

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

  // 공통 래퍼와 각 기믹 엔진 양쪽에 같은 슬롯을 넘긴다.
  // 실제 카드 사용은 이 pointerup 이벤트 안에서 동기적으로 처리된다.
  window.__pokeFixedFieldPreferredDrop = marker;
  if (fixed.gimmick === "whiteout") {
    window.__pokeCandicePreferredSlot = { slot, at: marker.at };
  } else if (fixed.gimmick === "rising_tide") {
    window.__pokeWakePreferredSlot = { slot, at: marker.at };
  }

  window.setTimeout(() => {
    if (
      window.__pokeFixedFieldPreferredDrop === marker &&
      Date.now() - marker.at < DROP_MARKER_TTL_MS
    ) {
      delete window.__pokeFixedFieldPreferredDrop;
    }

    syncFixedFieldUnitPositions();
  }, 0);
}

function scheduleFixedFieldSync() {
  window.requestAnimationFrame(syncFixedFieldUnitPositions);
}

if (typeof window !== "undefined") {
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUpCapture, true);
  window.addEventListener("pointercancel", clearDropTargetClasses, true);
  window.addEventListener("candice-whiteout-change", scheduleFixedFieldSync);
  window.addEventListener("wake-flood-change", scheduleFixedFieldSync);
  window.addEventListener("battle-turn-change", scheduleFixedFieldSync);
  window.addEventListener("resize", scheduleFixedFieldSync);

  const observer = new MutationObserver(scheduleFixedFieldSync);
  observer.observe(document.body, { childList: true, subtree: true });

  scheduleFixedFieldSync();
}
