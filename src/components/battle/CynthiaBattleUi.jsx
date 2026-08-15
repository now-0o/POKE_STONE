import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CARD_MAP,
  UI_SPRITES,
  spriteUrl,
} from "../../data/cards.js";

const PARTY_SIZE = 6;
const SUMMON_MS = 1250;
let summonSeq = 0;

function normalizedActiveCardId(value) {
  if (!value || value === "none") return null;
  return value;
}

function readState() {
  const remaining = Number(document.body.dataset.cynthiaPartyRemaining || 0);
  const activeCardId = normalizedActiveCardId(
    document.body.dataset.cynthiaActive,
  );
  const toxicSpikes = Number(document.body.dataset.cynthiaToxicSpikes || 0);

  return {
    remaining: Number.isFinite(remaining) ? Math.max(0, remaining) : 0,
    activeCardId,
    toxicSpikes: Number.isFinite(toxicSpikes) ? Math.max(0, toxicSpikes) : 0,
  };
}

function readSyncedState(event) {
  const current = readState();

  // battle-turn-change를 비롯한 공용 이벤트의 detail은 난천 파티 정보가 아니다.
  // 난천 전용 이벤트에서만 detail을 사용하고, 누락된 값은 현재 body 상태를 유지한다.
  if (event?.type !== "cynthia-party-change" || !event.detail) {
    return current;
  }

  const { remaining, activeCardId, toxicSpikes } = event.detail;

  return {
    remaining:
      remaining === undefined
        ? current.remaining
        : Math.max(0, Number(remaining) || 0),
    activeCardId:
      activeCardId === undefined
        ? current.activeCardId
        : normalizedActiveCardId(activeCardId),
    toxicSpikes:
      toxicSpikes === undefined
        ? current.toxicSpikes
        : Math.max(0, Number(toxicSpikes) || 0),
  };
}

function buildSummonFx(cardId) {
  if (!cardId) return null;

  const trainer = document.querySelector(
    '.battle.battle-board[data-trainer="sinnoh_cynthia"] [data-drop="enemy-hero"] .trainer-sprite',
  );
  const field = document.querySelector(
    '.battle.battle-board[data-trainer="sinnoh_cynthia"] .enemy-field',
  );

  if (!trainer || !field) return null;

  const trainerRect = trainer.getBoundingClientRect();
  const fieldRect = field.getBoundingClientRect();
  const startX = trainerRect.left + trainerRect.width * 0.42;
  const startY = trainerRect.top + trainerRect.height * 0.52;
  const targetX = fieldRect.left + fieldRect.width / 2;
  const targetY = fieldRect.top + fieldRect.height / 2;
  const dx = targetX - startX;
  const dy = targetY - startY;

  summonSeq += 1;

  return {
    key: `${cardId}-${summonSeq}`,
    cardId,
    startX,
    startY,
    targetX,
    targetY,
    dx,
    dy,
    arcDx: dx * 0.72,
    arcDy: dy * 0.72 - 54,
  };
}

function CynthiaHud() {
  const [state, setState] = useState(readState);
  const [open, setOpen] = useState(false);
  const [summon, setSummon] = useState(null);
  const previousActiveRef = useRef(null);
  const summonTimerRef = useRef(null);

  const beginSummon = useCallback((cardId) => {
    const fx = buildSummonFx(cardId);
    if (!fx) {
      delete document.body.dataset.cynthiaSummoning;
      return;
    }

    document.body.dataset.cynthiaSummoning = "1";
    setSummon(fx);

    if (summonTimerRef.current) {
      window.clearTimeout(summonTimerRef.current);
    }

    summonTimerRef.current = window.setTimeout(() => {
      delete document.body.dataset.cynthiaSummoning;
      setSummon(null);
      summonTimerRef.current = null;
    }, SUMMON_MS);
  }, []);

  useEffect(() => {
    const sync = (event) => {
      const next = readSyncedState(event);

      setState(next);

      // 몬스터볼 연출은 실제로 필드의 시그니처 포켓몬이 바뀔 때만 재생한다.
      if (
        next.activeCardId &&
        next.activeCardId !== previousActiveRef.current
      ) {
        beginSummon(next.activeCardId);
      }

      previousActiveRef.current = next.activeCardId;
    };

    window.addEventListener("cynthia-party-change", sync);
    window.addEventListener("battle-turn-change", sync);
    sync();

    return () => {
      window.removeEventListener("cynthia-party-change", sync);
      window.removeEventListener("battle-turn-change", sync);

      if (summonTimerRef.current) {
        window.clearTimeout(summonTimerRef.current);
        summonTimerRef.current = null;
      }

      delete document.body.dataset.cynthiaSummoning;
    };
  }, [beginSummon]);

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
          <span className="cynthia-party-title">포켓몬 리그</span>
          <div
            className="cynthia-party-pips"
            aria-label={`남은 포켓몬 ${state.remaining}마리`}
          >
            {Array.from({ length: PARTY_SIZE }, (_, index) => (
              <span
                key={index}
                className={`cynthia-party-pip ${index < fainted ? "is-fainted" : ""}`}
              />
            ))}
          </div>
          <strong>{state.remaining} / {PARTY_SIZE}</strong>
          <span className="cynthia-active-name">{activeName}</span>
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

      {summon && (
        <div
          key={summon.key}
          className="cynthia-summon-layer"
          style={{
            "--cynthia-ball-x": `${summon.startX}px`,
            "--cynthia-ball-y": `${summon.startY}px`,
            "--cynthia-ball-dx": `${summon.dx}px`,
            "--cynthia-ball-dy": `${summon.dy}px`,
            "--cynthia-ball-arc-dx": `${summon.arcDx}px`,
            "--cynthia-ball-arc-dy": `${summon.arcDy}px`,
            "--cynthia-target-x": `${summon.targetX}px`,
            "--cynthia-target-y": `${summon.targetY}px`,
          }}
          aria-hidden="true"
        >
          <img
            className="cynthia-thrown-ball"
            src={UI_SPRITES.pokeball}
            alt=""
            draggable={false}
          />
          <div className="cynthia-ball-release">
            <span className="cynthia-release-ring ring-one" />
            <span className="cynthia-release-ring ring-two" />
          </div>
          <img
            className="cynthia-release-pokemon"
            src={spriteUrl(summon.cardId)}
            alt=""
            draggable={false}
          />
        </div>
      )}

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
              <h2>포켓몬 리그</h2>

              <div className="battle-gimmick-copy">
                <p>난천은 일반 드로우를 하지 않고 여섯 시그니처 포켓몬만 사용합니다.</p>
                <p>난천의 필드에는 한 번에 포켓몬 한 마리만 존재하며, 여섯 마리를 모두 쓰러뜨려야 승리합니다.</p>
                <p>난천은 두 번째 자기 턴부터 2턴마다 랜덤 기술 또는 도구 카드 1장을 준비합니다. 이미 생성된 기술/도구가 손에 남아 있으면 새 카드는 받지 않습니다.</p>
                <p>손에 없다면 0코스트 「돌아와!」를 받고, 교체된 포켓몬은 받은 피해가 회복되지 않고 현재 HP를 그대로 유지합니다.</p>
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

    if (normalizedActiveCardId(document.body.dataset.cynthiaActive)) {
      document.body.dataset.cynthiaSummoning = "1";
    }

    ensureRoot().render(<CynthiaHud />);
    return;
  }

  if (!active && mounted) {
    mounted = false;
    root?.render(null);
    delete document.body.dataset.cynthiaSummoning;
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
