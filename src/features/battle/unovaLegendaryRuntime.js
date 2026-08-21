import { CARD_MAP } from "../../data/cards.js";
import { resolveGlaciate } from "../../engine/gameplay-balance.js";

const ROOT_ID = "unova-legendary-runtime-root";
const STYLE_ID = "unova-legendary-runtime-style";

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: relative; z-index: 2400; }
    .unova-glaciate-overlay { position: fixed; inset: 0; z-index: 2400; display: grid; place-items: center; padding: 18px; background: rgba(4, 13, 29, .76); backdrop-filter: blur(5px); }
    .unova-glaciate-panel { width: min(760px, 94vw); max-height: min(680px, 88vh); overflow: auto; border: 1px solid rgba(181, 224, 255, .68); border-radius: 22px; padding: 20px; color: #f6fbff; background: linear-gradient(160deg, rgba(24, 54, 91, .98), rgba(11, 25, 49, .98)); box-shadow: 0 24px 70px rgba(0, 0, 0, .48); }
    .unova-glaciate-panel h2 { margin: 0 0 6px; font-size: 24px; }
    .unova-glaciate-panel p { margin: 0 0 16px; color: #cce8ff; }
    .unova-glaciate-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; }
    .unova-glaciate-card { min-height: 116px; border: 1px solid rgba(186, 225, 255, .46); border-radius: 14px; padding: 12px; text-align: left; color: #f8fcff; background: rgba(10, 31, 58, .88); cursor: pointer; transition: transform .14s ease, border-color .14s ease, background .14s ease; }
    .unova-glaciate-card:hover { transform: translateY(-3px); border-color: #d9f2ff; background: rgba(22, 58, 94, .96); }
    .unova-glaciate-card[disabled] { opacity: .42; cursor: default; transform: none; }
    .unova-glaciate-card strong { display: block; margin-bottom: 6px; font-size: 15px; }
    .unova-glaciate-card span { display: block; font-size: 11px; line-height: 1.4; opacity: .86; }
    .unova-sealed-hand-hud { position: fixed; left: 50%; bottom: 112px; z-index: 2250; transform: translateX(-50%); max-width: min(680px, 92vw); padding: 8px 12px; border: 1px solid rgba(182, 224, 255, .68); border-radius: 999px; color: #eef9ff; background: rgba(24, 55, 91, .94); box-shadow: 0 8px 26px rgba(0,0,0,.3); font-size: 12px; font-weight: 800; pointer-events: none; }
    .field-unit.unova-skyla-impact-hit { animation: unova-skyla-impact-hit .56s ease both !important; }
    .unova-skyla-damage-number { position: absolute; z-index: 80; left: 50%; top: 34%; transform: translate(-50%, -50%); font-size: 24px; font-weight: 1000; color: #fff; text-shadow: 0 2px 3px #000, 0 0 12px rgba(150, 220, 255, .9); pointer-events: none; animation: unova-skyla-damage-number .75s ease-out forwards; }
    @keyframes unova-skyla-impact-hit { 0% { transform: translate(0, 0) rotate(0); filter: brightness(1); } 22% { transform: translate(-7px, 2px) rotate(-2deg); filter: brightness(1.7); } 45% { transform: translate(7px, -2px) rotate(2deg); } 70% { transform: translate(-3px, 1px) rotate(-1deg); } 100% { transform: translate(0, 0) rotate(0); filter: brightness(1); } }
    @keyframes unova-skyla-damage-number { 0% { opacity: 0; transform: translate(-50%, -20%) scale(.65); } 20% { opacity: 1; transform: translate(-50%, -55%) scale(1.18); } 100% { opacity: 0; transform: translate(-50%, -130%) scale(.92); } }
    @media (max-width: 720px) { .unova-glaciate-panel { padding: 14px; border-radius: 16px; } .unova-glaciate-panel h2 { font-size: 20px; } .unova-glaciate-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .unova-sealed-hand-hud { bottom: 88px; font-size: 10px; } }
  `;
  document.head.appendChild(style);
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

function cardLabel(handCard) {
  const card = CARD_MAP[handCard?.cardId];
  if (!card) return { name: "알 수 없는 카드", meta: "" };
  const kind = card.kind === "pokemon" ? card.type : card.type || card.kind;
  return {
    name: card.name,
    meta: `${card.cost ?? 0} 에너지 · ${kind || "카드"}`,
    text: card.text || (card.ability ? "특성 카드" : ""),
  };
}

function renderLegendaryState(state = window.__pokeUnovaLegendaryState) {
  if (!document.body) return;
  ensureStyle();
  const root = ensureRoot();
  root.replaceChildren();
  const game = state?.game;
  if (!game?.players) return;

  const sealed = (game.players.player?.hand || []).filter(
    (entry) => entry._glaciateSealedByUid,
  );
  if (sealed.length) {
    const hud = document.createElement("div");
    hud.className = "unova-sealed-hand-hud";
    hud.textContent = `❄ 큐레무 봉인: ${sealed
      .map((entry) => cardLabel(entry).name)
      .join(", ")} · 큐레무가 필드에 있는 동안 사용 불가`;
    root.appendChild(hud);
  }

  const pending = game.pendingGlaciate;
  if (!pending || pending.side !== "player") return;

  const overlay = document.createElement("div");
  overlay.className = "unova-glaciate-overlay";
  const panel = document.createElement("div");
  panel.className = "unova-glaciate-panel";
  const title = document.createElement("h2");
  title.textContent = "❄ 큐레무의 얼어붙은세계";
  const copy = document.createElement("p");
  const remaining = Math.max(
    0,
    Number(pending.count || 0) - (pending.selected?.length || 0),
  );
  copy.textContent = `상대 손패가 공개됐다. 봉인할 카드 ${remaining}장을 더 선택하세요.`;
  const cards = document.createElement("div");
  cards.className = "unova-glaciate-cards";

  for (const uid of pending.targets || []) {
    const handCard = game.players[pending.targetSide]?.hand?.find(
      (entry) => entry.uid === uid,
    );
    if (!handCard) continue;
    const info = cardLabel(handCard);
    const selected = pending.selected?.includes(uid);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "unova-glaciate-card";
    button.disabled = !!selected;
    button.innerHTML = `<strong>${selected ? "🔒 " : ""}${info.name}</strong><span>${info.meta}</span><span>${info.text || ""}</span>`;
    button.addEventListener("click", () => {
      if (button.disabled) return;
      resolveGlaciate(game, "player", uid);
      renderLegendaryState(window.__pokeUnovaLegendaryState);
    });
    cards.appendChild(button);
  }

  panel.append(title, copy, cards);
  overlay.appendChild(panel);
  root.appendChild(overlay);
}

function normalizeSkylaCopy(root = document) {
  const nodes = root.querySelectorAll?.(
    ".battle-gimmick-copy p, .battle-gimmick-hint",
  );
  nodes?.forEach((node) => {
    let text = node.textContent || "";
    if (!text.includes("이륙")) return;
    text = text
      .replace("풍란의 턴 종료 시 포켓몬 하나가 이륙합니다.", "풍란의 턴 종료 시 포켓몬 하나가 공중날기 상태가 됩니다.")
      .replace("이륙한 포켓몬은", "공중날기 상태의 포켓몬은")
      .replace("다음 풍란 턴 시작에 착륙하며", "다음 풍란 턴 시작에 공중날기로 착지하며")
      .replace("이륙했다면", "공중날기 상태라면");
    node.textContent = text;
  });
}

function playSkylaImpact(event) {
  for (const impact of event.detail?.impacts || []) {
    const element = document.querySelector(
      `.battle.battle-board .field-unit[data-uid="${impact.targetUid}"]`,
    );
    if (!element) continue;
    element.classList.remove("unova-skyla-impact-hit");
    void element.offsetWidth;
    element.classList.add("unova-skyla-impact-hit");
    const damage = document.createElement("div");
    damage.className = "unova-skyla-damage-number";
    damage.textContent = `-${impact.amount}`;
    element.appendChild(damage);
    window.setTimeout(() => {
      element.classList.remove("unova-skyla-impact-hit");
      damage.remove();
    }, 780);
  }
}

function start() {
  ensureStyle();
  renderLegendaryState();
  normalizeSkylaCopy();
  window.addEventListener("unova-legendary-state-change", (event) => {
    renderLegendaryState(event.detail);
  });
  window.addEventListener("skyla-airborne-impact", playSkylaImpact);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) normalizeSkylaCopy(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
