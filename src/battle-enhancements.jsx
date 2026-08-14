import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TRAINER_MAP } from "./data/trainers.js";
import { playSfx } from "./audio.js";

const GIMMICK_GUIDES = {
  mine_collapse: {
    fieldName: "무쇠탄갱",
    lines: [
      "플레이어 필드가 바위로 봉쇄된 상태로 시작합니다.",
      "플레이어 턴이 지날수록 바위가 차례로 무너져 사용할 수 있는 필드가 넓어집니다.",
    ],
    hint: "힌트: 남아 있는 바위가 많을수록 강석의 시그니처 포켓몬이 강해지니 주의하세요.",
  },
  eternal_vines: {
    fieldName: "영원의 숲",
    lines: [
      "유채의 턴이 끝날 때 플레이어 필드의 빈 칸에 덩굴이 자라납니다.",
      "덩굴은 HP 2의 장애물로 필드 한 칸을 차지하며, 포켓몬으로 직접 공격해 제거할 수 있습니다.",
    ],
    hint: "힌트: 덩굴을 오래 방치하면 전투가 불리해집니다. 가능하면 빠르게 제거하세요.",
  },
};

function GimmickHelp({ trainer }) {
  const guide = GIMMICK_GUIDES[trainer?.gimmick];
  const [open, setOpen] = useState(false);
  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    setOpen(false);
    setShowTip(true);

    const timer = window.setTimeout(() => {
      setShowTip(false);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [trainer?.id]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!trainer || trainer.region !== "sinnoh" || !guide) {
    return null;
  }

  return (
    <>
      <div className="battle-gimmick-help-wrap">
        {showTip && !open && (
          <div className="battle-gimmick-entry-tip" role="status">
            ? 버튼을 눌러 배틀필드 효과를 확인하세요
          </div>
        )}

        <button
          type="button"
          className="battle-gimmick-help-btn"
          aria-label={`${guide.fieldName} 기믹 설명`}
          title="체육관 기믹 설명"
          onClick={() => {
            playSfx("click");
            setShowTip(false);
            setOpen(true);
          }}
        >
          ?
        </button>
      </div>

      {open && (
        <div
          className="battle-gimmick-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              playSfx("click");
              setOpen(false);
            }
          }}
        >
          <div
            className="battle-gimmick-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${trainer.name} 체육관 기믹`}
          >
            <div className="battle-gimmick-modal-head">
              <div>
                <span>신오 체육관 기믹</span>
                <strong>{trainer.name}</strong>
              </div>
              <button
                type="button"
                className="battle-gimmick-close"
                aria-label="닫기"
                onClick={() => {
                  playSfx("click");
                  setOpen(false);
                }}
              >
                ×
              </button>
            </div>

            <section className="battle-gimmick-slide battle-gimmick-single">
              <span className="battle-gimmick-eyebrow">배틀필드</span>
              <h2>{guide.fieldName}</h2>

              <div className="battle-gimmick-copy">
                {guide.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div className="battle-gimmick-hint">{guide.hint}</div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

let enhancementRoot = null;
let enhancementHost = null;
let activeTrainerId = null;

function ensureEnhancementRoot() {
  if (enhancementRoot) return enhancementRoot;

  enhancementHost = document.createElement("div");
  enhancementHost.id = "battle-enhancement-root";
  document.body.appendChild(enhancementHost);
  enhancementRoot = createRoot(enhancementHost);

  return enhancementRoot;
}

function syncBattleEnhancements() {
  const battle = document.querySelector(".battle.battle-board[data-trainer]");
  const trainerId = battle?.dataset.trainer || null;

  if (!battle || !trainerId) {
    if (activeTrainerId !== null) {
      activeTrainerId = null;
      delete document.body.dataset.battlefield;
      enhancementRoot?.render(null);
    }
    return;
  }

  const trainer = TRAINER_MAP[trainerId];

  if (trainer?.battlefield) {
    battle.dataset.battlefield = trainer.battlefield;
    document.body.dataset.battlefield = trainer.battlefield;
  } else {
    delete battle.dataset.battlefield;
    delete document.body.dataset.battlefield;
  }

  if (activeTrainerId === trainerId) {
    return;
  }

  activeTrainerId = trainerId;
  ensureEnhancementRoot().render(<GimmickHelp trainer={trainer} />);
}

function startBattleEnhancements() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startBattleEnhancements, {
      once: true,
    });
    return;
  }

  syncBattleEnhancements();

  const observer = new MutationObserver(syncBattleEnhancements);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

startBattleEnhancements();
