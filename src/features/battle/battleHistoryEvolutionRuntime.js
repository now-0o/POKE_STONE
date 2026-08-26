import React from "react";
import { createRoot } from "react-dom/client";
import { CARD_MAP, spriteUrl } from "../../data/cards.js";
import { HandCard } from "../../components/Card.jsx";

const MAX_EVOLUTION_ENTRIES = 30;

let mountedBoard = null;
let previousSnapshots = new Map();
let evolutionEntries = [];
let sequence = 0;
let queued = false;
let inspectHost = null;
let inspectRoot = null;

function getGame() {
  return window.__pokeBattleGame || window.__pokeNState?.game || null;
}

function cloneUnit(unit, side) {
  if (!unit) return null;
  return {
    uid: unit.uid,
    cardId: unit.cardId,
    side,
    name: unit.name,
    type: unit.type,
    atk: unit.atk,
    baseAtk: unit.baseAtk,
    hp: Math.max(0, Number(unit.hp) || 0),
    maxHp: Math.max(0, Number(unit.maxHp) || 0),
    ability: unit.ability || null,
    secondaryAbility: unit.secondaryAbility || null,
    shiny: !!unit.shiny,
    mega: !!unit.mega,
    megaSpriteId: unit.megaSpriteId || null,
    item: unit.item || null,
    status: unit.status || null,
  };
}

function collectSnapshots(game) {
  const snapshots = new Map();
  if (!game?.players) return snapshots;

  for (const side of ["player", "enemy"]) {
    (game.players?.[side]?.field || []).forEach((unit, fieldIndex) => {
      snapshots.set(unit.uid, {
        uid: unit.uid,
        side,
        fieldIndex,
        cardId: unit.cardId,
        unit: cloneUnit(unit, side),
      });
    });
  }

  return snapshots;
}

function copySnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    ...snapshot,
    unit: snapshot.unit ? { ...snapshot.unit } : null,
  };
}

function evolutionKind(before, after) {
  if (!before || !after || before.side !== after.side) return null;

  const beforeCard = CARD_MAP[before.cardId];
  const afterCard = CARD_MAP[after.cardId];
  const regularEvolution =
    before.cardId !== after.cardId &&
    afterCard?.kind === "pokemon" &&
    afterCard.evolvesFrom === before.cardId;

  if (regularEvolution) return "evolution";

  if (!before.unit?.mega && after.unit?.mega) return "mega-evolution";
  return null;
}

function currentCoreCount() {
  const list = mountedBoard?.querySelector(".battle-history-list");
  if (!list) return 0;
  return list.querySelectorAll(
    ".battle-history-entry:not([data-evolution-history])",
  ).length;
}

function captureEvolutionTransitions(currentSnapshots) {
  if (!previousSnapshots.size) return false;

  let changed = false;
  const coreCountAtCapture = currentCoreCount();

  for (const [uid, before] of previousSnapshots) {
    const after = currentSnapshots.get(uid);
    const kind = evolutionKind(before, after);
    if (!kind) continue;

    const beforeCard = CARD_MAP[before.cardId] || null;
    const afterCard = CARD_MAP[after.cardId] || beforeCard;
    if (!beforeCard || !afterCard) continue;

    const fromName = before.unit?.name || beforeCard.name;
    const toName = after.unit?.name || afterCard.name;
    evolutionEntries.push({
      id: `evolution-${++sequence}`,
      kind,
      side: after.side,
      coreCountAtCapture,
      beforeCard,
      afterCard,
      before: copySnapshot(before),
      after: copySnapshot(after),
      message:
        kind === "mega-evolution"
          ? `${fromName} → ${toName} 메가진화`
          : `${fromName} → ${toName} 진화`,
    });
    changed = true;
  }

  if (evolutionEntries.length > MAX_EVOLUTION_ENTRIES) {
    evolutionEntries = evolutionEntries.slice(-MAX_EVOLUTION_ENTRIES);
  }
  return changed;
}

function hideInspect() {
  if (inspectRoot) {
    inspectRoot.unmount();
    inspectRoot = null;
  }
  if (inspectHost) {
    inspectHost.remove();
    inspectHost = null;
  }
}

function cardView(card, snapshot, key) {
  if (!card) return null;
  return React.createElement(
    "div",
    {
      className: "battle-history-v2-card-slot",
      key,
      style: { width: `${134 * 1.35}px`, height: `${188 * 1.35}px` },
    },
    React.createElement(
      "div",
      {
        className: "battle-history-v2-card-inner",
        style: { transform: "scale(1.35)" },
      },
      React.createElement(HandCard, {
        cardId: card.id,
        playable: true,
        ghost: true,
        unit: snapshot?.unit || undefined,
      }),
    ),
  );
}

function inspectView(entry) {
  return React.createElement(
    "div",
    {
      className: "battle-history-v2-inspect",
      "aria-label": entry.kind === "mega-evolution" ? "메가진화" : "진화",
    },
    cardView(entry.beforeCard, entry.before, "before"),
    React.createElement(
      "div",
      { className: "battle-history-v2-bridge" },
      React.createElement("span", { className: "battle-history-v2-arrow" }, "→"),
      React.createElement(
        "strong",
        null,
        entry.kind === "mega-evolution" ? "메가진화" : "진화",
      ),
    ),
    React.createElement(
      "div",
      {
        className: "battle-history-v2-target-grid",
        style: { gridTemplateColumns: "max-content" },
      },
      cardView(entry.afterCard, entry.after, "after"),
    ),
  );
}

function showInspect(entry, coarse = false) {
  hideInspect();
  const host = document.createElement("div");
  host.className = `inspect-overlay battle-history-v2-overlay ${coarse ? "is-coarse" : ""}`;
  if (coarse) host.addEventListener("click", hideInspect, { once: true });
  document.body.appendChild(host);
  inspectHost = host;
  inspectRoot = createRoot(host);
  inspectRoot.render(inspectView(entry));
}

function evolvedSprite(entry) {
  const unit = entry.after?.unit;
  try {
    return spriteUrl(
      entry.afterCard.id,
      !!unit?.shiny,
      !!unit?.mega,
      unit?.megaSpriteId || undefined,
    );
  } catch {
    return spriteUrl(entry.afterCard.id);
  }
}

function createEvolutionNode(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `battle-history-entry is-${entry.side} event-${entry.kind}`;
  button.dataset.evolutionHistory = entry.id;
  button.setAttribute(
    "aria-label",
    `${entry.kind === "mega-evolution" ? "메가진화" : "진화"}: ${entry.message}`,
  );

  const portrait = document.createElement("span");
  portrait.className = "battle-history-portrait";
  const img = document.createElement("img");
  img.alt = entry.after.unit?.name || entry.afterCard.name;
  img.draggable = false;
  img.src = evolvedSprite(entry);
  img.addEventListener(
    "error",
    () => {
      img.remove();
      portrait.textContent = (entry.afterCard.name || "진").slice(0, 1);
    },
    { once: true },
  );
  portrait.appendChild(img);
  button.appendChild(portrait);

  button.addEventListener("mouseenter", () => {
    if (!window.matchMedia?.("(pointer: coarse)").matches) showInspect(entry, false);
  });
  button.addEventListener("mouseleave", () => {
    if (!window.matchMedia?.("(pointer: coarse)").matches) hideInspect();
  });
  button.addEventListener("focus", () => showInspect(entry, false));
  button.addEventListener("blur", hideInspect);
  button.addEventListener("click", () => {
    if (window.matchMedia?.("(pointer: coarse)").matches) showInspect(entry, true);
  });
  return button;
}

function renderEvolutionEntries() {
  const list = mountedBoard?.querySelector(".battle-history-list");
  if (!list || !evolutionEntries.length) return;

  const spacer = list.querySelector(":scope > .battle-history-spacer");
  const coreNodes = [...list.querySelectorAll(
    ":scope > .battle-history-entry:not([data-evolution-history])",
  )];
  const coreCount = coreNodes.length;

  // 기존 히스토리는 최대 60개만 유지하므로 화면 범위를 완전히 벗어난
  // 오래된 진화 기록은 더 이상 주입하지 않는다.
  evolutionEntries = evolutionEntries.filter(
    (entry) => coreCount - entry.coreCountAtCapture <= 60,
  );

  const desired = coreNodes.map((node, index) => ({
    node,
    order: coreCount - index,
    serial: 0,
  }));

  for (const entry of evolutionEntries) {
    let node = list.querySelector(
      `[data-evolution-history="${entry.id}"]`,
    );
    if (!node) node = createEvolutionNode(entry);
    desired.push({
      node,
      order: entry.coreCountAtCapture + 0.5,
      serial: Number(entry.id.split("-").pop()) || 0,
    });
  }

  desired.sort((a, b) => b.order - a.order || b.serial - a.serial);

  let cursor = spacer ? spacer.nextSibling : list.firstChild;
  for (const item of desired) {
    if (item.node !== cursor) {
      list.insertBefore(item.node, cursor || null);
    }
    cursor = item.node.nextSibling;
  }
}

function reset(board) {
  if (mountedBoard === board) return;
  hideInspect();
  mountedBoard = board;
  previousSnapshots = new Map();
  evolutionEntries = [];
  sequence = 0;
}

function syncEvolutionHistory() {
  queued = false;
  const board = document.querySelector(".battle.battle-board");
  if (!board) {
    reset(null);
    return;
  }

  reset(board);
  const game = getGame();
  const currentSnapshots = collectSnapshots(game);
  captureEvolutionTransitions(currentSnapshots);
  previousSnapshots = currentSnapshots;
  renderEvolutionEntries();
}

function queueSync() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(syncEvolutionHistory);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const start = () => {
    const observer = new MutationObserver(queueSync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("focus", queueSync);
    document.addEventListener("visibilitychange", queueSync);
    queueSync();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
