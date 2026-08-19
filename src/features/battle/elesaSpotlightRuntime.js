import "./elesa-spotlight-fx.css";

let activeTrainerId = null;
let lastTurn = null;
let fxToken = 0;

function readState() {
  return window.__pokeUnovaGymState || {};
}

function setSpotlightBusy(busy) {
  window.__pokeElesaSpotlightBusy = busy === true;
}

function clearSpotlightClasses() {
  document
    .querySelectorAll(
      ".battle.battle-board .field-unit.unova-spotlight, .battle.battle-board .field-unit.unova-spotlight-lock-pop",
    )
    .forEach((unit) => {
      unit.classList.remove("unova-spotlight", "unova-spotlight-lock-pop");
    });
}

function hasForegroundOverlay() {
  const explicit = document.querySelector(
    ".inspect-overlay, [role=\"dialog\"], .modal-overlay, .confirm-overlay",
  );

  if (explicit && !explicit.closest(".unova-spotlight-search-fx")) {
    return true;
  }

  // 이름이 제각각인 도움말/기믹 설명 오버레이도 잡는다.
  // 화면을 크게 덮는 고정 overlay/modal 계열만 확인해 일반 HUD는 제외한다.
  const candidates = document.querySelectorAll(
    '[class*="overlay"], [class*="modal"], [class*="dialog"]',
  );

  for (const element of candidates) {
    if (
      element.classList.contains("unova-spotlight-search-fx") ||
      element.closest(".unova-spotlight-search-fx")
    ) {
      continue;
    }

    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") <= 0
    ) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const coversMeaningfulArea =
      rect.width >= window.innerWidth * 0.28 &&
      rect.height >= window.innerHeight * 0.18;

    if (coversMeaningfulArea) return true;
  }

  return false;
}

function fieldUnitElements(side) {
  const zone = side === "player" ? "unit-player" : "unit-enemy";
  return [...document.querySelectorAll(
    `.battle.battle-board .field-unit[data-drop="${zone}"][data-uid]`,
  )];
}

function targetUidForTurn(state, units) {
  const spotlight = new Set(state.spotlightUids || []);
  return units.find((unit) => spotlight.has(unit.dataset.uid))?.dataset.uid || null;
}

function syncCurrentSpotlightClass(state) {
  if (state.gimmick !== "elesa_spotlight") return;

  const currentUnits = fieldUnitElements(state.turn);
  const targetUid = targetUidForTurn(state, currentUnits);

  document
    .querySelectorAll(".battle.battle-board .field-unit[data-uid]")
    .forEach((unit) => {
      unit.classList.toggle(
        "unova-spotlight",
        !!targetUid && unit.dataset.uid === targetUid,
      );
    });
}

function scheduleStaticSelectionSync(state) {
  syncCurrentSpotlightClass(state);
  window.requestAnimationFrame(() => {
    syncCurrentSpotlightClass(state);
    window.requestAnimationFrame(() => syncCurrentSpotlightClass(state));
  });
}

function randomPoint(boardRect) {
  const padX = Math.max(70, boardRect.width * 0.12);
  const padY = Math.max(60, boardRect.height * 0.16);
  return {
    x: padX + Math.random() * Math.max(1, boardRect.width - padX * 2),
    y: padY + Math.random() * Math.max(1, boardRect.height - padY * 2),
  };
}

function centerInBoard(element, boardRect) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left - boardRect.left + rect.width / 2,
    y: rect.top - boardRect.top + rect.height / 2,
  };
}

function finishWithoutFx(state, token) {
  if (token !== fxToken) return;
  setSpotlightBusy(false);
  scheduleStaticSelectionSync(state);
}

function playSelectionFx(state, attempt = 0, token = fxToken) {
  if (token !== fxToken) return;

  // 카드 확대/기믹 설명 등 사용자가 읽고 있는 UI가 있으면
  // 스포트라이트와 AI를 모두 기다리게 한다.
  if (hasForegroundOverlay()) {
    setSpotlightBusy(true);
    window.setTimeout(() => playSelectionFx(state, attempt, token), 120);
    return;
  }

  const board = document.querySelector(".battle.battle-board");
  if (!board) {
    if (attempt < 12) {
      window.setTimeout(() => playSelectionFx(state, attempt + 1, token), 45);
    } else {
      finishWithoutFx(state, token);
    }
    return;
  }

  const units = fieldUnitElements(state.turn);
  const targetUid = targetUidForTurn(state, units);
  const target = units.find((unit) => unit.dataset.uid === targetUid);

  if (!target) {
    if (attempt < 12) {
      window.setTimeout(() => playSelectionFx(state, attempt + 1, token), 45);
    } else {
      finishWithoutFx(state, token);
    }
    return;
  }

  setSpotlightBusy(true);
  clearSpotlightClasses();

  board.querySelector(":scope > .unova-spotlight-search-fx")?.remove();

  const boardRect = board.getBoundingClientRect();
  const targetPoint = centerInBoard(target, boardRect);

  const fx = document.createElement("div");
  fx.className = "unova-spotlight-search-fx";
  fx.setAttribute("aria-hidden", "true");
  fx.innerHTML = `
    <div class="unova-spotlight-search-light">
      <div class="unova-spotlight-search-cone"></div>
      <div class="unova-spotlight-search-ring"></div>
    </div>
    <div class="unova-spotlight-search-title">SPOTLIGHT</div>
  `;
  board.appendChild(fx);

  const light = fx.querySelector(".unova-spotlight-search-light");
  if (!light) {
    fx.remove();
    finishWithoutFx(state, token);
    return;
  }

  const otherUnitPoints = units
    .filter((unit) => unit !== target)
    .map((unit) => centerInBoard(unit, boardRect));

  const pickPoint = () => {
    if (otherUnitPoints.length && Math.random() < 0.8) {
      return otherUnitPoints[Math.floor(Math.random() * otherUnitPoints.length)];
    }
    return randomPoint(boardRect);
  };

  const p0 = randomPoint(boardRect);
  const p1 = pickPoint();
  const p2 = pickPoint();

  light.style.left = `${p0.x}px`;
  light.style.top = `${p0.y}px`;

  light.animate(
    [
      { left: `${p0.x}px`, top: `${p0.y}px`, transform: "translate(-50%, -50%) scale(.90)", offset: 0 },
      { left: `${p1.x}px`, top: `${p1.y}px`, transform: "translate(-50%, -50%) scale(1.02)", offset: .24 },
      { left: `${p1.x}px`, top: `${p1.y}px`, transform: "translate(-50%, -50%) scale(1.00)", offset: .39 },
      { left: `${p2.x}px`, top: `${p2.y}px`, transform: "translate(-50%, -50%) scale(.98)", offset: .61 },
      { left: `${p2.x}px`, top: `${p2.y}px`, transform: "translate(-50%, -50%) scale(1.01)", offset: .76 },
      { left: `${targetPoint.x}px`, top: `${targetPoint.y}px`, transform: "translate(-50%, -50%) scale(1.10)", offset: .91 },
      { left: `${targetPoint.x}px`, top: `${targetPoint.y}px`, transform: "translate(-50%, -50%) scale(1.10)", offset: .97 },
      { left: `${targetPoint.x}px`, top: `${targetPoint.y}px`, transform: "translate(-50%, -50%) scale(1)", offset: 1 },
    ],
    {
      duration: 1850,
      easing: "cubic-bezier(.34,.48,.18,1)",
      fill: "forwards",
    },
  );

  window.setTimeout(() => {
    if (token !== fxToken) return;
    target.classList.add("unova-spotlight-lock-pop");
  }, 1660);

  window.setTimeout(() => {
    if (token !== fxToken) return;
    fx.classList.add("is-locking");
  }, 1690);

  window.setTimeout(() => {
    if (token !== fxToken) return;
    fx.remove();
    target.classList.remove("unova-spotlight-lock-pop");
    syncCurrentSpotlightClass(state);
    setSpotlightBusy(false);
  }, 1900);
}

function syncElesaSpotlight(state = readState()) {
  if (state.trainerId !== activeTrainerId) {
    activeTrainerId = state.trainerId || null;
    lastTurn = null;
    fxToken += 1;
    clearSpotlightClasses();
  }

  if (state.gimmick !== "elesa_spotlight") {
    lastTurn = state.turn || null;
    setSpotlightBusy(false);
    clearSpotlightClasses();
    return;
  }

  // 같은 턴의 후속 상태 갱신에서는 연출이 끝난 뒤에만 최종 후광을 유지한다.
  if (state.turn === lastTurn) {
    if (!window.__pokeElesaSpotlightBusy) {
      scheduleStaticSelectionSync(state);
    }
    return;
  }

  lastTurn = state.turn;
  fxToken += 1;
  const token = fxToken;

  // 턴이 바뀐 순간부터 AI를 먼저 잠근다.
  setSpotlightBusy(true);
  clearSpotlightClasses();

  window.requestAnimationFrame(() => {
    window.setTimeout(() => playSelectionFx(state, 0, token), 10);
  });
}

function startElesaSpotlightRuntime() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startElesaSpotlightRuntime, { once: true });
    return;
  }

  syncElesaSpotlight();
  window.addEventListener("unova-gym-state-change", (event) => {
    syncElesaSpotlight(event.detail || readState());
  });
}

startElesaSpotlightRuntime();
