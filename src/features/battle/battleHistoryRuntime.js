import React from "react";
import { createRoot } from "react-dom/client";
import { CARD_MAP, spriteUrl } from "../../data/cards.js";
import { HandCard } from "../../components/Card.jsx";
import "./battle-history.css";

const MAX_VISIBLE = 16;
const MAX_STORED = 60;

let mountedBoard = null;
let previousLines = [];
let entries = [];
let sequence = 0;
let mobileOpen = false;
let syncing = false;
let inspectHost = null;
let inspectRoot = null;

function cardCandidates() {
  return Object.values(CARD_MAP)
    .filter((card) => card?.id && card?.name)
    .sort((a, b) => b.name.length - a.name.length);
}

function pokemonCandidates() {
  return cardCandidates().filter((card) => card.kind === "pokemon");
}

function findCardByName(name) {
  const text = String(name || "").trim();
  if (!text) return null;
  return cardCandidates().find((card) => card.name === text) || null;
}

function findPokemonByDisplayName(name) {
  const text = String(name || "").trim();
  if (!text) return null;
  return (
    pokemonCandidates().find((card) => card.name === text) ||
    pokemonCandidates().find((card) => text.endsWith(card.name)) ||
    null
  );
}

function mentionedPokemon(message, excludeIds = []) {
  const excluded = new Set(excludeIds.filter(Boolean));
  const matches = [];

  pokemonCandidates().forEach((card) => {
    if (excluded.has(card.id)) return;
    const index = message.indexOf(card.name);
    if (index < 0) return;
    matches.push({ card, index });
  });

  matches.sort(
    (a, b) => a.index - b.index || b.card.name.length - a.card.name.length,
  );

  const seen = new Set();
  return matches
    .filter(({ card }) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    })
    .map(({ card }) => card);
}

function getBattleGame() {
  return window.__pokeBattleGame || window.__pokeNState?.game || null;
}

function readBattleLines(board) {
  const game = getBattleGame();
  if (Array.isArray(game?.log)) {
    return game.log.map((line) => String(line || "").trim()).filter(Boolean);
  }

  const log = board?.querySelector(".mid-bar .battle-log");
  if (!log) return [];
  return [...log.children]
    .map((node) => node.textContent?.trim() || "")
    .filter(Boolean);
}

function suffixPrefixOverlap(before, after) {
  const max = Math.min(before.length, after.length);
  for (let size = max; size > 0; size -= 1) {
    let same = true;
    for (let i = 0; i < size; i += 1) {
      if (before[before.length - size + i] !== after[i]) {
        same = false;
        break;
      }
    }
    if (same) return size;
  }
  return 0;
}

function parseDamage(message) {
  const match = message.match(/피해(?:를|가)?\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function inferSide(board, message, sourceCard) {
  const enemyName = board
    .querySelector(".enemy-hero-cluster .hero-name")
    ?.textContent?.trim();
  const playerName =
    board.querySelector(".my-hero-cluster .hero-name")?.textContent?.trim() ||
    "나";

  if (enemyName && message.includes(enemyName)) return "enemy";
  if (
    playerName &&
    (message.startsWith(playerName) || message.includes(`${playerName}의`))
  ) {
    return "player";
  }

  if (sourceCard?.kind === "pokemon") {
    const enemyHas = [...board.querySelectorAll(".enemy-field [data-uid]")].some(
      (node) => (node.textContent || "").includes(sourceCard.name),
    );
    if (enemyHas) return "enemy";

    const playerHas = [...board.querySelectorAll(".my-field [data-uid]")].some(
      (node) => (node.textContent || "").includes(sourceCard.name),
    );
    if (playerHas) return "player";
  }

  const turn = document.body.dataset.battleTurn;
  return turn === "enemy" ? "enemy" : "player";
}

function findUsedCard(message) {
  const candidates = cardCandidates();
  return (
    candidates.find((card) => message.startsWith(`${card.name}!`)) ||
    candidates.find((card) =>
      message.includes(`${card.name}을(를) 사용했다!`),
    ) ||
    null
  );
}

function parseAction(board, message) {
  const summon = message.match(/^(.+?)이\(가\)\s+(.+?)을\(를\)\s+냈다!/);
  if (summon) {
    const card = findCardByName(summon[2]);
    if (card?.kind === "pokemon") {
      return {
        type: "summon",
        sourceCard: card,
        targetCard: null,
        damage: 0,
        message,
        side: inferSide(board, message, card),
      };
    }
  }

  const itemEquip = message.match(/^(.+?)에게\s+(.+?)을\(를\)\s+장착했다!/);
  if (itemEquip) {
    const itemCard = findCardByName(itemEquip[2]);
    const targetCard = findPokemonByDisplayName(itemEquip[1]);
    if (itemCard && (itemCard.kind === "item" || itemCard.type === "도구")) {
      return {
        type: "item",
        sourceCard: itemCard,
        targetCard,
        damage: 0,
        message,
        side: inferSide(board, message, itemCard),
      };
    }
  }

  const attack = message.match(
    /^(.+?)이\(가\)\s+(.+?)을\(를\)\s+(?:직접\s+)?공격!\s*피해\s*(\d+)!?/,
  );
  if (attack) {
    const sourceCard = findPokemonByDisplayName(attack[1]);
    const targetCard = findPokemonByDisplayName(attack[2]);
    if (sourceCard) {
      return {
        type: "attack",
        sourceCard,
        targetCard,
        damage: Number(attack[3]) || 0,
        message,
        side: inferSide(board, message, sourceCard),
      };
    }
  }

  const usedCard = findUsedCard(message);
  if (usedCard) {
    const isItem = usedCard.kind === "item" || usedCard.type === "도구";
    const isTechnique = usedCard.kind === "spell" && usedCard.type === "기술";

    if (isItem || isTechnique) {
      const targets = mentionedPokemon(message, [usedCard.id]);
      return {
        type: isItem ? "item" : "technique",
        sourceCard: usedCard,
        targetCard: targets[0] || null,
        damage: parseDamage(message),
        message,
        side: inferSide(board, message, usedCard),
      };
    }
  }

  return null;
}

function typeLabel(type) {
  if (type === "summon") return "포켓몬 소환";
  if (type === "technique") return "기술 사용";
  if (type === "attack") return "공격";
  if (type === "item") return "도구 사용";
  return "전투 기록";
}

function faintedInLines(card, lines) {
  if (!card || !Array.isArray(lines)) return false;
  return lines.some(
    (line) =>
      line.includes(card.name) &&
      /(기절했다|기절!|쓰러졌다|쓰러졌다!)/.test(line),
  );
}

function createRailIcon(entry) {
  const wrap = document.createElement("span");
  wrap.className = "battle-history-portrait";

  if (entry.sourceCard?.kind === "pokemon") {
    const img = document.createElement("img");
    img.alt = entry.sourceCard.name;
    img.draggable = false;
    img.loading = "lazy";
    img.src = spriteUrl(entry.sourceCard.id);
    img.addEventListener(
      "error",
      () => {
        img.remove();
        wrap.textContent = entry.sourceCard.emoji || "◆";
      },
      { once: true },
    );
    wrap.appendChild(img);
    return wrap;
  }

  const symbol = document.createElement("span");
  symbol.className = "battle-history-card-symbol";
  symbol.textContent = entry.type === "technique" ? "✧" : "◆";
  wrap.appendChild(symbol);
  return wrap;
}

function handCardElement(cardId) {
  if (!cardId) return null;
  return React.createElement(HandCard, {
    cardId,
    playable: true,
    ghost: true,
  });
}

function inspectCard(card, fainted, key) {
  if (!card) return null;
  return React.createElement(
    "div",
    {
      className: `battle-history-inspect-card ${fainted ? "is-fainted" : ""}`,
      key,
    },
    handCardElement(card.id),
    fainted
      ? React.createElement(
          "div",
          { className: "battle-history-fainted-stamp" },
          "기절",
        )
      : null,
  );
}

function inspectReact(entry) {
  const children = [
    inspectCard(entry.sourceCard, entry.sourceFainted, "source"),
  ];

  if (entry.targetCard) {
    children.push(
      React.createElement(
        "div",
        { className: "battle-history-inspect-bridge", key: "bridge" },
        React.createElement("span", null, "→"),
        entry.damage > 0
          ? React.createElement("strong", null, `피해 ${entry.damage}`)
          : null,
      ),
      inspectCard(entry.targetCard, entry.targetFainted, "target"),
    );
  } else if (entry.damage > 0) {
    children.push(
      React.createElement(
        "div",
        { className: "battle-history-inspect-solo-damage", key: "damage" },
        `피해 ${entry.damage}`,
      ),
    );
  }

  return React.createElement(
    "div",
    {
      className: "battle-history-inspect-content",
      "aria-label": `${typeLabel(entry.type)} ${entry.message}`,
    },
    ...children,
  );
}

function hideInspectOverlay() {
  if (inspectRoot) {
    inspectRoot.unmount();
    inspectRoot = null;
  }
  if (inspectHost) {
    inspectHost.remove();
    inspectHost = null;
  }
}

function showInspectOverlay(entry) {
  hideInspectOverlay();
  if (!entry || window.matchMedia?.("(pointer: coarse)").matches) return;

  const host = document.createElement("div");
  host.className = "inspect-overlay battle-history-inspect-overlay";
  document.body.appendChild(host);

  inspectHost = host;
  inspectRoot = createRoot(host);
  inspectRoot.render(inspectReact(entry));
}

function createEntryNode(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `battle-history-entry is-${entry.side} event-${entry.type}`;
  button.setAttribute("aria-label", `${typeLabel(entry.type)}: ${entry.message}`);
  button.appendChild(createRailIcon(entry));

  button.addEventListener("mouseenter", () => showInspectOverlay(entry));
  button.addEventListener("mouseleave", hideInspectOverlay);
  button.addEventListener("focus", () => showInspectOverlay(entry));
  button.addEventListener("blur", hideInspectOverlay);
  button.addEventListener("click", () => {
    if (window.matchMedia?.("(pointer: coarse)").matches) {
      showMobileDetail(entry);
    }
  });

  return button;
}

function createShell(board) {
  let shell = board.querySelector(":scope > .battle-history-shell");
  if (shell) return shell;

  shell = document.createElement("aside");
  shell.className = "battle-history-shell";
  shell.setAttribute("aria-label", "전투 기록");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "battle-history-toggle";
  toggle.textContent = "전투 기록";
  toggle.addEventListener("click", () => {
    mobileOpen = !mobileOpen;
    renderHistory(board);
  });
  shell.appendChild(toggle);

  const panel = document.createElement("div");
  panel.className = "battle-history-panel";
  shell.appendChild(panel);

  board.prepend(shell);
  board.classList.add("battle-history-enabled");
  return shell;
}

function showMobileDetail(entry) {
  const shell = mountedBoard?.querySelector(":scope > .battle-history-shell");
  const panel = shell?.querySelector(".battle-history-panel");
  if (!panel) return;

  panel.querySelector(".battle-history-mobile-detail")?.remove();

  const detail = document.createElement("div");
  detail.className = "battle-history-mobile-detail";
  panel.appendChild(detail);
  const root = createRoot(detail);
  root.render(
    React.createElement(
      "div",
      { className: "battle-history-mobile-inspect" },
      inspectReact(entry),
    ),
  );
}

function renderHistory(board) {
  if (!board || board !== mountedBoard) return;
  const shell = createShell(board);
  shell.classList.toggle("is-open", mobileOpen);

  const panel = shell.querySelector(".battle-history-panel");
  if (!panel) return;
  panel.replaceChildren();

  const list = document.createElement("div");
  list.className = "battle-history-list";

  const spacer = document.createElement("div");
  spacer.className = "battle-history-spacer";
  list.appendChild(spacer);

  // 오래된 행동이 맨 아래에 남고 새 행동이 그 위로 한 칸씩 쌓인다.
  const visible = entries.slice(-MAX_VISIBLE).reverse();
  visible.forEach((entry) => list.appendChild(createEntryNode(entry)));
  panel.appendChild(list);

  requestAnimationFrame(() => {
    // 항목이 넘칠 때도 최신 행동(위쪽)이 바로 보이도록 유지한다.
    list.scrollTop = 0;
  });
}

function captureNewLines(board) {
  const currentLines = readBattleLines(board);
  if (!currentLines.length) {
    previousLines = [];
    return false;
  }

  const overlap = suffixPrefixOverlap(previousLines, currentLines);
  const newLines = previousLines.length
    ? currentLines.slice(overlap)
    : currentLines;
  previousLines = currentLines;

  const parsed = [];
  newLines.forEach((message, index) => {
    const action = parseAction(board, message);
    if (action) parsed.push({ index, action });
  });

  if (!parsed.length) return false;

  parsed.forEach((item, actionIndex) => {
    const next = parsed[actionIndex + 1];
    const outcomeLines = newLines.slice(item.index + 1, next ? next.index : newLines.length);
    const action = item.action;

    entries.push({
      seq: ++sequence,
      ...action,
      sourceFainted: faintedInLines(action.sourceCard, outcomeLines),
      targetFainted: faintedInLines(action.targetCard, outcomeLines),
    });
  });

  if (entries.length > MAX_STORED) entries = entries.slice(-MAX_STORED);
  return true;
}

function resetForBoard(board) {
  if (mountedBoard === board) return;

  hideInspectOverlay();
  if (mountedBoard) mountedBoard.classList.remove("battle-history-enabled");
  mountedBoard = board;
  previousLines = [];
  entries = [];
  sequence = 0;
  mobileOpen = false;
}

export function syncBattleHistory() {
  if (syncing) return;
  syncing = true;

  try {
    const board = document.querySelector(".battle.battle-board");
    if (!board) {
      resetForBoard(null);
      return;
    }

    resetForBoard(board);
    const changed = captureNewLines(board);
    const shellMissing = !board.querySelector(":scope > .battle-history-shell");
    if (changed || shellMissing) renderHistory(board);
  } finally {
    syncing = false;
  }
}
