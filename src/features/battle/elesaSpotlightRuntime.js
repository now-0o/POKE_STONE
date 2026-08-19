import "./elesa-spotlight-fx.css";

let activeTrainerId = null;
let lastTurn = null;
let fxToken = 0;

function readState() {
  return window.__pokeUnovaGymState || {};
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

function playSelectionFx(state, attempt = 0, token = fxToken) {
  if (token !== fxToken) return;

  const board = document.querySelector(".battle.battle-board");
  if (!board) {
    if (attempt < 12) window.setTimeout(() => playSelectionFx(state, attempt + 1, token), 45);
    return;
  }

  const units = fieldUnitElements(state.turn);
  const targetUid = targetUidForTurn(state, units);
  const target = units.find((unit) => unit.dataset.uid === targetUid);

  if (!target) {
    if (attempt < 12) window.setTimeout(() => playSelectionFx(state, attempt + 1, token), 45);
    return;
  }

  board.querySelector(":scope > .unova-spotlight-search-fx")?.remove();
  document.querySelectorAll(".field-unit.unova-spotlight-lock-pop").forEach((unit) => {
    unit.classList.remove("unova-spotlight-lock-pop");
  });

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
    return;
  }

  const otherUnitPoints = units
    .filter((unit) => unit !== target)
    .map((unit) => centerInBoard(unit, boardRect));

  const pickPoint = () => {
    if (otherUnitPoints.length && Math.random() < 0.76) {
      return otherUnitPoints[Math.floor(Math.random() * otherUnitPoints.length)];
    }
    return randomPoint(boardRect);
  };

  const p0 = randomPoint(boardRect);
  const p1 = pickPoint();
  const p2 = pickPoint();

  light.style.left = `${p0.x}px`;
  light.style.top = `${p0.y}px`;

  // 전체 길이는 AI 첫 행동(1.1초) 전에 끝내되,
  // 훑는 지점을 줄이고 각 위치에 짧게 머물러 더 느리고 묵직하게 보이게 한다.
  light.animate(
    [
      { left: `${p0.x}px`, top: `${p0.y}px`, transform: "translate(-50%, -50%) scale(.90)", offset: 0 },
      { left: `${p1.x}px`, top: `${p1.y}px`, transform: "translate(-50%, -50%) scale(1.02)", offset: .27 },
      { left: `${p1.x}px`, top: `${p1.y}px`, transform: "translate(-50%, -50%) scale(1.00)", offset: .37 },
      { left: `${p2.x}px`, top: `${p2.y}px`, transform: "translate(-50%, -50%) scale(.97)", offset: .61 },
      { left: `${p2.x}px`, top: `${p2.y}px`, transform: "translate(-50%, -50%) scale(1.01)", offset: .70 },
      { left: `${targetPoint.x}px`, top: `${targetPoint.y}px`, transform: "translate(-50%, -50%) scale(1.12)", offset: .89 },
      { left: `${targetPoint.x}px`, top: `${targetPoint.y}px`, transform: "translate(-50%, -50%) scale(1)", offset: 1 },
    ],
    {
      duration: 1080,
      easing: "cubic-bezier(.26,.62,.18,1)",
      fill: "forwards",
    },
  );

  window.setTimeout(() => {
    if (token !== fxToken) return;
    target.classList.add("unova-spotlight-lock-pop");
  }, 950);

  window.setTimeout(() => {
    if (token !== fxToken) return;
    fx.classList.add("is-locking");
  }, 970);

  window.setTimeout(() => {
    if (token !== fxToken) return;
    fx.remove();
    target.classList.remove("unova-spotlight-lock-pop");
    syncCurrentSpotlightClass(state);
  }, 1090);
}

function syncElesaSpotlight(state = readState()) {
  if (state.trainerId !== activeTrainerId) {
    activeTrainerId = state.trainerId || null;
    lastTurn = null;
    fxToken += 1;
  }

  if (state.gimmick !== "elesa_spotlight") {
    lastTurn = state.turn || null;
    return;
  }

  // 상태 이벤트가 여러 번 와도 현재 턴 대상 하나만 후광을 남긴다.
  scheduleStaticSelectionSync(state);

  // 같은 턴 안에서 카드 사용/공격 때문에 상태 이벤트가 여러 번 와도
  // 탐색 연출은 턴 시작에 딱 한 번만 재생한다.
  if (state.turn === lastTurn) return;

  lastTurn = state.turn;
  fxToken += 1;
  const token = fxToken;

  // 게임 상태 이벤트가 React DOM 반영보다 먼저 올 수 있어 소량 지연한다.
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
