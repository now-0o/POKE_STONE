let lastDominance = null;
let cleanupTimer = null;

function removeFearFx() {
  document
    .querySelectorAll('.unova-dragon-fear-field')
    .forEach((node) => node.remove());

  const hud = document.querySelector('.unova-drayden-hud');
  hud?.classList.remove('is-fear-pulsing');

  if (cleanupTimer) {
    window.clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
}

function playFearFx(level) {
  removeFearFx();

  const board = document.querySelector('.battle.battle-board');
  const hud = document.querySelector('.unova-drayden-hud');

  if (hud) {
    // 같은 클래스가 연속으로 붙어도 CSS 애니메이션이 매번 재시작되게 한다.
    void hud.offsetWidth;
    hud.classList.add('is-fear-pulsing');
  }

  if (board) {
    const fx = document.createElement('div');
    fx.className = `unova-dragon-fear-field fear-level-${Math.max(1, Math.min(4, level))}`;
    fx.setAttribute('aria-hidden', 'true');
    board.appendChild(fx);
  }

  cleanupTimer = window.setTimeout(removeFearFx, 920);
}

function handleGymState(event) {
  const next = Number(event?.detail?.draydenDominance ?? 0);
  if (!Number.isFinite(next)) return;

  if (lastDominance === null) {
    lastDominance = next;
    return;
  }

  if (next > lastDominance) {
    playFearFx(next);
  }

  lastDominance = next;
}

window.addEventListener('unova-gym-state-change', handleGymState);

// 전투 화면 재마운트/새 게임에서 이전 수치가 남지 않도록 DOM 상태도 함께 감시한다.
const resetObserver = new MutationObserver(() => {
  if (!document.querySelector('.unova-drayden-hud')) {
    lastDominance = null;
    removeFearFx();
  }
});

resetObserver.observe(document.body, { childList: true, subtree: true });
