import { CARDS, DEX, spriteUrl } from "../../data/cards.js";

const SAVE_KEY = "pkm_stone_v1";
const CARD_ID_BY_NAME = new Map(CARDS.map((card) => [card.name, card.id]));
const DECK_LIST_SELECTORS = [
  ".deck-card-list",
  ".mobile-v2-deck-list",
  ".mobile-landscape-deck-list",
];

function readCurrentSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function countDeckCards(deck) {
  const counts = {};
  for (const cardId of deck || []) {
    counts[cardId] = (counts[cardId] || 0) + 1;
  }
  return counts;
}

function rowCardId(row) {
  const rawName = row.querySelector(".deck-row-name")?.textContent || "";
  const name = rawName.replace(/^✨\s*/, "").trim();
  return CARD_ID_BY_NAME.get(name) || null;
}

function setRowSprite(row, cardId, shiny) {
  const dex = DEX[cardId];
  if (dex == null) return;

  row.classList.toggle("deck-row-shiny", shiny);
  row.dataset.shiny = shiny ? "1" : "0";

  const image = row.querySelector("img.card-sprite");
  if (!image) return;

  const expected = shiny
    ? `/sprites/pokemon/shiny/${dex}.png`
    : spriteUrl(cardId);

  if (expected && image.getAttribute("src") !== expected) {
    image.setAttribute("src", expected);
  }
}

function syncDeckList(list, save, deckCounts) {
  const groupedRows = new Map();

  list.querySelectorAll(".deck-row").forEach((row) => {
    const cardId = rowCardId(row);
    if (!cardId || DEX[cardId] == null) return;
    if (!groupedRows.has(cardId)) groupedRows.set(cardId, []);
    groupedRows.get(cardId).push(row);
  });

  groupedRows.forEach((rows, cardId) => {
    const total = deckCounts[cardId] || 0;
    const shinyCount = Math.max(
      0,
      Math.min(total, Number(save.deckShiny?.[cardId]) || 0),
    );
    const normalCount = Math.max(0, total - shinyCount);

    // getDeckVariantRows()는 같은 카드에서 일반 행을 먼저, 이로치 행을 뒤에 둔다.
    // 화면 컴포넌트가 재렌더되며 일반 스프라이트를 다시 넣더라도
    // 실제 저장값(deckShiny)을 최종 기준으로 시각 상태를 되돌린다.
    rows.forEach((row) => setRowSprite(row, cardId, false));

    if (shinyCount <= 0 || rows.length === 0) return;

    if (normalCount <= 0) {
      rows.forEach((row) => setRowSprite(row, cardId, true));
      return;
    }

    // 일반/이로치가 함께 있으면 마지막 variant 행이 이로치 행이다.
    setRowSprite(rows[rows.length - 1], cardId, true);
  });
}

let queued = false;

export function syncShinyDeckRows() {
  if (queued) return;
  queued = true;

  window.requestAnimationFrame(() => {
    queued = false;
    const save = readCurrentSave();
    if (!save) return;

    const deckCounts = countDeckCards(save.deck);
    DECK_LIST_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((list) =>
        syncDeckList(list, save, deckCounts),
      );
    });
  });
}

function startShinyDeckVisualRuntime() {
  syncShinyDeckRows();

  const observer = new MutationObserver(syncShinyDeckRows);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    // 가로 모바일/데스크톱 Sprite가 React 재렌더로 src를 일반판으로 되돌리는
    // 경우도 즉시 감지한다. 우리 동기화가 만든 class/data 속성은 감시하지 않는다.
    attributes: true,
    attributeFilter: ["src"],
  });

  // 클릭으로 덱이 바뀐 직후에도 다음 프레임에서 저장값을 다시 읽는다.
  document.addEventListener("pointerup", syncShinyDeckRows, true);
  window.addEventListener("pageshow", syncShinyDeckRows);
  window.addEventListener("focus", syncShinyDeckRows);
}

if (document.body) {
  startShinyDeckVisualRuntime();
} else {
  window.addEventListener("DOMContentLoaded", startShinyDeckVisualRuntime, {
    once: true,
  });
}
