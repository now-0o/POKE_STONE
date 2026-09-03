import React from "react";
import { createRoot } from "react-dom/client";
import RoguelikeMode from "./RoguelikeMode.jsx";
import "./roguelike.css";
import "./reward-rarity.css";
import "./battle-overrides.css";

const BUTTON_ID = "pokestone-roguelike-menu-card";
const ROOT_ID = "pokestone-roguelike-root";

let roguelikeRoot = null;
let host = null;

function closeRoguelike() {
  roguelikeRoot?.unmount();
  roguelikeRoot = null;
  host?.remove();
  host = null;
  document.body.classList.remove("roguelike-active");
  window.requestAnimationFrame(syncMenuButton);
}

function openRoguelike() {
  if (roguelikeRoot) return;

  host = document.createElement("div");
  host.id = ROOT_ID;
  document.body.appendChild(host);
  roguelikeRoot = createRoot(host);
  roguelikeRoot.render(<RoguelikeMode onExit={closeRoguelike} />);
}

function modeSelectionGrid() {
  const titles = [...document.querySelectorAll(".main-menu .region-title")];
  const title = titles.find((node) =>
    (node.textContent || "").includes("게임 모드를 선택"),
  );
  if (!title) return null;

  const grid = title.nextElementSibling;
  if (!grid?.classList?.contains("region-select")) return null;
  return grid;
}

function syncMenuButton() {
  if (roguelikeRoot) return;

  const grid = modeSelectionGrid();
  const existing = document.getElementById(BUTTON_ID);

  if (!grid) {
    existing?.remove();
    return;
  }

  if (existing?.parentElement === grid) return;
  existing?.remove();

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.className = "region-card region-roguelike";
  button.innerHTML = `
    <span class="region-info">
      <span class="region-name">로그라이크</span>
      <span class="region-sub">ROGUELIKE</span>
      <span class="region-desc">초기 덱으로 시작 · 악의 조직 연속 소탕</span>
    </span>
    <span class="region-go">도전 ▶</span>
  `;
  button.addEventListener("click", openRoguelike);
  grid.appendChild(button);
}

function start() {
  syncMenuButton();
  const observer = new MutationObserver(() => window.requestAnimationFrame(syncMenuButton));
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.body) start();
else window.addEventListener("DOMContentLoaded", start, { once: true });
