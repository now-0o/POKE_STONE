import React from "react";
import { createRoot } from "react-dom/client";
import RoguelikeInfiniteMode from "./RoguelikeInfiniteMode.jsx";
import { readRoguelikeSave, ROGUELIKE_SAVE_EVENT } from "./runState.js";
import "./roguelike.css";
import "./reward-rarity.css";
import "./battle-overrides.css";
import "./infinite-v2.css";

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
  roguelikeRoot.render(<RoguelikeInfiniteMode onExit={closeRoguelike} />);
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

function buttonCopy() {
  const { run, stats } = readRoguelikeSave();
  if (run?.status === "dead") {
    return {
      desc: `STAGE ${run.pendingDeathReward?.reachedStage || run.stage + 1} · 보상 정산 대기`,
      action: "정산 ▶",
    };
  }
  if (run) {
    return {
      desc: `진행 중 · STAGE ${run.stage + 1} · 최고 ${stats.bestStage || run.stage + 1}`,
      action: "계속 ▶",
    };
  }
  return {
    desc: stats.bestStage > 0
      ? `무한 악의 조직 소탕 · 최고 STAGE ${stats.bestStage}`
      : "무한 악의 조직 소탕 · 진행 자동 저장",
    action: "도전 ▶",
  };
}

function syncMenuButton() {
  if (roguelikeRoot) return;

  const grid = modeSelectionGrid();
  const existing = document.getElementById(BUTTON_ID);

  if (!grid) {
    existing?.remove();
    return;
  }

  const copy = buttonCopy();
  if (existing?.parentElement === grid) {
    const desc = existing.querySelector(".region-desc");
    const go = existing.querySelector(".region-go");
    if (desc) desc.textContent = copy.desc;
    if (go) go.textContent = copy.action;
    return;
  }
  existing?.remove();

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.className = "region-card region-roguelike";
  button.innerHTML = `
    <span class="region-info">
      <span class="region-name">로그라이크</span>
      <span class="region-sub">INFINITE ROGUELIKE</span>
      <span class="region-desc"></span>
    </span>
    <span class="region-go"></span>
  `;
  button.querySelector(".region-desc").textContent = copy.desc;
  button.querySelector(".region-go").textContent = copy.action;
  button.addEventListener("click", openRoguelike);
  grid.appendChild(button);
}

function start() {
  syncMenuButton();
  const observer = new MutationObserver(() => window.requestAnimationFrame(syncMenuButton));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener(ROGUELIKE_SAVE_EVENT, syncMenuButton);
}

if (document.body) start();
else window.addEventListener("DOMContentLoaded", start, { once: true });
