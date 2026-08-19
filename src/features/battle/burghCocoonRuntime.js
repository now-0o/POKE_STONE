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
  if (!unit) return;
  const label = unit.querySelector(":scope > .unova-cocoon-overlay span");
  if (!label) return;
  label.textContent = `고치 · ${Math.max(1, turns)}턴 후`;
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
    if (!remainingTurns.has(uid)) remainingTurns.set(uid, 2);
  }

  if (enteredEnemyTurn) {
    for (const uid of activeCocoons) {
      const before = remainingTurns.get(uid) ?? 2;
      const after = Math.max(0, before - 1);
      remainingTurns.set(uid, after);

      if (!currentCocoons.has(uid) && after === 0) {
        playHatch(uid);
      }
    }
  }

  for (const uid of currentCocoons) {
    updateCocoonLabel(uid, remainingTurns.get(uid) ?? 2);
  }

  for (const uid of [...remainingTurns.keys()]) {
    if (!currentCocoons.has(uid)) {
      const hatchedNow = enteredEnemyTurn && remainingTurns.get(uid) === 0;
      if (!hatchedNow) remainingTurns.delete(uid);
    }
  }

  activeCocoons = currentCocoons;
  lastTurn = state.turn || lastTurn;

  window.requestAnimationFrame(() => {
    for (const uid of currentCocoons) {
      updateCocoonLabel(uid, remainingTurns.get(uid) ?? 2);
    }
  });
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

  const observer = new MutationObserver(() => {
    if (readState().gimmick !== "burgh_cocoon") return;
    for (const uid of activeCocoons) {
      updateCocoonLabel(uid, remainingTurns.get(uid) ?? 2);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

startBurghCocoonRuntime();
