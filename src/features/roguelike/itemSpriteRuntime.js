const ITEM_BASE = "/sprites/items";

const ITEM = Object.freeze({
  hp: `${ITEM_BASE}/potion.png`,
  deck: `${ITEM_BASE}/poke-ball.png`,
  hand: `${ITEM_BASE}/adventure-rules.png`,
  mana: `${ITEM_BASE}/normal-gem.png`,
  map: `${ITEM_BASE}/town-map.png`,
  cycle: `${ITEM_BASE}/master-ball.png`,
  money: `${ITEM_BASE}/amulet-coin.png`,
  recover: `${ITEM_BASE}/full-restore.png`,
  pc: `${ITEM_BASE}/poke-ball.png`,
});

function replaceSprite(container, src, label) {
  if (!container) return;
  const image = container.querySelector("img.card-sprite, img.trainer-sprite");
  if (!image || image.dataset.rogueUiItem === src) return;
  image.src = src;
  image.alt = label || "";
  image.dataset.rogueUiItem = src;
  image.classList.add("rogue-ui-item-sprite");
}

function replaceStatusRow(root, selector, icons) {
  const row = root.querySelector(selector);
  if (!row) return;
  [...row.querySelectorAll(":scope > .rogue-status-item")].forEach((item, index) => {
    const meta = icons[index];
    if (meta) replaceSprite(item, meta.src, meta.label);
  });
}

function replaceRewardUtilitySprites(root) {
  root.querySelectorAll(".roguelike-reward-card").forEach((card) => {
    const title = card.querySelector("strong")?.textContent?.trim();
    if (title === "PC 박스 정리") replaceSprite(card, ITEM.pc, "PC 박스");
  });
}

function sync(root = document) {
  const screen = root.querySelector?.(".roguelike-infinite-root") || document.querySelector(".roguelike-infinite-root");
  if (!screen) return;

  replaceStatusRow(screen, ".rogue-status-sprites", [
    { src: ITEM.hp, label: "체력" },
    { src: ITEM.deck, label: "덱" },
    { src: ITEM.hand, label: "시작 손패" },
    { src: ITEM.mana, label: "시작 코스트" },
  ]);

  replaceStatusRow(screen, ".rogue-stat-row", [
    { src: ITEM.hp, label: "적 체력" },
    { src: ITEM.hand, label: "AI" },
    { src: ITEM.mana, label: "적 시작 코스트" },
  ]);

  replaceSprite(screen.querySelector(".rogue-pokemon-emblem"), ITEM.map, "소탕 지도");
  replaceSprite(screen.querySelector(".rogue-resume-panel"), ITEM.map, "진행 체크포인트");
  replaceSprite(screen.querySelector(".rogue-cycle-banner"), ITEM.cycle, "회차 돌파");
  replaceSprite(screen.querySelector(".rogue-account-reward-money"), ITEM.money, "보유 재화");
  replaceSprite(screen.querySelector(".rogue-death-settlement"), ITEM.recover, "런 종료");
  replaceRewardUtilitySprites(screen);
}

let queued = false;
function queueSync() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    sync(document);
  });
}

function start() {
  queueSync();
  const observer = new MutationObserver(queueSync);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.body) start();
else window.addEventListener("DOMContentLoaded", start, { once: true });
