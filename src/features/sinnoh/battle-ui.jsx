import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TRAINER_MAP } from "../../data/trainers.js";
import { playSfx } from "../../audio.js";

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
  dojo_combo: {
    fieldName: "격투도장",
    lines: [
      "자두가 같은 턴에 공격을 이어갈수록 연속공격 콤보가 강해집니다.",
      "첫 공격은 추가 피해가 없고, 2번째 +1 · 3번째 +2 · 4번째 이후 +3의 추가 피해를 줍니다.",
      "자두의 포켓몬이 하나라도 기절하면 현재 콤보는 즉시 초기화됩니다.",
    ],
    hint: "힌트: 공격 순서를 그대로 내주지 말고, 위협적인 포켓몬 하나를 먼저 쓰러뜨려 콤보를 끊어보세요.",
  },
  rising_tide: {
    fieldName: "들판체육관",
    lines: [
      "플레이어의 3번째 턴과 6번째 턴에 수위가 상승합니다.",
      "수위가 오를 때마다 플레이어가 사용할 수 있는 최대 필드가 6칸 → 5칸 → 4칸으로 줄어듭니다.",
      "이미 필드에 나와 있는 포켓몬은 사라지지 않지만, 빈자리가 생기기 전까지 새 포켓몬을 추가하기 어려워집니다.",
    ],
    hint: "힌트: 장기전으로 갈수록 필드 전개가 불리해집니다. 수위가 오르기 전에 빠르게 주도권을 잡으세요.",
  },
};

function GimmickHelp({ trainer }) {
  const guide = GIMMICK_GUIDES[trainer?.gimmick];
  const [open, setOpen] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [mayleneCombo, setMayleneCombo] = useState(0);

  useEffect(() => {
    setOpen(false);
    setShowTip(true);

    const timer = window.setTimeout(() => setShowTip(false), 4200);
    return () => window.clearTimeout(timer);
  }, [trainer?.id]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (trainer?.gimmick !== "dojo_combo") {
      setMayleneCombo(0);
      return undefined;
    }

    const readCombo = () => {
      const raw = Number(document.body.dataset.mayleneCombo || 0);
      return Number.isFinite(raw) ? Math.max(0, raw) : 0;
    };

    const onComboChange = (event) => {
      const next = Number(event.detail?.combo);
      setMayleneCombo(Number.isFinite(next) ? Math.max(0, next) : readCombo());
    };

    setMayleneCombo(readCombo());
    window.addEventListener("maylene-combo-change", onComboChange);

    return () => window.removeEventListener("maylene-combo-change", onComboChange);
  }, [trainer?.id, trainer?.gimmick]);

  if (!trainer || trainer.region !== "sinnoh" || !guide) return null;

  const comboBonus = Math.min(3, mayleneCombo);
  const comboMaxed = mayleneCombo >= 3;

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

      {trainer.gimmick === "dojo_combo" && (
        <div
          className={`maylene-combo-hud ${comboMaxed ? "is-maxed" : ""}`}
          aria-live="polite"
        >
          <span className="maylene-combo-label">격투도장</span>
          <strong>{mayleneCombo} COMBO</strong>
          <span className="maylene-combo-next">다음 공격 +{comboBonus}</span>
        </div>
      )}

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

function clearSinnohBattleState() {
  activeTrainerId = null;
  delete document.body.dataset.battlefield;
  delete document.body.dataset.wakeFlood;
  delete document.body.dataset.mayleneCombo;
  enhancementRoot?.render(null);
}

function syncSinnohBattleUi() {
  const battle = document.querySelector(".battle.battle-board[data-trainer]");
  const trainerId = battle?.dataset.trainer || null;

  if (!battle || !trainerId) {
    if (activeTrainerId !== null) clearSinnohBattleState();
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

  if (trainer?.gimmick !== "rising_tide") delete document.body.dataset.wakeFlood;
  if (trainer?.gimmick !== "dojo_combo") delete document.body.dataset.mayleneCombo;

  if (activeTrainerId === trainerId) return;

  activeTrainerId = trainerId;
  ensureEnhancementRoot().render(<GimmickHelp trainer={trainer} />);
}

function startSinnohBattleUi() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startSinnohBattleUi, { once: true });
    return;
  }

  syncSinnohBattleUi();

  const observer = new MutationObserver(syncSinnohBattleUi);
  observer.observe(document.body, { childList: true, subtree: true });
}

startSinnohBattleUi();
