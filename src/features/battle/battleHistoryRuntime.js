import { CARD_MAP, spriteUrl } from "../../data/cards.js";
import "./battle-history.css";

const MAX_VISIBLE = 9;
const MAX_STORED = 40;

const CARD_CANDIDATES = Object.values(CARD_MAP)
  .filter((card) => card?.id && card?.name)
  .sort((a, b) => b.name.length - a.name.length);

let mountedBoard = null;
let previousLines = [];
let entries = [];
let sequence = 0;
let selectedSeq = null;
let mobileOpen = false;
let syncing = false;

function readBattleLines(board) {
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

function inferCard(message) {
  return CARD_CANDIDATES.find((card) => message.includes(card.name)) || null;
}

function fieldMentions(board, selector, name) {
  if (!name) return false;
  return [...board.querySelectorAll(selector)].some((node) =>
    (node.textContent || "").includes(name),
  );
}

function inferSide(board, message, card) {
  const enemyName = board.querySelector(".enemy-hero-cluster .hero-name")?.textContent?.trim();
  const playerName = board.querySelector(".my-hero-cluster .hero-name")?.textContent?.trim() || "나";

  if (enemyName && message.includes(enemyName)) return "enemy";
  if (playerName && (message.startsWith(playerName) || message.includes(`${playerName}의`))) {
    return "player";
  }

  if (card?.name) {
    if (fieldMentions(board, ".enemy-field [data-uid]", card.name)) return "enemy";
    if (fieldMentions(board, ".my-field [data-uid]", card.name)) return "player";
  }

  const turn = document.body.dataset.battleTurn;
  return turn === "player" || turn === "enemy" ? turn : "neutral";
}

function entryIcon(card) {
  const wrap = document.createElement("span");
  wrap.className = "battle-history-portrait";

  if (card?.kind === "pokemon") {
    const img = document.createElement("img");
    img.alt = card.name;
    img.draggable = false;
    img.loading = "lazy";
    img.src = spriteUrl(card.id);
    img.addEventListener("error", () => {
      img.remove();
      wrap.textContent = card.emoji || "◆";
    }, { once: true });
    wrap.appendChild(img);
    return wrap;
  }

  const symbol = document.createElement("span");
  symbol.className = "battle-history-card-symbol";
  symbol.textContent =
    card?.kind === "quest"
      ? "★"
      : card?.kind === "mega"
        ? "✦"
        : card?.kind === "item"
          ? "◆"
          : card?.kind === "spell"
            ? "✧"
            : "▣";
  wrap.appendChild(symbol);
  return wrap;
}

function shortLabel(entry) {
  if (entry.card?.name) return entry.card.name;
  const message = entry.message;
  if (message.length <= 15) return message;
  return `${message.slice(0, 14)}…`;
}

function createEntryNode(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `battle-history-entry is-${entry.side}`;
  if (selectedSeq === entry.seq) button.classList.add("is-selected");
  button.dataset.historySeq = String(entry.seq);
  button.title = entry.message;

  button.appendChild(entryIcon(entry.card));

  const copy = document.createElement("span");
  copy.className = "battle-history-entry-copy";

  const label = document.createElement("strong");
  label.textContent = shortLabel(entry);
  copy.appendChild(label);

  const preview = document.createElement("span");
  preview.textContent = entry.message;
  copy.appendChild(preview);
  button.appendChild(copy);

  const tooltip = document.createElement("span");
  tooltip.className = "battle-history-tooltip";

  if (entry.card?.name) {
    const title = document.createElement("strong");
    title.textContent = entry.card.name;
    tooltip.appendChild(title);
  }

  const detail = document.createElement("span");
  detail.textContent = entry.message;
  tooltip.appendChild(detail);
  button.appendChild(tooltip);

  button.addEventListener("click", () => {
    selectedSeq = selectedSeq === entry.seq ? null : entry.seq;
    renderHistory(mountedBoard);
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
  toggle.setAttribute("aria-label", "전투 기록 열기");
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

function renderHistory(board) {
  if (!board || board !== mountedBoard) return;
  const shell = createShell(board);
  shell.classList.toggle("is-open", mobileOpen);

  const panel = shell.querySelector(".battle-history-panel");
  if (!panel) return;
  panel.replaceChildren();

  const header = document.createElement("div");
  header.className = "battle-history-header";

  const title = document.createElement("strong");
  title.textContent = "전투 기록";
  header.appendChild(title);

  const count = document.createElement("span");
  count.textContent = `${entries.length}`;
  header.appendChild(count);
  panel.appendChild(header);

  const list = document.createElement("div");
  list.className = "battle-history-list";
  const visible = entries.slice(-MAX_VISIBLE).reverse();

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "battle-history-empty";
    empty.textContent = "아직 기록된 행동이 없습니다.";
    list.appendChild(empty);
  } else {
    visible.forEach((entry) => list.appendChild(createEntryNode(entry)));
  }

  panel.appendChild(list);

  const selected = entries.find((entry) => entry.seq === selectedSeq);
  if (selected) {
    const detail = document.createElement("div");
    detail.className = "battle-history-selected-detail";

    const detailTitle = document.createElement("strong");
    detailTitle.textContent = selected.card?.name || "전투 기록";
    detail.appendChild(detailTitle);

    const detailText = document.createElement("span");
    detailText.textContent = selected.message;
    detail.appendChild(detailText);
    panel.appendChild(detail);
  }
}

function captureNewLines(board) {
  const currentLines = readBattleLines(board);
  if (!currentLines.length) {
    previousLines = [];
    return false;
  }

  const overlap = suffixPrefixOverlap(previousLines, currentLines);
  const newLines = previousLines.length ? currentLines.slice(overlap) : currentLines;
  previousLines = currentLines;

  if (!newLines.length) return false;

  newLines.forEach((message) => {
    const card = inferCard(message);
    entries.push({
      seq: ++sequence,
      message,
      card,
      side: inferSide(board, message, card),
    });
  });

  if (entries.length > MAX_STORED) entries = entries.slice(-MAX_STORED);
  return true;
}

function resetForBoard(board) {
  if (mountedBoard === board) return;

  if (mountedBoard) mountedBoard.classList.remove("battle-history-enabled");
  mountedBoard = board;
  previousLines = [];
  entries = [];
  sequence = 0;
  selectedSeq = null;
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
