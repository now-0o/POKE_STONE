import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const MAX_SPIKES = 2;

function readView() {
  const field = document.querySelector(
    '.battle.battle-board[data-trainer="sinnoh_cynthia"] .my-field',
  );
  const count = Math.max(
    0,
    Math.min(MAX_SPIKES, Number(document.body.dataset.cynthiaToxicSpikes) || 0),
  );

  if (!field || count <= 0) {
    return { visible: false, count: 0, left: 0, top: 0 };
  }

  const rect = field.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { visible: false, count: 0, left: 0, top: 0 };
  }

  return {
    visible: true,
    count,
    left: Math.round(rect.left + 14),
    top: Math.round(rect.top),
  };
}

function sameView(a, b) {
  return (
    a.visible === b.visible &&
    a.count === b.count &&
    a.left === b.left &&
    a.top === b.top
  );
}

function CynthiaToxicSpikesFieldUi() {
  const [view, setView] = useState(readView);

  useEffect(() => {
    let frame = null;

    const sync = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const next = readView();
        setView((current) => (sameView(current, next) ? current : next));
      });
    };

    window.addEventListener("cynthia-party-change", sync);
    window.addEventListener("battle-turn-change", sync);
    window.addEventListener("resize", sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-cynthia-toxic-spikes"],
    });

    sync();

    return () => {
      window.removeEventListener("cynthia-party-change", sync);
      window.removeEventListener("battle-turn-change", sync);
      window.removeEventListener("resize", sync);
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  if (!view.visible) return null;

  return (
    <div
      className="cynthia-toxic-spikes-field-ui"
      style={{ left: `${view.left}px`, top: `${view.top}px` }}
      role="status"
      aria-label={`플레이어 필드 독압정 ${view.count}개 남음`}
    >
      <div className="cynthia-toxic-spikes-title">
        <span className="cynthia-toxic-spikes-mark">독</span>
        <strong>독압정</strong>
      </div>

      <div className="cynthia-toxic-spikes-icons" aria-hidden="true">
        {Array.from({ length: MAX_SPIKES }, (_, index) => (
          <span
            key={index}
            className={`cynthia-toxic-spike ${index < view.count ? "is-active" : "is-used"}`}
          />
        ))}
      </div>

      <div className="cynthia-toxic-spikes-copy">
        <strong>{view.count}회 남음</strong>
        <span>기본 포켓몬 소환 시 독</span>
      </div>
    </div>
  );
}

let host = null;
let root = null;

function startCynthiaToxicSpikesUi() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startCynthiaToxicSpikesUi, {
      once: true,
    });
    return;
  }

  if (!host) {
    host = document.createElement("div");
    host.id = "cynthia-toxic-spikes-ui-root";
    document.body.appendChild(host);
  }

  if (!root) root = createRoot(host);
  root.render(<CynthiaToxicSpikesFieldUi />);
}

startCynthiaToxicSpikesUi();
