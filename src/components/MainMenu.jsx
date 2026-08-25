import React, { useRef, useState } from "react";
import { TRAINERS_BY_REGION, TRAINER_MAP } from "../data/trainers.js";
import { resetSave } from "../state/save.js";
import { TrainerSprite } from "./Card.jsx";
import OnlineMatchmaking from "./OnlineMatchmaking.jsx";
import {
  UI_SPRITES,
  LEGENDARY_POKEMON_IDS,
  MAX_LEGENDARY_POKEMON,
} from "../data/cards.js";
import { playSfx } from "../audio.js";

const REGION_LABELS = {
  kanto: { name: "관동지방", sub: "KANTO" },
  johto: { name: "성도지방", sub: "JOHTO" },
  hoenn: { name: "호연지방", sub: "HOENN" },
  sinnoh: { name: "신오지방", sub: "SINNOH" },
  unova: { name: "하나지방", sub: "UNOVA" },
};

function countLegendaryPokemon(deck = []) {
  return deck.reduce(
    (count, cardId) => count + (LEGENDARY_POKEMON_IDS.has(cardId) ? 1 : 0),
    0,
  );
}

function ChoiceCard({
  className = "",
  disabled = false,
  name,
  sub,
  desc,
  lockText = "",
  goText = "선택 ▶",
  onClick,
}) {
  return (
    <button
      className={["region-card", className, disabled ? "region-locked" : ""]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => !disabled && playSfx("cursor")}
      onClick={() => {
        if (disabled) {
          playSfx("buzzer");
          return;
        }
        onClick?.();
      }}
    >
      <span className="region-info">
        <span className="region-name">{name}</span>
        <span className="region-sub">{sub}</span>
        <span className="region-desc">{desc}</span>
        {lockText && <span className="region-lock-text">{lockText}</span>}
      </span>
      <span className="region-go">{disabled ? "LOCK" : goText}</span>
    </button>
  );
}

export default function MainMenu({
  save,
  username,
  onOnlineMatched,
  onBattle,
  onShop,
  onDeck,
  onDex,
  onTutorial,
  onSaveChange,
  onLogout,
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedOnlineMode, setSelectedOnlineMode] = useState(null);
  const [onlineMatching, setOnlineMatching] = useState(false);
  const [showOnlineLeaveConfirm, setShowOnlineLeaveConfirm] = useState(false);
  const [cancelingOnline, setCancelingOnline] = useState(false);
  const onlineCancelRef = useRef(null);
  const pendingNavigationRef = useRef(null);

  const deckReady = save.deck.length === 30;
  const legendaryCount = countLegendaryPokemon(save.deck);
  const legendaryReady = legendaryCount <= MAX_LEGENDARY_POKEMON;
  const onlineReady = deckReady && legendaryReady;

  const johtoUnlocked = save.adminMode || (save.wins?.champion || 0) > 0;
  const hoennUnlocked = save.adminMode || (save.wins?.johto_lance || 0) > 0;
  const hoennTrainers = TRAINERS_BY_REGION.hoenn || [];
  const hoennLastTrainer = hoennTrainers[hoennTrainers.length - 1];
  const sinnohUnlocked =
    save.adminMode ||
    (hoennLastTrainer && (save.wins?.[hoennLastTrainer.id] || 0) > 0);
  const sinnohTrainers = TRAINERS_BY_REGION.sinnoh || [];
  const sinnohLastTrainer = sinnohTrainers[sinnohTrainers.length - 1];
  const unovaUnlocked =
    save.adminMode ||
    (sinnohLastTrainer && (save.wins?.[sinnohLastTrainer.id] || 0) > 0);

  const onlineLockText = !deckReady
    ? "🔒 30장 덱 완성 필요"
    : !legendaryReady
      ? `🔒 전설 포켓몬 최대 ${MAX_LEGENDARY_POKEMON}장 · 현재 ${legendaryCount}장`
      : "";

  const storyRegions = [
    {
      id: "kanto",
      name: "관동지방",
      sub: "KANTO",
      desc: "체육관 로드 · 챔피언 레드",
      unlocked: true,
      className: "",
      lockText: "",
    },
    {
      id: "johto",
      name: "성도지방",
      sub: "JOHTO",
      desc: "강한 AI · 안정적인 덱",
      unlocked: johtoUnlocked,
      className: "region-johto",
      lockText: "🔒 챔피언 레드 격파 후 해금",
    },
    {
      id: "hoenn",
      name: "호연지방",
      sub: "HOENN",
      desc: "최상급 AI · 메가진화 · 전설",
      unlocked: hoennUnlocked,
      className: "region-hoenn",
      lockText: "🔒 챔피언 목호 격파 후 해금",
    },
    {
      id: "sinnoh",
      name: "신오지방",
      sub: "SINNOH",
      desc: "특수 배틀 · 체육관 기믹",
      unlocked: sinnohUnlocked,
      className: "region-sinnoh",
      lockText: "🔒 호연지방 클리어 후 해금",
    },
    {
      id: "unova",
      name: "하나지방",
      sub: "UNOVA",
      desc: "최상급 AI · 전용 체육관 룰",
      unlocked: unovaUnlocked,
      className: "region-unova",
      lockText: "🔒 신오지방 클리어 후 해금",
    },
  ];

  async function goFullscreen() {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: "hide" });
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }

      if (screen.orientation?.lock) {
        try {
          await screen.orientation.lock("landscape");
        } catch {
          // 지원하지 않는 브라우저는 무시
        }
      }
    } catch {
      // 전체화면 미지원 브라우저
    }
  }

  function enterMode(mode) {
    if (mode === "online" && !onlineReady) {
      playSfx("buzzer");
      return;
    }
    playSfx("click");
    setSelectedMode(mode);
    setSelectedRegion(null);
    setSelectedOnlineMode(null);
  }

  function selectRegion(region) {
    const choice = storyRegions.find((entry) => entry.id === region);
    if (!choice?.unlocked) {
      playSfx("buzzer");
      return;
    }
    playSfx("click");
    setSelectedRegion(region);
  }

  function requestNavigation(action) {
    if (
      selectedMode === "online" &&
      selectedOnlineMode === "random" &&
      onlineMatching
    ) {
      pendingNavigationRef.current = action;
      setShowOnlineLeaveConfirm(true);
      playSfx("click");
      return;
    }
    action();
  }

  async function confirmCancelAndNavigate() {
    if (cancelingOnline) return;
    setCancelingOnline(true);

    const cancel = onlineCancelRef.current;
    const cancelled = cancel ? await cancel({ silent: true }) : true;

    if (cancelled) {
      const action = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      setOnlineMatching(false);
      setShowOnlineLeaveConfirm(false);
      playSfx("click");
      action?.();
    } else {
      playSfx("buzzer");
    }

    setCancelingOnline(false);
  }

  function keepMatching() {
    pendingNavigationRef.current = null;
    setShowOnlineLeaveConfirm(false);
    playSfx("click");
  }

  function trainerUnlocked(trainer) {
    if (save.adminMode) return true;
    if (!trainer.requires) return true;
    return (save.wins?.[trainer.requires] || 0) > 0;
  }

  const trainers = selectedRegion
    ? TRAINERS_BY_REGION[selectedRegion] || []
    : [];

  return (
    <div className="main-menu">
      <button
        className="btn-fullscreen"
        onMouseEnter={() => playSfx("cursor")}
        onClick={() => {
          playSfx("click");
          goFullscreen();
        }}
        title="전체화면"
      >
        ⛶
      </button>

      <div className="title-block">
        <h1 className="game-title">POKE STONE</h1>
        <p className="game-subtitle">FAN-MADE CARD BATTLE</p>
      </div>

      <div className="menu-money">
        <span className="res-item">
          <img
            className="res-icon"
            src={UI_SPRITES.coin}
            alt="돈"
            width={22}
            height={22}
            draggable={false}
          />
          {save.money}
        </span>
        <span className="res-item">
          <img
            className="res-icon"
            src={UI_SPRITES.pokeball}
            alt="개봉한 팩"
            width={22}
            height={22}
            draggable={false}
          />
          팩 {save.packsOpened}개 개봉
        </span>
      </div>

      {!selectedMode && (
        <>
          <div className="region-title">게임 모드를 선택하세요</div>
          <div className="region-select">
            <ChoiceCard
              className="region-story"
              name="스토리 모드"
              sub="STORY MODE"
              desc="지방을 선택해 트레이너 AI에 도전"
              onClick={() => enterMode("story")}
            />
            <ChoiceCard
              className="region-online"
              disabled={!onlineReady}
              name="온라인 배틀"
              sub="ONLINE BATTLE"
              desc="랜덤 매칭 · 친선전"
              lockText={onlineLockText}
              onClick={() => enterMode("online")}
            />
          </div>
        </>
      )}

      {selectedMode === "story" && !selectedRegion && (
        <>
          <div className="trainer-region-header">
            <button
              className="btn-ghost small"
              onClick={() => {
                playSfx("click");
                setSelectedMode(null);
              }}
            >
              ◀ 모드 선택
            </button>
            <div>
              <strong>스토리 모드</strong>
              <span className="trainer-region-sub"> STORY</span>
            </div>
          </div>

          <div className="region-title">도전할 지방을 선택하세요</div>
          <div className="region-select">
            {storyRegions.map((region) => (
              <ChoiceCard
                key={region.id}
                className={region.className}
                disabled={!region.unlocked}
                name={region.name}
                sub={region.sub}
                desc={region.desc}
                lockText={!region.unlocked ? region.lockText : ""}
                onClick={() => selectRegion(region.id)}
              />
            ))}
          </div>
        </>
      )}

      {selectedMode === "story" && selectedRegion && (
        <>
          <div className="trainer-region-header">
            <button
              className="btn-ghost small"
              onClick={() => {
                playSfx("click");
                setSelectedRegion(null);
              }}
            >
              ◀ 지방 선택
            </button>
            <div>
              <strong>{REGION_LABELS[selectedRegion]?.name}</strong>
              <span className="trainer-region-sub">
                {" "}
                {REGION_LABELS[selectedRegion]?.sub}
              </span>
            </div>
          </div>

          <div className="trainer-list">
            {trainers.map((trainer) => {
              const wins = save.wins?.[trainer.id] || 0;
              const progressUnlocked = trainerUnlocked(trainer);
              const canBattle = deckReady && progressUnlocked;
              const requiredTrainer = trainer.requires
                ? TRAINER_MAP[trainer.requires]
                : null;

              return (
                <button
                  key={trainer.id}
                  className={[
                    "trainer-card",
                    !canBattle ? "btn-locked" : "",
                  ].join(" ")}
                  onMouseEnter={() => canBattle && playSfx("cursor")}
                  onClick={() => {
                    if (canBattle) {
                      playSfx("click");
                      onBattle(trainer);
                    } else {
                      playSfx("buzzer");
                    }
                  }}
                >
                  <TrainerSprite
                    spriteKey={trainer.sprite}
                    emoji={trainer.emoji}
                    size={56}
                  />
                  <span className="trainer-info">
                    <span className="trainer-name">{trainer.name}</span>
                    <span className="trainer-meta">
                      {progressUnlocked ? (
                        <>
                          <img
                            className="res-icon small"
                            src={UI_SPRITES.coin}
                            alt=""
                            width={14}
                            height={14}
                            draggable={false}
                          />
                          {trainer.reward}
                          {wins > 0 && ` · 승리 ${wins}회`}
                        </>
                      ) : (
                        <>
                          🔒 {requiredTrainer?.name || "이전 트레이너"} 격파 필요
                        </>
                      )}
                    </span>
                  </span>
                  <span className="trainer-go">
                    {canBattle ? "배틀 ▶" : "LOCK"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedMode === "online" && !selectedOnlineMode && (
        <>
          <div className="trainer-region-header">
            <button
              className="btn-ghost small"
              onClick={() => {
                playSfx("click");
                setSelectedMode(null);
              }}
            >
              ◀ 모드 선택
            </button>
            <div>
              <strong>온라인 배틀</strong>
              <span className="trainer-region-sub"> ONLINE</span>
            </div>
          </div>

          <div className="region-title">온라인 배틀 방식을 선택하세요</div>
          <div className="region-select">
            <ChoiceCard
              className="region-online"
              name="랜덤 매칭"
              sub="RANDOM MATCH"
              desc="상대를 자동으로 찾아 바로 대전"
              onClick={() => {
                playSfx("click");
                setSelectedOnlineMode("random");
              }}
            />
            <ChoiceCard
              name="친선전"
              sub="FRIENDLY MATCH"
              desc="방 만들기 · 코드로 입장"
              goText="준비 중"
              onClick={() => playSfx("buzzer")}
            />
          </div>
        </>
      )}

      {selectedMode === "online" && selectedOnlineMode === "random" && (
        <>
          <div className="trainer-region-header">
            <button
              className="btn-ghost small"
              onClick={() =>
                requestNavigation(() => {
                  playSfx("click");
                  setSelectedOnlineMode(null);
                })
              }
            >
              ◀ 온라인 배틀
            </button>
            <div>
              <strong>랜덤 매칭</strong>
              <span className="trainer-region-sub"> RANDOM MATCH</span>
            </div>
          </div>

          <div className="trainer-list online-matchmaking-trainer-slot">
            <OnlineMatchmaking
              save={save}
              embedded
              onMatched={onOnlineMatched}
              onActivityChange={setOnlineMatching}
              onRegisterCancel={(handler) => {
                onlineCancelRef.current = handler;
              }}
            />
          </div>
        </>
      )}

      {!deckReady && (
        <p className="deck-warning center">
          덱이 30장이 아니에요. 덱 편집에서 채워주세요!
        </p>
      )}

      <div className="menu-buttons">
        <button
          className="btn-secondary with-icon"
          onMouseEnter={() => playSfx("cursor")}
          onClick={() =>
            requestNavigation(() => {
              playSfx("slide");
              onShop();
            })
          }
        >
          <img
            className="res-icon"
            src={UI_SPRITES.pokeball}
            alt=""
            width={20}
            height={20}
            draggable={false}
          />
          카드팩 상점
        </button>

        <button
          className="btn-secondary with-icon"
          onMouseEnter={() => playSfx("cursor")}
          onClick={() =>
            requestNavigation(() => {
              playSfx("pc");
              onDeck();
            })
          }
        >
          <img
            className="res-icon"
            src={UI_SPRITES.map}
            alt=""
            width={20}
            height={20}
            draggable={false}
          />
          컬렉션 · 덱
        </button>

        <button
          className="btn-secondary with-icon"
          onMouseEnter={() => playSfx("cursor")}
          onClick={() =>
            requestNavigation(() => {
              playSfx("click");
              onDex?.();
            })
          }
        >
          <img
            className="res-icon"
            src="/sprites/items/adventure-rules.png"
            alt=""
            width={20}
            height={20}
            draggable={false}
          />
          카드 도감
        </button>

        <button
          className="btn-secondary with-icon tutorial-menu-btn"
          onMouseEnter={() => playSfx("cursor")}
          onClick={() =>
            requestNavigation(() => {
              playSfx("click");
              onTutorial?.();
            })
          }
        >
          <span className="tutorial-menu-icon" aria-hidden="true">?</span>
          게임 튜토리얼
        </button>
      </div>

      <div className="menu-footer">
        {username && (
          <span style={{ opacity: 0.55, marginRight: 10 }}>{username}님</span>
        )}
        <button
          className="btn-ghost small"
          onClick={() => requestNavigation(onLogout)}
        >
          로그아웃
        </button>
        {!confirmReset ? (
          <button
            className="btn-ghost small"
            onClick={() => setConfirmReset(true)}
          >
            데이터 초기화
          </button>
        ) : (
          <span className="reset-confirm-inline">
            <span>정말 초기화?</span>
            <button
              className="btn-ghost small danger"
              onClick={() => {
                resetSave();
                onSaveChange(true);
                setConfirmReset(false);
              }}
            >
              예
            </button>
            <button
              className="btn-ghost small"
              onClick={() => setConfirmReset(false)}
            >
              취소
            </button>
          </span>
        )}
      </div>

      {showOnlineLeaveConfirm && (
        <div className="online-leave-confirm-overlay" role="dialog" aria-modal="true">
          <div className="online-leave-confirm-box">
            <h3>랜덤 매칭 중입니다</h3>
            <p>다른 곳으로 이동하면 현재 매칭이 취소됩니다. 매칭을 취소하고 이동할까요?</p>
            <div className="online-leave-confirm-actions">
              <button
                className="btn-primary"
                disabled={cancelingOnline}
                onClick={confirmCancelAndNavigate}
              >
                {cancelingOnline ? "취소 중..." : "매칭 취소하고 이동"}
              </button>
              <button
                className="btn-secondary"
                disabled={cancelingOnline}
                onClick={keepMatching}
              >
                계속 매칭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
