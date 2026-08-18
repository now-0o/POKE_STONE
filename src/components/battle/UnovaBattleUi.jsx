import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { TRAINER_MAP } from "../../data/trainers.js";
import { playSfx } from "../../audio.js";

const GIMMICK_GUIDES = {
  striaton_counter: {
    fieldName: "성신 레스토랑",
    lines: [
      "배틀 시작 시 플레이어 덱에 들어 있는 포켓몬 타입 구성을 전부 분석합니다.",
      "덴트·팟·콘 중 그 덱 전체에 평균적으로 가장 유리한 타입의 관장이 실제 상대로 등장합니다.",
    ],
    hint: "힌트: 한 타입에 지나치게 몰린 덱일수록 카운터가 선명해집니다.",
  },
  lenora_review: {
    fieldName: "칠보박물관 복습 시험",
    lines: [
      "플레이어 턴 종료 시 그 턴에 가장 많이 사용한 카드 종류를 기록합니다.",
      "다음 플레이어 턴에는 기록된 종류의 첫 카드 비용이 2 증가합니다.",
      "카드 종류는 포켓몬 · 기술 · 도구로 구분합니다.",
    ],
    hint: "힌트: 한 종류를 한 턴에 몰아 쓰지 말고 플레이 패턴을 섞으세요.",
  },
  burgh_cocoon: {
    fieldName: "구름체육관 우화",
    lines: [
      "아티의 포켓몬은 모두 진화 전 상태로 등장한 뒤 즉시 고치화합니다.",
      "고치 상태에서는 공격할 수 없고 받는 피해가 약 절반으로 감소합니다.",
      "다음 아티 턴 시작까지 살아남으면 해당 계열의 최종진화체로 바로 우화합니다. 받은 피해는 그대로 이어집니다.",
    ],
    hint: "힌트: 고치 상태가 가장 확실한 제거 타이밍입니다. 우화 전에 집중 공격하세요.",
  },
  elesa_spotlight: {
    fieldName: "뇌문 스포트라이트",
    lines: [
      "양쪽 모두 자신의 턴 시작 시 공격 가능한 포켓몬 하나가 무작위로 스포트라이트를 받습니다.",
      "그 턴에는 스포트라이트를 받은 포켓몬만 전투 공격할 수 있습니다. 기술 카드는 자유롭게 사용할 수 있습니다.",
      "카밀레의 시그니처 에몽가는 스포트라이트를 받으면 공격력 +2, 공격 후 손으로 돌아갑니다.",
    ],
    hint: "힌트: 공격권이 없는 포켓몬은 기술과 도구로 지원하거나 다음 턴을 준비하세요.",
  },
  clay_minecart: {
    fieldName: "물풍경 광산차",
    lines: [
      "전투 공격으로 실제 피해를 줄 때마다 광산차가 공격한 쪽으로 1칸 움직입니다.",
      "야콘 쪽 +4에 도달하면 플레이어 필드 전체에 땅 피해 3, 플레이어 쪽 -4에 도달하면 야콘 필드 전체에 피해 2가 발생하고 중앙으로 돌아옵니다.",
      "야콘의 시그니처 몰드류는 전투 피해를 줄 때 광산차를 2칸 밀어냅니다.",
    ],
    hint: "힌트: 기술 피해만으로는 광산차 주도권을 가져올 수 없습니다. 전투 공격의 흐름을 잡으세요.",
  },
  skyla_airborne: {
    fieldName: "궐수 활주로",
    lines: [
      "풍란의 턴 종료 시 포켓몬 하나가 이륙합니다.",
      "이륙한 포켓몬은 다음 플레이어 턴 동안 전투 공격 대상으로 지정할 수 없지만 기술 카드는 맞습니다.",
      "다음 풍란 턴 시작에 착륙하며 무작위 플레이어 포켓몬에게 비행 피해 2를 줍니다. 시그니처 스완나는 피해 4입니다.",
    ],
    hint: "힌트: 반드시 제거해야 할 포켓몬이 이륙했다면 기술 카드로 공중에서 처리하세요.",
  },
  brycen_frost: {
    fieldName: "설화의 혹한",
    lines: [
      "얼음 타입이 아닌 포켓몬이 전투 공격할 때마다 냉기가 1 쌓입니다.",
      "냉기 2가 되면 공격 직후 얼음 상태가 됩니다. 한 턴 동안 공격하지 않으면 냉기가 1 감소합니다.",
      "담죽의 시그니처 툰베어는 얼어 있는 포켓몬을 공격할 때 피해 +3을 얻습니다.",
    ],
    hint: "힌트: 한 에이스만 계속 공격시키지 말고 공격수를 교대로 쉬게 하세요.",
  },
  drayden_trials: {
    fieldName: "쌍용 용의 시련",
    lines: [
      "매 플레이어 턴 시작 시 사간이 현재 상황에서 수행 가능한 시련 하나를 제시합니다.",
      "실패하면 용의 위압이 1 증가하고 사간의 모든 드래곤 포켓몬 공격력이 위압 수치만큼 증가합니다. 최대 4입니다.",
      "성공하면 위압이 1 감소합니다. 위압 3 이상에서는 사간의 시그니처 액스라이즈가 한 턴에 두 번 공격합니다.",
    ],
    hint: "힌트: 매 턴 HUD와 전투 로그에 표시되는 시련부터 확인하세요.",
  },
};

function readGymState() {
  return window.__pokeUnovaGymState || {
    spotlightUids: [],
    cocoonUids: [],
    frostByUid: {},
    airborneUids: [],
    minecart: 0,
    draydenTrial: null,
    draydenDominance: 0,
  };
}

function MinecartHud({ value = 0 }) {
  const positions = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  return (
    <div className="unova-minecart-hud" aria-live="polite">
      <div className="unova-hud-title">⛏️ 광산차</div>
      <div className="unova-minecart-labels">
        <span>플레이어</span>
        <strong>{value > 0 ? `+${value}` : value}</strong>
        <span>야콘</span>
      </div>
      <div className="unova-minecart-track">
        {positions.map((position) => (
          <span
            key={position}
            className={position === value ? "active" : ""}
            aria-label={`광산차 ${position}`}
          >
            {position === value ? "▣" : "·"}
          </span>
        ))}
      </div>
    </div>
  );
}

function DraydenHud({ trial, dominance = 0 }) {
  return (
    <div className={`unova-drayden-hud dominance-${dominance}`} aria-live="polite">
      <div className="unova-hud-title">🐉 용의 시련</div>
      <strong>{trial || "다음 시련을 준비 중..."}</strong>
      <div className="unova-dominance-row">
        <span>용의 위압</span>
        <div className="unova-dominance-pips">
          {[1, 2, 3, 4].map((value) => (
            <i key={value} className={value <= dominance ? "active" : ""} />
          ))}
        </div>
        <b>{dominance}/4</b>
      </div>
    </div>
  );
}

function GimmickHelp({ trainer }) {
  const guide = GIMMICK_GUIDES[trainer?.gimmick];
  const [open, setOpen] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [gymState, setGymState] = useState(readGymState);

  useEffect(() => {
    setOpen(false);
    setShowTip(true);
    setGymState(readGymState());
    const timer = window.setTimeout(() => setShowTip(false), 4200);
    return () => window.clearTimeout(timer);
  }, [trainer?.id]);

  useEffect(() => {
    const update = (event) => setGymState(event.detail || readGymState());
    window.addEventListener("unova-gym-state-change", update);
    return () => window.removeEventListener("unova-gym-state-change", update);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!trainer || trainer.region !== "unova" || !guide) return null;

  return (
    <>
      <div className="battle-gimmick-help-wrap unova-gimmick-help-wrap">
        {showTip && !open && (
          <div className="battle-gimmick-entry-tip" role="status">
            ? 버튼을 눌러 하나지방 체육관 룰을 확인하세요
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

      {trainer.gimmick === "clay_minecart" && (
        <MinecartHud value={gymState.minecart || 0} />
      )}

      {trainer.gimmick === "drayden_trials" && (
        <DraydenHud
          trial={gymState.draydenTrial}
          dominance={gymState.draydenDominance || 0}
        />
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
                <span>하나 체육관 기믹</span>
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
  enhancementHost.id = "unova-battle-enhancement-root";
  document.body.appendChild(enhancementHost);
  enhancementRoot = createRoot(enhancementHost);
  return enhancementRoot;
}

function ensureOverlay(element, className, text = null) {
  let overlay = element.querySelector(`:scope > .${className}`);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = className;
    overlay.setAttribute("aria-hidden", "true");
    if (text !== null) {
      const span = document.createElement("span");
      span.textContent = text;
      overlay.appendChild(span);
    }
    element.appendChild(overlay);
  }
  return overlay;
}

function removeOverlay(element, className) {
  element.querySelector(`:scope > .${className}`)?.remove();
}

function syncUnitEffects() {
  const state = readGymState();
  const spotlight = new Set(state.spotlightUids || []);
  const cocoons = new Set(state.cocoonUids || []);
  const airborne = new Set(state.airborneUids || []);
  const frost = state.frostByUid || {};

  document
    .querySelectorAll(".battle.battle-board .field-unit[data-uid]")
    .forEach((element) => {
      const uid = element.dataset.uid;
      const isSpotlight = spotlight.has(uid);
      const isCocoon = cocoons.has(uid);
      const isAirborne = airborne.has(uid);
      const frostValue = Number(frost[uid] || 0);

      element.classList.toggle("unova-spotlight", isSpotlight);
      element.classList.toggle("unova-cocooned", isCocoon);
      element.classList.toggle("unova-airborne", isAirborne);
      element.classList.toggle("unova-frosted", frostValue > 0);

      if (isSpotlight) ensureOverlay(element, "unova-spotlight-beam");
      else removeOverlay(element, "unova-spotlight-beam");

      if (isCocoon) ensureOverlay(element, "unova-cocoon-overlay", "고치");
      else removeOverlay(element, "unova-cocoon-overlay");

      if (isAirborne) ensureOverlay(element, "unova-airborne-badge", "이륙");
      else removeOverlay(element, "unova-airborne-badge");

      if (frostValue > 0) {
        const overlay = ensureOverlay(element, "unova-frost-overlay", `❄ ${frostValue}/2`);
        const label = overlay.querySelector("span");
        if (label) label.textContent = `❄ ${frostValue}/2`;
      } else {
        removeOverlay(element, "unova-frost-overlay");
      }
    });
}

function syncUnovaBattleUi() {
  const battle = document.querySelector(".battle.battle-board[data-trainer]");
  const trainerId = battle?.dataset.trainer || null;

  if (!battle || !trainerId) {
    if (activeTrainerId !== null) {
      activeTrainerId = null;
      enhancementRoot?.render(null);
    }
    return;
  }

  const trainer = TRAINER_MAP[trainerId];
  syncUnitEffects();

  if (trainer?.region !== "unova") {
    if (activeTrainerId !== null) {
      activeTrainerId = null;
      enhancementRoot?.render(null);
    }
    return;
  }

  if (trainer?.battlefield) {
    battle.dataset.battlefield = trainer.battlefield;
    document.body.dataset.battlefield = trainer.battlefield;
  }

  if (activeTrainerId === trainerId) return;
  activeTrainerId = trainerId;
  ensureEnhancementRoot().render(<GimmickHelp trainer={trainer} />);
}

function startUnovaBattleUi() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startUnovaBattleUi, { once: true });
    return;
  }

  syncUnovaBattleUi();
  window.addEventListener("unova-gym-state-change", () => {
    syncUnitEffects();
    syncUnovaBattleUi();
  });

  const observer = new MutationObserver(syncUnovaBattleUi);
  observer.observe(document.body, { childList: true, subtree: true });
}

startUnovaBattleUi();
