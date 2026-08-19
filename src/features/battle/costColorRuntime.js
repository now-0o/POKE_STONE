import { CARD_MAP } from "../../data/cards.js";

const CARD_BY_NAME = new Map(
  Object.values(CARD_MAP)
    .filter((card) => card?.name)
    .map((card) => [card.name, card]),
);

function syncCostColors() {
  document
    .querySelectorAll(".battle.battle-board .hand-card")
    .forEach((cardEl) => {
      const name = cardEl.querySelector(".card-name")?.textContent?.trim();
      const costEl = cardEl.querySelector(".card-cost");
      if (!name || !costEl) return;

      const card = CARD_BY_NAME.get(name);
      const shownCost = Number(costEl.textContent?.trim());
      if (!card || !Number.isFinite(shownCost)) {
        costEl.classList.remove("cost-increased", "cost-reduced");
        return;
      }

      costEl.classList.toggle("cost-increased", shownCost > card.cost);
      costEl.classList.toggle("cost-reduced", shownCost < card.cost);
    });
}

function startCostColorRuntime() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startCostColorRuntime, { once: true });
    return;
  }

  syncCostColors();

  const observer = new MutationObserver(syncCostColors);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener("unova-gym-state-change", syncCostColors);
}

startCostColorRuntime();
