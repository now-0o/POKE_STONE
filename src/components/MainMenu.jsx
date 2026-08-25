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
  online: { name: "온라인 배틀", sub: "ONLINE" },
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

export default function MainMenu({
  save,
  username,
  onlineAdmin,
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
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [onlineMatching, setOnlineMatching] = useState(false);
  const [showOnlineLeaveConfirm, setShowOnlineLeaveConfirm] = useState(false);
  const [cancelingOnline, setCancelingOnline] = useState(false);
  const onlineCancelRef = useRef(null);
  const pendingNavigationRef = useRef(null);

  const deckReady = save.deck.length === 30;
  const legendaryCount = countLegendaryPokemon(save.deck);
  const legendaryReady = legendaryCount <= MAX_LEGENDARY_POKEMON;
  const onlineReady = !!onlineAdmin && deckReady && legendaryReady;
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

  function selectRegion(region) {
    if (region === "johto" && !johtoUnlocked) {
      playSfx("buzzer");
      return;
    }
    if (region === "hoenn" && !hoennUnlocked) {
      playSfx("buzzer");
      return;
    }
    if (region === "sinnoh" && !sinnohUnlocked) {
      playSfx("buzzer");
      return;
    }
    if (region === "unova" && !unovaUnlocked) {
      playSfx("buzzer");
      return;
    }
    playSfx("click");
    setSelectedRegion(region);
  }

  function openOnline() {
    if (!onlineReady) {
      playSfx("buzzer");
      return;
    }
    playSfx("click");
    setSelectedRegion("online");
  }

  function requestNavigation(action) {
    if (selectedRegion === "online" && onlineMatching) {
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

  function trainerUnlocked(t) {
    if (save.adminMode) return true;
    if (!t.requires) return true;
    return (save.wins?.[t.requires] || 0) > 0;
  }

  const trainers =
    selectedRegion && selectedRegion !== "online"
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

      {!selectedRegion && (
        <>
          <div className="region-title">도전할 지방을 선택하세요</div>

          <div className="region-select">
            <button
              className={[
                "region-card",
                onlineReady ? "region-online" : "region-locked",
              ].join(" ")}
              onMouseEnter={() => onlineReady && playSfx("cursor")}
              onClick={openOnline}
            >
              <span className="region-info">
                <span className="region-name">온라인 배틀</span>
                <span className="region-sub">ONLINE · RANDOM MATCH</span>
                <span className="region-desc">실시간 대전 안정성 테스트</span>
                {!onlineAdmin && (
                  <span className="region-lock-text">
                    🔒 stonemaster 또는 imtester 입력 필요
                  </span>
                )}
                {onlineAdmin && !deckReady && (
                  <span className="region-lock-text">🔒 30장 덱 완성 필요</span>
                )}
                {onlineAdmin && deckReady && !legendaryReady && (
                  <span className="region-lock-text">
                    🔒 전설 포켓몬 최대 {MAX_LEGENDARY_POKEMON}장 · 현재 {legendaryCount}장
                  </span>
                )}
              </span>
              <span className="region-go">
                {onlineReady ? "선택 ▶" : "TEST LOCK"}
              </span>
            </button>

            <button
              className="region-card"
              onMouseEnter={() => playSfx("cursor")}
              onClick={() => selectRegion("kanto")}
            >
              <span className="region-info">
                <span className="region-name">관동지방</span>
                <span className="region-sub">KANTO</span>
                <span className="region-desc">체육관 로드 · 챔피언 레드</span>
              </span>
              <span className="region-go">선택 ▶</span>
            </button>

            <button
              className={[
                "region-card",
                !johtoUnlocked ? "region-locked" : "region-johto",
              ].join(" ")}
              onMouseEnter={() => johtoUnlocked && playSfx("cursor")}
              onClick={() => selectRegion("johto")}
            >
              <span className="region-info">
                <span className="region-name">성도지방</span>
                <span className="region-sub">JOHTO</span>
                <span className="region-desc">강한 AI · 안정적인 덱</span>
                {!johtoUnlocked && (
                  <span className="region-lock-text">
                    🔒 챔피언 레드 격파 후 해금
                  </span>
                )}
              </span>
              <span className="region-go">
                {johtoUnlocked ? "선택 ▶" : "LOCK"}
              </span>
            </button>

            <button
              className={[
                "region-card",
                !hoennUnlocked ? "region-locked" : "region-hoenn",
              ].join(" ")}
              onMouseEnter={() => hoennUnlocked && playSfx("cursor")}
              onClick={() => selectRegion("hoenn")}
            >
              <span className="region-info">
                <span className="region-name">호연지방</span>
                <span className="region-sub">HOENN</span>
                <span className="region-desc">최상급 AI · 메가진화 · 전설</span>
                {!hoennUnlocked && (
                  <span className="region-lock-text">
                    🔒 챔피언 목호 격파 후 해금
                  </span>
                )}
              </span>
              <span className="region-go">
                {hoennUnlocked ? "선택 ▶" : "LOCK"}
              </span>
            </button>

            <button
              className={[
                "region-card",
                !sinnohUnlocked ? "region-locked" : "region-sinnoh",
              ].join(" ")}
              onMouseEnter={() => sinnohUnlocked && playSfx("cursor")}
              onClick={() => selectRegion("sinnoh")}
            >
              <span className="region-info">
                <span className="region-name">신오지방</span>
                <span className="region-sub">SINNOH</span>
                <span className="region-desc">특수 배틀 · 체육관 기믹</span>
                {!sinnohUnlocked && (
                  <span className="region-lock-text">
                    🔒 호연지방 클리어 후 해금
                  </span>
                )}
              </span>
              <span className="region-go">
                {sinnohUnlocked ? "선택 ▶" : "LOCK"}
              </span>
            </button>

            <button
              className={[
                "region-card",
                !unovaUnlocked ? "region-locked" : "region-unova",
              ].join(" ")}
              onMouseEnter={() => unovaUnlocked && playSfx("cursor")}
              onClick={() => selectRegion("unova")}
            >
              <span className="region-info">
                <span className="region-name">하나지방</span>
                <span className="region-sub">UNOVA</span>
                <span className="region-desc">최상급 AI · 전용 체육관 룰</span>
                {!unovaUnlocked && (
                  <span className="region-lock-text">
                    🔒 신오지방 클리어 후 해금
                  </span>
                )}
              </span>
              <span className="region-go">
                {unovaUnlocked ? "선택 ▶" : "LOCK"}
              </span>
            </button>
          </div>
        </>
      )}

      {selectedRegion && (
        <>
          <div className="trainer-region-header">
            <button
              className="btn-ghost small"
              onClick={() =>
                requestNavigation(() => {
                  playSfx("click");
                  setSelectedRegion(null);
                })
              }
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

          {selectedRegion === "online" ? (
            <div className="trainer-list online-matchmaking-trainer-slot">
              <OnlineMatchmaking
                save={save}
                isAdmin={onlineAdmin}
                embedded
                onMatched={onOnlineMatched}
                onActivityChange={setOnlineMatching}
                onRegisterCancel={(handler) => {
                  onlineCancelRef.current = handler;
                }}
              />
            </div>
          ) : (
            <div className="trainer-list">
              {trainers.map((t) => {
                const wins = save.wins?.[t.id] || 0;
                const progressUnlocked = trainerUnlocked(t);
                const canBattle = deckReady && progressUnlocked;
                const requiredTrainer = t.requires
                  ? TRAINER_MAP[t.requires]
                  : null;

                return (
                  <button
                    key={t.id}
                    className={[
                      "trainer-card",
                      !canBattle ? "btn-locked" : "",
                    ].join(" ")}
                    onMouseEnter={() => canBattle && playSfx("cursor")}
                    onClick={() => {
                      if (canBattle) {
                        playSfx("click");
                        onBattle(t);
                      } else {
                        playSfx("buzzer");
                      }
                    }}
                  >
                    <TrainerSprite
                      spriteKey={t.sprite}
                      emoji={t.emoji}
                      size={56}
                    />
                    <span className="trainer-info">
                      <span className="trainer-name">{t.name}</span>
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
                            {t.reward}
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
          )}
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
