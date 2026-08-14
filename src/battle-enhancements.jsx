import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TRAINER_MAP } from "./data/trainers.js";
import { playSfx } from "./audio.js";

const GIMMICK_GUIDES = {
  mine_collapse: {
    fieldName: "무쇠탄갱",
    slides: [
      {
        eyebrow: "배틀필드",
        title: "무쇠탄갱",
        lines: [
          "플레이어 필드가 바위로 봉쇄된 상태로 시작합니다.",
          "플레이어 턴이 지날수록 바위가 차례로 무너져 사용할 수 있는 필드가 넓어집니다.",
        ],
      },
      {
        eyebrow: "시그니처",
        title: "강석의 램펄드 · 양날박치기",
        lines: [
          "플레이어 필드에 남아 있는 바위 1개당 이번 공격의 피해가 +1 증가합니다.",
          "공격 후에는 반동 피해를 받습니다. 초반을 버텨 바위를 줄이는 것이 핵심입니다.",
        ],
      },
    ],
  },
  eternal_vines: {
    fieldName: "영원의 숲",
    slides: [
      {
        eyebrow: "배틀필드",
        title: "영원의 숲",
        lines: [
          "유채의 턴이 끝날 때 플레이어 필드의 빈 칸에 덩굴이 자라납니다.",
          "덩굴은 HP 2의 장애물로 필드 한 칸을 차지하며, 포켓몬으로 직접 공격해 제거할 수 있습니다.",
        ],
      },
      {
        eyebrow: "시그니처",
        title: "유채의 로즈레이드 · 꽃보라",
        lines: [
          "플레이어 필드에 덩굴이 하나라도 남아 있으면 로즈레이드의 공격력이 +2 증가합니다.",
          "덩굴을 제거하면 필드 공간을 되찾는 동시에 로즈레이드의 화력도 낮출 수 있습니다.",
        ],
      },
    ],
  },
};

function GimmickHelp({ trainer }) {
  const guide = GIMMICK_GUIDES[trainer?.gimmick];
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    setOpen(false);
    setSlide(0);
  }, [trainer?.id]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowLeft") {
        setSlide((index) =>
          index === 0 ? guide.slides.length - 1 : index - 1,
        );
      } else if (event.key === "ArrowRight") {
        setSlide((index) => (index + 1) % guide.slides.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, guide]);

  if (!trainer || trainer.region !== "sinnoh" || !guide) {
    return null;
  }

  const current = guide.slides[slide];

  const moveSlide = (direction) => {
    playSfx("click");
    setSlide((index) => {
      const length = guide.slides.length;
      return (index + direction + length) % length;
    });
  };

  return (
    <>
      <button
        type="button"
        className="battle-gimmick-help-btn"
        aria-label={`${guide.fieldName} 기믹 설명`}
        title="체육관 기믹 설명"
        onClick={() => {
          playSfx("click");
          setSlide(0);
          setOpen(true);
        }}
      >
        ?
      </button>

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

            <div className="battle-gimmick-viewport">
              <div
                className="battle-gimmick-track"
                style={{ transform: `translateX(-${slide * 100}%)` }}
              >
                {guide.slides.map((item) => (
                  <section className="battle-gimmick-slide" key={item.title}>
                    <span className="battle-gimmick-eyebrow">{item.eyebrow}</span>
                    <h2>{item.title}</h2>
                    <div className="battle-gimmick-copy">
                      {item.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="battle-gimmick-slider-controls">
              <button
                type="button"
                aria-label="이전 설명"
                onClick={() => moveSlide(-1)}
              >
                ‹
              </button>

              <div className="battle-gimmick-dots" aria-label="설명 페이지">
                {guide.slides.map((item, index) => (
                  <button
                    type="button"
                    key={item.title}
                    className={index === slide ? "active" : ""}
                    aria-label={`${index + 1}페이지`}
                    onClick={() => {
                      playSfx("click");
                      setSlide(index);
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                aria-label="다음 설명"
                onClick={() => moveSlide(1)}
              >
                ›
              </button>
            </div>

            <div className="battle-gimmick-page-count">
              {slide + 1} / {guide.slides.length}
            </div>
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
