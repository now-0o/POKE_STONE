import React, { useEffect, useMemo, useState } from "react";
import { Sprite } from "../../components/Card.jsx";
import { CARD_MAP } from "../../data/cards.js";
import RoguelikeInfiniteMode from "./RoguelikeInfiniteMode.jsx";
import {
  readRoguelikeSave,
  restoreRoguelikePcCard,
  ROGUELIKE_SAVE_EVENT,
} from "./runState.js";

function groupedStorage(storage) {
  const counts = new Map();
  (storage || []).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  return [...counts.entries()]
    .map(([id, count]) => ({ card: CARD_MAP[id], count }))
    .filter((entry) => entry.card)
    .sort(
      (a, b) =>
        (a.card.cost || 0) - (b.card.cost || 0) ||
        a.card.name.localeCompare(b.card.name),
    );
}

export default function RoguelikeShell({ onExit }) {
  const [snapshot, setSnapshot] = useState(() => readRoguelikeSave());
  const [boxOpen, setBoxOpen] = useState(false);
  const [modeKey, setModeKey] = useState(0);

  useEffect(() => {
    const refresh = () => setSnapshot(readRoguelikeSave());
    window.addEventListener(ROGUELIKE_SAVE_EVENT, refresh);
    return () => window.removeEventListener(ROGUELIKE_SAVE_EVENT, refresh);
  }, []);

  const run = snapshot.run;
  const stored = useMemo(() => groupedStorage(run?.storage), [run?.storage]);
  const canManageBox =
    run?.status === "active" &&
    run?.phase === "preview" &&
    !run?.battleStarted &&
    stored.length > 0;

  function restoreCard(cardId) {
    const result = restoreRoguelikePcCard(cardId);
    if (!result.ok) return;

    setBoxOpen(false);
    setSnapshot(readRoguelikeSave());
    setModeKey((value) => value + 1);

    // InfiniteMode는 저장된 런을 remount하면 resume 화면부터 시작한다.
    // PC 복귀 직후에는 바로 기존 스테이지 준비 화면으로 돌아간다.
    window.setTimeout(() => {
      document.querySelector(".rogue-resume-panel .btn-primary")?.click();
    }, 80);
  }

  return (
    <>
      <RoguelikeInfiniteMode key={modeKey} onExit={onExit} />

      {canManageBox && (
        <button
          type="button"
          className="rogue-pcbox-fab"
          onClick={() => setBoxOpen(true)}
          aria-label={`PC 박스 ${run.storage.length}장`}
        >
          <img src="/sprites/items/poke-ball.png" alt="" draggable={false} />
          <span>PC 박스</span>
          <strong>{run.storage.length}</strong>
        </button>
      )}

      {boxOpen && (
        <div className="rogue-pcbox-overlay" onClick={() => setBoxOpen(false)}>
          <section className="rogue-pcbox-panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <div className="rogue-pcbox-title">
                <img src="/sprites/items/poke-ball.png" alt="" draggable={false} />
                <div>
                  <span>RUN STORAGE</span>
                  <h2>PC 박스</h2>
                </div>
              </div>
              <button type="button" className="btn-ghost small" onClick={() => setBoxOpen(false)}>
                닫기
              </button>
            </header>

            <p>
              `PC 박스 정리`로 맡긴 카드입니다. 복귀시킨 카드는 현재 런 덱으로 돌아가며,
              다시 맡기려면 다음 PC 박스 정리 보상을 선택해야 합니다.
            </p>

            <div className="rogue-pcbox-grid">
              {stored.map(({ card, count }) => (
                <button
                  type="button"
                  key={card.id}
                  className="rogue-pcbox-card"
                  onClick={() => restoreCard(card.id)}
                >
                  <Sprite cardId={card.id} emoji="" size={72} />
                  <strong>{card.name}</strong>
                  <small>{card.type || card.kind} · {card.cost}코</small>
                  <span>덱으로 복귀 {count > 1 ? `· ${count}장 보관` : ""}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
