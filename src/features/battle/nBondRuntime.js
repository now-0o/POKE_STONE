const activeTransfers = new Set();
let lastGame = null;

function unitElement(uid) {
  if (!uid) return null;
  return [...document.querySelectorAll('.battle-board .field-unit[data-uid]')]
    .find((element) => element.dataset.uid === uid) || null;
}

function fieldElement(side) {
  return document.querySelector(
    side === 'enemy' ? '.battle-board .enemy-field' : '.battle-board .my-field',
  );
}

function fieldCenter(side) {
  const field = fieldElement(side);
  const rect = field?.getBoundingClientRect();
  if (!rect?.width || !rect?.height) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function installFriendshipBadges(game) {
  if (!game?.players || game.trainer?.gimmick !== 'n_bond') {
    document.querySelectorAll('.n-friendship-badge').forEach((node) => node.remove());
    return;
  }

  const values = new Map();
  for (const unit of game.players.player?.field || []) {
    if (Number.isFinite(unit._nFriendship)) {
      values.set(unit.uid, {
        value: Math.max(0, Math.min(3, unit._nFriendship)),
        defected: false,
      });
    }
  }
  for (const unit of game.players.enemy?.field || []) {
    if (unit._nDefected && Number.isFinite(unit._nFriendship)) {
      values.set(unit.uid, {
        value: Math.max(0, Math.min(3, unit._nFriendship)),
        defected: true,
      });
    }
  }

  document.querySelectorAll('.battle-board .field-unit[data-uid]').forEach((element) => {
    const info = values.get(element.dataset.uid);
    let badge = element.querySelector(':scope > .n-friendship-badge');
    if (!info) {
      badge?.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'n-friendship-badge';
      badge.setAttribute('aria-hidden', 'true');
      element.appendChild(badge);
    }

    badge.className = [
      'n-friendship-badge',
      info.value <= 1 ? 'is-low' : '',
      info.value === 0 ? 'is-zero' : '',
      info.defected ? 'is-defected' : '',
    ].filter(Boolean).join(' ');
    badge.innerHTML = `친밀도 <strong>${info.value}</strong>`;
  });
}

function scheduleBadgeSync(game) {
  lastGame = game || lastGame;
  const sync = () => installFriendshipBadges(lastGame);
  requestAnimationFrame(() => requestAnimationFrame(sync));
  window.setTimeout(sync, 50);
  window.setTimeout(sync, 180);
}

function makeChain(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const chain = document.createElement('div');
  chain.className = 'n-bond-chain';
  Object.assign(chain.style, {
    left: `${from.x}px`,
    top: `${from.y - 6}px`,
    width: `${distance}px`,
  });
  document.body.appendChild(chain);
  const animation = chain.animate(
    [
      { transform: `rotate(${angle}deg) scaleX(0)`, opacity: 0 },
      { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 1, offset: 0.48 },
      { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 1, offset: 0.78 },
      { transform: `rotate(${angle}deg) scaleX(.94)`, opacity: 0 },
    ],
    {
      duration: 720,
      easing: 'cubic-bezier(.18,.72,.2,1)',
      fill: 'forwards',
    },
  );
  const cleanup = () => chain.remove();
  animation.addEventListener('finish', cleanup, { once: true });
  window.setTimeout(cleanup, 900);
  return chain;
}

function hideDestination(uid, side, duration = 620) {
  const started = performance.now();
  const tick = () => {
    const element = unitElement(uid);
    if (element && element.dataset.drop === (side === 'enemy' ? 'unit-enemy' : 'unit-player')) {
      element.classList.add('n-bond-destination-hidden');
      window.setTimeout(() => element.classList.remove('n-bond-destination-hidden'), duration);
      return;
    }
    if (performance.now() - started < 240) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function transferLabel(text, x, y) {
  const label = document.createElement('div');
  label.className = 'n-bond-transfer-label';
  label.textContent = text;
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
  document.body.appendChild(label);
  window.setTimeout(() => label.remove(), 900);
}

function releaseBurst(x, y) {
  const burst = document.createElement('div');
  burst.className = 'n-bond-release-burst';
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;
  document.body.appendChild(burst);
  window.setTimeout(() => burst.remove(), 650);
}

function playTransfer(detail) {
  const { uid, fromSide, toSide, kind } = detail || {};
  if (!uid || activeTransfers.has(uid)) return;
  const source = unitElement(uid);
  const sourceRect = source?.getBoundingClientRect();
  const destination = fieldCenter(toSide);
  if (!source || !sourceRect?.width || !destination) return;

  activeTransfers.add(uid);
  const sourceCenter = {
    x: sourceRect.left + sourceRect.width / 2,
    y: sourceRect.top + sourceRect.height / 2,
  };
  const nCenter = fieldCenter('enemy') || destination;

  const ghost = source.cloneNode(true);
  ghost.classList.add('n-bond-transfer-ghost');
  ghost.classList.remove('selected', 'targetable', 'can-act', 'hit-flash');
  ghost.removeAttribute('data-drop');
  ghost.removeAttribute('data-uid');
  Object.assign(ghost.style, {
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
  });
  document.body.appendChild(ghost);

  if (kind === 'defect') {
    makeChain(nCenter, sourceCenter);
    transferLabel('마음이 N에게 기울었다', sourceCenter.x, sourceRect.top - 8);
  } else {
    releaseBurst(sourceCenter.x, sourceCenter.y);
    transferLabel('사슬이 풀렸다', sourceCenter.x, sourceRect.top - 8);
  }

  hideDestination(uid, toSide, 650);

  const dx = destination.x - sourceCenter.x;
  const dy = destination.y - sourceCenter.y;
  const delay = kind === 'defect' ? 210 : 80;
  window.setTimeout(() => {
    const animation = ghost.animate(
      kind === 'defect'
        ? [
            { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
            { transform: `translate3d(${dx * .18}px,${dy * .1 - 10}px,0) scale(1.05)`, opacity: 1, offset: .24 },
            { transform: `translate3d(${dx}px,${dy}px,0) scale(.88)`, opacity: .12 },
          ]
        : [
            { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
            { transform: `translate3d(${dx * .55}px,${dy * .35 - 14}px,0) scale(1.05)`, opacity: 1, offset: .46 },
            { transform: `translate3d(${dx}px,${dy}px,0) scale(.94)`, opacity: .18 },
          ],
      {
        duration: kind === 'defect' ? 500 : 460,
        easing: kind === 'defect'
          ? 'cubic-bezier(.22,.78,.18,1)'
          : 'cubic-bezier(.18,.75,.22,1)',
        fill: 'forwards',
      },
    );

    const cleanup = () => {
      ghost.remove();
      activeTransfers.delete(uid);
      scheduleBadgeSync(lastGame);
    };
    animation.addEventListener('finish', cleanup, { once: true });
    window.setTimeout(cleanup, 760);
  }, delay);
}

function playPhaseSummon(detail) {
  const { uid, name, phase } = detail || {};
  const board = document.querySelector('.battle-board');
  if (!board) return;

  const flash = document.createElement('div');
  flash.className = `n-bond-phase-flash phase-${phase || 2}`;
  const label = document.createElement('strong');
  label.textContent = phase === 3
    ? `이상 — ${name || '제크로무'}`
    : `진실 — ${name || '레시라무'}`;
  flash.appendChild(label);
  board.appendChild(flash);
  window.setTimeout(() => flash.remove(), 980);

  const started = performance.now();
  const focus = () => {
    const element = unitElement(uid);
    if (element) {
      element.classList.add('n-signature-arrival');
      window.setTimeout(() => element.classList.remove('n-signature-arrival'), 850);
      return;
    }
    if (performance.now() - started < 360) requestAnimationFrame(focus);
  };
  requestAnimationFrame(focus);
}

function onNState(event) {
  const game = event.detail?.game;
  if (!game) return;
  scheduleBadgeSync(game);
}

if (typeof window !== 'undefined') {
  window.addEventListener('unova-n-state-change', onNState);
  window.addEventListener('unova-n-transfer', (event) => playTransfer(event.detail));
  window.addEventListener('unova-n-phase-summon', (event) => playPhaseSummon(event.detail));
  const game = window.__pokeNState?.game;
  if (game) scheduleBadgeSync(game);
}
