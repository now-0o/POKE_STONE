function syncEndTurnLabel() {
  const button = document.querySelector(".battle.battle-board .btn-endturn");
  if (!button) return;

  const turn = document.body.dataset.battleTurn;
  const label =
    turn === "player" ? "턴 종료" : turn === "enemy" ? "상대 턴..." : null;

  if (label && button.textContent !== label) {
    button.textContent = label;
  }
}

function syncBattlePageState() {
  const battleSurface = document.querySelector(
    ".battle-intro, .battle.battle-board",
  );

  const locked = Boolean(battleSurface);

  document.documentElement.classList.toggle("battle-page-locked", locked);
  document.body.classList.toggle("battle-page-locked", locked);

  syncEndTurnLabel();
}

function startBattleRuntime() {
  syncBattlePageState();

  window.addEventListener("battle-turn-change", syncEndTurnLabel);

  const observer = new MutationObserver(syncBattlePageState);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

if (document.body) {
  startBattleRuntime();
} else {
  window.addEventListener("DOMContentLoaded", startBattleRuntime, { once: true });
}
