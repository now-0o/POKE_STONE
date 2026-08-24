import { CARD_MAP, spriteUrl } from "../../data/cards.js";
import "./battle-history.css";

const MAX_VISIBLE = 16;
const MAX_STORED = 60;

let mountedBoard = null;
let previousLines = [];
let entries = [];
let sequence = 0;
let selectedSeq = null;
let mobileOpen = false;
let syncing = false;
let floatingTooltip = null;

function getBattleGame() {
  return window.__pokeNState?.game || null;
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

function shouldIgnoreMessage(message) {
  const text = String(message || "").trim();
  if (!text) return true;

  // 전투 행동이 아닌 단순 턴 안내는 히스토리에 남기지 않는다.
  if (/의\s*차례[!！.…]*\s*$/.test(text)) return true;
  if (/^(?:내|상대)\s*차례[!！.…]*\s*$/.test(text)) return true;
  if (/턴\s*(?:종료|넘김|넘기기)/.test(text)) return true;
  if (/턴을\s*넘/.test(text)) return true;

  return false;
}

function cardCandidates() {
  return Object.values(CARD_MAP)
    .filter((card) => card?.id && card?.name)
    .sort((a, b) => b.name.length - a.name.length);
}

function findMentionedCards(message) {
  const matches = [];

  cardCandidates().forEach((card) => {
    const index = message.indexOf(card.name);
    if (index < 0) return;
    matches.push({ card, index });
  });

  matches.sort((a, b) => a.index - b.index || b.card.name.length - a.card.name.length);

  const seen = new Set();
  return matches
    .filter(({ card }) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    })
    .map(({ card }) => card);
}

function fieldMentions(board, selector, name) {
  if (!name) return false;
  return [...board.querySelectorAll(selector)].some((node) =>
    (node.textContent || "").includes(name),
  );
}

function inferSide(board, message, cards) {
  const enemyName = board.querySelector(".enemy-hero-cluster .hero-name")?.textContent?.trim();
  const playerName = board.querySelector(".my-hero-cluster .hero-name")?.textContent?.trim() || "나";

  if (enemyName && message.includes(enemyName)) return "enemy";
  if (playerName && (message.startsWith(playerName) || message.includes(`${playerName}의`))) {
    return "player";
  }

  const source = cards[0];
  if (source?.name) {
    if (fieldMentions(board, ".enemy-field [data-uid]", source.name)) return "enemy";
    if (fieldMentions(board, ".my-field [data-uid]", source.name)) return "player";
  }

  const turn = document.body.dataset.battleTurn;
  return turn === "player" || turn === "enemy" ? turn : "neutral";
}

function actionLabel(message) {
  if (/기절|쓰러|탈진/.test(message)) return "기절";
  if (/메가진화|진화했다|진화했/.test(message)) return "진화";
  if (/냈다|소환|등장|합류/.test(message)) return "소환";
  if (/공격|피해|강타|불태|절단|폭발|번개|파동|빔/.test(message)) return "공격 / 피해";
  if (/회복|치유|흡수/.test(message)) return "회복";
  if (/특성|의 .*\!|공격력|방어|장막|날씨/.test(message)) return "특성 / 효과";
  if (/퀘스트/.test(message)) return "퀘스트";
  if (/카드를 뽑|손으로|덱/.test(message)) return "카드";
  return "전투 기록";
}

function createPortrait(card, className = "") {
  const wrap = document.createElement("span");
  wrap.className = ["battle-history-portrait", className].filter(Boolean).join(" ");

  if (card?.kind === "pokemon") {
    const img = document.createElement("img");
    img.alt = card.name;
    img.draggable = false;
    img.loading = "lazy";
    img.src = spriteUrl(card.id);
    img.addEventListener(
      "error",
      () => {
        img.remove();
        wrap.textContent = card.emoji || "◆";
      },
      { once: true },
    );
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
            : "•";
  wrap.appendChild(symbol);
  return wrap;
}

function createFlowNode(entry) {
  const flow = document.createElement("div");
  flow.className = "battle-history-action-flow";

  const source = entry.cards[0] || null;
  const target = entry.cards[1] || null;

  const sourceWrap = document.createElement("div");
  sourceWrap.className = "battle-history-flow-person";
  sourceWrap.appendChild(createPortrait(source, "is-flow"));
  const sourceName = document.createElement("span");
  sourceName.textContent = source?.name || (entry.side === "enemy" ? "상대" : entry.side === "player" ? "나" : "효과");
  sourceWrap.appendChild(sourceName);
  flow.appendChild(sourceWrap);

  if (target) {
    const arrow = document.createElement("span");
    arrow.className = "battle-history-flow-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    flow.appendChild(arrow);

    const targetWrap = document.createElement("div");
    targetWrap.className = "battle-history-flow-person";
    targetWrap.appendChild(createPortrait(target, "is-flow"));
    const targetName = document.createElement("span");
    targetName.textContent = target.name;
    targetWrap.appendChild(targetName);
    flow.appendChild(targetWrap);
  }

  return flow;
}

function turnEntries(entry) {
  return entries.filter((candidate) => candidate.turnKey === entry.turnKey);
}

function createTooltip(entry) {
  const tooltip = document.createElement("div");
  tooltip.className = "battle-history-tooltip";

  const head = document.createElement("div");
  head.className = "battle-history-tooltip-head";

  const title = document.createElement("strong");
  title.textContent = actionLabel(entry.message);
  head.appendChild(title);

  const turn = document.createElement("span");
  turn.className = "battle-history-turn-badge";
  turn.textContent = `턴 ${entry.turnCount} · ${entry.turnSide === "enemy" ? "상대" : "내"} 턴`;
  head.appendChild(turn);
  tooltip.appendChild(head);

  tooltip.appendChild(createFlowNode(entry));

  const message = document.createElement("div");
  message.className = "battle-history-primary-message";
  message.textContent = entry.message;
  tooltip.appendChild(message);

  const sameTurn = turnEntries(entry);
  if (sameTurn.length > 1) {
    const group = document.createElement("div");
    group.className = "battle-history-turn-detail";

    const groupTitle = document.createElement("strong");
    groupTitle.textContent = "이 턴의 기록";
    group.appendChild(groupTitle);

    const list = document.createElement("div");
    list.className = "battle-history-turn-detail-list";
    sameTurn.forEach((item) => {
      const line = document.createElement("span");
      if (item.seq === entry.seq) line.classList.add("is-current");
      line.textContent = item.message;
      list.appendChild(line);
    });
    group.appendChild(list);
    tooltip.appendChild(group);
  }

  return tooltip;
}

function clearFloatingTooltip() {
  floatingTooltip?.remove();
  floatingTooltip = null;
}

function showFloatingTooltip(entry, anchor) {
  if (!anchor || window.matchMedia?.("(pointer: coarse), (max-width: 760px)").matches) {
    return;
  }

  clearFloatingTooltip();

  const tooltip = createTooltip(entry);
  tooltip.classList.add("is-floating");
  document.body.appendChild(tooltip);
  floatingTooltip = tooltip;

  const anchorRect = anchor.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 12;

  let left = anchorRect.right + gap;
  if (left + tooltipRect.width > window.innerWidth - 8) {
    left = Math.max(8, anchorRect.left - tooltipRect.width - gap);
  }

  let top = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2;
  top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function createEntryNode(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `battle-history-entry is-${entry.side}`;
  if (selectedSeq === entry.seq) button.classList.add("is-selected");
  button.dataset.historySeq = String(entry.seq);
  button.setAttribute("aria-label", entry.message);

  button.appendChild(createPortrait(entry.cards[0] || null));

  button.addEventListener("mouseenter", () => showFloatingTooltip(entry, button));
  button.addEventListener("mouseleave", clearFloatingTooltip);
  button.addEventListener("focus", () => showFloatingTooltip(entry, button));
  button.addEventListener("blur", clearFloatingTooltip);
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

function visibleTurnGroups() {
  const visible = entries.slice(-MAX_VISIBLE).reverse();
  const groups = [];

  visible.forEach((entry) => {
    const last = groups[groups.length - 1];
    if (last?.turnKey === entry.turnKey) {
      last.entries.push(entry);
      return;
    }
    groups.push({ turnKey: entry.turnKey, entries: [entry] });
  });

  return groups;
}

function renderHistory(board) {
  if (!board || board !== mountedBoard) return;
  clearFloatingTooltip();

  const shell = createShell(board);
  shell.classList.toggle("is-open", mobileOpen);

  const panel = shell.querySelector(".battle-history-panel");
  if (!panel) return;
  panel.replaceChildren();

  const list = document.createElement("div");
  list.className = "battle-history-list";

  // 로그가 적을 때도 항상 레일 아래에서 시작한다.
  const spacer = document.createElement("div");
  spacer.className = "battle-history-spacer";
  list.appendChild(spacer);

  const groups = visibleTurnGroups();

  if (!groups.length) {
    const empty = document.createElement("div");
    empty.className = "battle-history-empty";
    empty.setAttribute("aria-label", "아직 기록된 행동이 없습니다.");
    list.appendChild(empty);
  } else {
    groups.forEach((group) => {
      const turnGroup = document.createElement("div");
      turnGroup.className = "battle-history-turn-group";
      turnGroup.dataset.turnKey = group.turnKey;
      group.entries.forEach((entry) => turnGroup.appendChild(createEntryNode(entry)));
      list.appendChild(turnGroup);
    });
  }

  panel.appendChild(list);

  const selected = entries.find((entry) => entry.seq === selectedSeq);
  if (selected) {
    const detail = document.createElement("div");
    detail.className = "battle-history-selected-detail";

    const heading = document.createElement("div");
    heading.className = "battle-history-selected-head";
    const detailTitle = document.createElement("strong");
    detailTitle.textContent = actionLabel(selected.message);
    heading.appendChild(detailTitle);
    const detailTurn = document.createElement("span");
    detailTurn.textContent = `턴 ${selected.turnCount}`;
    heading.appendChild(detailTurn);
    detail.appendChild(heading);

    detail.appendChild(createFlowNode(selected));

    const detailText = document.createElement("span");
    detailText.className = "battle-history-selected-message";
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
  const rawNewLines = previousLines.length ? currentLines.slice(overlap) : currentLines;
  previousLines = currentLines;

  const newLines = rawNewLines.filter((message) => !shouldIgnoreMessage(message));
  if (!newLines.length) return false;

  const game = getBattleGame();
  const turnCount = Number(game?.turnCount) || 1;
  const turnSide = game?.turn === "enemy" ? "enemy" : "player";
  const turnKey = `${turnCount}:${turnSide}`;

  newLines.forEach((message) => {
    const cards = findMentionedCards(message);
    entries.push({
      seq: ++sequence,
      message,
      cards,
      side: inferSide(board, message, cards),
      turnCount,
      turnSide,
      turnKey,
    });
  });

  if (entries.length > MAX_STORED) entries = entries.slice(-MAX_STORED);
  return true;
}

function resetForBoard(board) {
  if (mountedBoard === board) return;

  clearFloatingTooltip();
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
