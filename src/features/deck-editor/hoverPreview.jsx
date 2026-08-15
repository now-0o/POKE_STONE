import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CARDS } from "../../data/cards.js";
import { HandCard } from "../../components/Card.jsx";

const CARD_ID_BY_NAME = new Map(CARDS.map((card) => [card.name, card.id]));
const PREVIEW_WIDTH = 279;
const PREVIEW_HEIGHT = 392;
const PREVIEW_GAP = 24;

function deckRowFromTarget(target) {
  if (!(target instanceof Element)) return null;
  return target.closest(".deck-editor .deck-row");
}

function cardIdFromRow(row) {
  const name = row?.querySelector(".deck-row-name")?.textContent?.trim();
  return name ? CARD_ID_BY_NAME.get(name) || null : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function DeckHoverPreview() {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return undefined;
    }

    const onMouseOver = (event) => {
      const row = deckRowFromTarget(event.target);
      if (!row) return;
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) {
        return;
      }

      const cardId = cardIdFromRow(row);
      if (!cardId) return;

      setPreview({ cardId, x: event.clientX, y: event.clientY });
    };

    const onMouseMove = (event) => {
      const row = deckRowFromTarget(event.target);
      if (!row) return;

      const cardId = cardIdFromRow(row);
      if (!cardId) return;

      setPreview((current) => {
        if (!current || current.cardId !== cardId) {
          return { cardId, x: event.clientX, y: event.clientY };
        }

        return {
          ...current,
          x: event.clientX,
          y: event.clientY,
        };
      });
    };

    const onMouseOut = (event) => {
      const row = deckRowFromTarget(event.target);
      if (!row) return;
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) {
        return;
      }

      setPreview(null);
    };

    const onWindowBlur = () => setPreview(null);

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  if (!preview) return null;

  let left = preview.x + PREVIEW_GAP;
  if (left + PREVIEW_WIDTH > window.innerWidth - 12) {
    left = preview.x - PREVIEW_WIDTH - PREVIEW_GAP;
  }

  left = clamp(left, 12, window.innerWidth - PREVIEW_WIDTH - 12);
  const top = clamp(
    preview.y - PREVIEW_HEIGHT / 2,
    12,
    window.innerHeight - PREVIEW_HEIGHT - 12,
  );

  return (
    <div
      className="deck-hover-preview"
      style={{ left: `${left}px`, top: `${top}px` }}
      aria-hidden="true"
    >
      <HandCard cardId={preview.cardId} playable ghost />
    </div>
  );
}

let root = null;

function startDeckHoverPreview() {
  if (!document.body || root) return;

  const host = document.createElement("div");
  host.id = "deck-hover-preview-root";
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<DeckHoverPreview />);
}

if (document.body) {
  startDeckHoverPreview();
} else {
  window.addEventListener("DOMContentLoaded", startDeckHoverPreview, { once: true });
}
