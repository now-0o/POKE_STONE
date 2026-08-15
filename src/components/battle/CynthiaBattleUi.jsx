import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CARD_MAP } from "../../data/cards.js";

const PARTY_SIZE = 6;

const MEMBER_GUIDE = [
  ["난천의 화강돌", "원한 · 아픔나누기로 기술 비용과 체력을 압박"],
  ["난천의 로즈레이드", "독압정 설치 · 돌아와! 사용 시 광합성 회복"],
  ["난천의 트리토돈", "돌아와!마다 비축하기 · 기술 피해에 미러코트"],
  ["난천의 루카리오", "신속으로 돌진 · 교체 등장 첫 공격 +2 · 저체력 기사회생"],
  ["난천의 밀로틱", "공격력 감소에 승기 · 턴 종료 시 아쿠아링 회복"],
  ["난천의 한카리아스", "마지막까지 대기 · 칼춤과 드래곤다이브를 가진 최종 에이스"],
];

function readState() {
  const remaining = Number(document.body.dataset.cynthiaPartyRemaining || 0);
  const activeCardId = document.body.dataset.cynthiaActive || null;
  const toxicSpikes = Number(document.body.dataset.cynthiaToxicSpikes || 0);

  return {
    remaining: Number.isFinite(remaining) ? Math.max(0, remaining) : 0,
    activeCardId,
    toxicSpikes: Number.isFinite(toxicSpikes) ? Math.max(0, toxicSpikes) : 0,
  };
}

function CynthiaHud() {
  const [state, setState] = useState(readState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = (event) => {
      if (event?.detail) {
        setState({
          remaining: Math.max(0, Number(event.detail.remaining) || 0),
          activeCardId: event.detail.activeCardId || null,
          toxicSpikes: Math.max(0, Number(event.detail.toxicSpikes) || 0),
        });
      } else {
        setState(readState());
      }
    };

    window.addEventListener("cynthia-party-change", sync);
    window.addEventListener("battle-turn-change", sync);
    sync();

    return () => {
      window.removeEventListener("cynthia-party-change", sync);
      window.removeEventListener("battle-turn-change", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const activeName = state.activeCardId
    ? CARD_MAP[state.activeCardId]?.name || "교체 준비 중"
    : "교체 준비 중";
  const fainted = Math.max(0, PARTY_SIZE - state.remaining);

  return (
    <>
      <div className="cynthia-hud-wrap" aria-live="polite">
        <div className="cynthia-party-hud">
          <span className="cynthia-party-title">CHAMPION PARTY</span>
          <div className="cynthia-party-pips" aria-label={`남은 포켓몬 ${state.remaining}마리`}>
            {Array.from({ length: PARTY_SIZE }, (_, index) => (
              <span
                key={index}
                className={`cynthia-party-pip ${index < fainted ? "is-fainted" : ""}`}
              />
            ))}
          </div>
          <strong>{state.remaining} / {PARTY_SIZE}</strong>
          <span className="cynthia-active-name">ACTIVE · {activeName}</span>
          {state.toxicSpikes > 0 && (
            <span className="cynthia-hazard">독압정 ×{state.toxicSpikes}</span>
          )}
        </div>

        <button
          type="button"
          className="battle-gimmick-help-btn cynthia-help-btn"
          aria-label="난천 챔피언 배틀 규칙"
          title="챔피언 배틀 규칙"
          onClick={() => setOpen(true)}
        >
          ?
        </button>
      </div>

      {open && (
        <div
          className="battle-gimmick-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="battle-gimmick-dialog cynthia-guide-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="난천 챔피언 배틀 규칙"
          >
            <div className="battle-gimmick-modal-head">
              <div>
                <span>신오 챔피언전</span>
                <strong>난천 · 챔피언 배틀</strong>
              </div>
              <button
                type="button"
                className="battle-gimmick-close"
                aria-label="닫기"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <section className="battle-gimmick-slide battle-gimmick-single cynthia-guide-body">
              <span className="battle-gimmick-eyebrow">SPECIAL RULE</span>
              <h2>6 Pokémon · 1 ACTIVE</h2>

              <div className="battle-gimmick-copy">
                <p>난천은 일반 드로우를 하지 않고 여섯 시그니처 포켓몬만 사용합니다.</p>
                <p>필드에는 한 번에 한 마리만 ACTIVE로 존재하며, 여섯 마리를 모두 쓰러뜨려야 승리합니다.</p>
                <p>난천 턴 시작마다 랜덤 기술 또는 도구 카드 1장을 받고, 손에 없다면 0코스트 「돌아와!」를 받습니다.</p>
                <p>「돌아와!」로 교체된 포켓몬은 받은 피해가 회복되지 않고 현재 HP를 그대로 유지합니다.</p>
              </div>

              <div className="cynthia-member-guide">
                {MEMBER_GUIDE.map(([name, text]) => (
                  <div key={name}>
                    <strong>{name}</strong>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="battle-gimmick-hint">
                한카리아스는 다른 다섯 포켓몬이 모두 쓰러지기 전까지 출전하지 않습니다.
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

let host = null;
let root = null;
let mounted = false;

function ensureRoot() {
  if (root) return root;

  host = document.createElement("div");
  host.id = "cynthia-battle-ui-root";
  document.body.appendChild(host);
  root = createRoot(host);
  return root;
}

function syncCynthiaBattleUi() {
  const active = Boolean(
    document.querySelector('.battle.battle-board[data-trainer="sinnoh_cynthia"]'),
  );

  if (active && !mounted) {
    mounted = true;
    ensureRoot().render(<CynthiaHud />);
    return;
  }

  if (!active && mounted) {
    mounted = false;
    root?.render(null);
  }
}

function startCynthiaBattleUi() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startCynthiaBattleUi, { once: true });
    return;
  }

  syncCynthiaBattleUi();
  const observer = new MutationObserver(syncCynthiaBattleUi);
  observer.observe(document.body, { childList: true, subtree: true });
}

startCynthiaBattleUi();
