import "./burgh-cocoon-fx.css";

const remainingTurns = new Map();
let activeCocoons = new Set();
let lastTurn = null;
let activeTrainerId = null;

function readState() {
  return window.__pokeUnovaGymState || {};
}

function unitElement(uid) {
  return document.querySelector(
    `.battle.battle-board .field-unit[data-uid="${uid}"]`,
  );
}

function updateCocoonLabel(uid, turns) {
  const unit = unitElement(uid);
  if (!unit) return false;

  const label = unit.querySelector(":scope > .unova-cocoon-overlay span");
  if (!label) return false;

  const nextText = `고치 · ${Math.max(1, turns)}턴 후`;

  // 같은 문자열을 다시 쓰지 않는다.
  // textContent를 반복 갱신하면 DOM mutation이 연쇄적으로 발생할 수 있다.
  if (label.textContent !== nextText) {
    label.textContent = nextText;
  }

  return true;
}

function refreshActiveLabels() {
  for (const uid of activeCocoons) {
    updateCocoonLabel(uid, remainingTurns.get(uid) ?? 3);
  }
}

function scheduleLabelRefresh() {
  // UnovaBattleUi가 고치 overlay를 먼저 생성하므로 대부분 첫 호출에 끝난다.
  // React/DOM 반영 순서가 늦는 경우만 대비해 정해진 횟수만 재시도한다.
  refreshActiveLabels();

  window.requestAnimationFrame(() => {
    refreshActiveLabels();
    window.requestAnimationFrame(refreshActiveLabels);
  });

  window.setTimeout(refreshActiveLabels, 80);
  window.setTimeout(refreshActiveLabels, 180);
}

function playHatch(uid, attempt = 0) {
  const unit = unitElement(uid);
  if (!unit) {
    if (attempt < 8) {
      window.setTimeout(() => playHatch(uid, attempt + 1), 45);
    }
    return;
  }

  if (unit.querySelector(":scope > .unova-hatch-fx")) return;

  const fx = document.createElement("div");
  fx.className = "unova-hatch-fx";
  fx.setAttribute("aria-hidden", "true");
  fx.innerHTML = `
    <div class="unova-hatch-flash"></div>
    <div class="unova-hatch-ring ring-a"></div>
    <div class="unova-hatch-ring ring-b"></div>
    <div class="unova-hatch-shell shell-left"></div>
    <div class="unova-hatch-shell shell-right"></div>
    <span class="unova-hatch-spark spark-1"></span>
    <span class="unova-hatch-spark spark-2"></span>
    <span class="unova-hatch-spark spark-3"></span>
    <span class="unova-hatch-spark spark-4"></span>
    <strong class="unova-hatch-label">우화!</strong>
  `;

  unit.classList.remove("unova-cocooned");
  unit.classList.add("unova-hatching");
  unit.appendChild(fx);

  window.setTimeout(() => {
    fx.remove();
    unit.classList.remove("unova-hatching");
  }, 1350);
}

function resetRuntime(trainerId = null) {
  remainingTurns.clear();
  activeCocoons = new Set();
  lastTurn = null;
  activeTrainerId = trainerId;
}

function syncBurghCocoons(state = readState()) {
  if (state.trainerId !== activeTrainerId) {
    resetRuntime(state.trainerId || null);
  }

  if (state.gimmick !== "burgh_cocoon") {
    resetRuntime(state.trainerId || null);
    return;
  }

  const currentCocoons = new Set(state.cocoonUids || []);
  const enteredEnemyTurn = lastTurn === "player" && state.turn === "enemy";

  for (const uid of currentCocoons) {
    if (!remainingTurns.has(uid)) remainingTurns.set(uid, 3);
  }

  if (enteredEnemyTurn) {
    for (const uid of activeCocoons) {
      const before = remainingTurns.get(uid) ?? 3;
      const after = Math.max(0, before - 1);
      remainingTurns.set(uid, after);

      if (!currentCocoons.has(uid) && after === 0) {
        playHatch(uid);
      }
    }
  }

  for (const uid of [...remainingTurns.keys()]) {
    if (!currentCocoons.has(uid)) {
      const hatchedNow = enteredEnemyTurn && remainingTurns.get(uid) === 0;
      if (!hatchedNow) remainingTurns.delete(uid);
    }
  }

  activeCocoons = currentCocoons;
  lastTurn = state.turn || lastTurn;

  // 전역 MutationObserver를 두지 않는다.
  // 상태 이벤트 직후 정해진 횟수만 갱신해 브라우저 잠김을 방지한다.
  scheduleLabelRefresh();
}

function startBurghCocoonRuntime() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startBurghCocoonRuntime, {
      once: true,
    });
    return;
  }

  syncBurghCocoons();

  window.addEventListener("unova-gym-state-change", (event) => {
    syncBurghCocoons(event.detail || readState());
  });
}

startBurghCocoonRuntime();
