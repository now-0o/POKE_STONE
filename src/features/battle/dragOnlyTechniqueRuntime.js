import { CARD_MAP } from "../../data/cards.js";
import { spellNeedsTarget } from "../../engine/engine.js";

function cardFromHandElement(element) {
  const cardElement = element?.closest?.(
    ".battle-board > .hand .hand-card-wrap > .hand-card",
  );
  if (!cardElement) return null;

  const name = cardElement.querySelector(".card-name")?.textContent?.trim();
  if (!name) return null;

  return (
    Object.values(CARD_MAP).find(
      (card) => card?.name === name && card.kind === "spell" && card.type === "기술",
    ) || null
  );
}

function blockTargetlessTechniqueClick(event) {
  const card = cardFromHandElement(event.target);
  if (!card || spellNeedsTarget(card)) return;

  // 대상 선택이 없는 기술은 단순 클릭/터치로 발동시키지 않는다.
  // Battle.jsx의 기존 resolveDrop 경로를 통해 필드/보드로 드래그해서
  // 놓았을 때만 실제 playCard가 실행되도록 클릭만 차단한다.
  event.preventDefault();
  event.stopImmediatePropagation();
}

if (typeof document !== "undefined") {
  document.addEventListener("click", blockTargetlessTechniqueClick, true);
}
