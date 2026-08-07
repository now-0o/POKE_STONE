import React, {
  useState,
} from "react";

import {
  TRAINERS_BY_REGION,
  TRAINER_MAP,
} from "../data/trainers.js";

import {
  resetSave,
} from "../state/save.js";

import {
  TrainerSprite,
} from "./Card.jsx";

import {
  UI_SPRITES,
} from "../data/cards.js";

import {
  playSfx,
} from "../audio.js";

export default function MainMenu({
  save,
  username,
  onBattle,
  onShop,
  onDeck,
  onSaveChange,
  onLogout,
}) {
  const [
    confirmReset,
    setConfirmReset,
  ] = useState(false);

  // null = 지방 선택 화면
  const [
    selectedRegion,
    setSelectedRegion,
  ] = useState(null);

  const deckReady =
    save.deck.length === 30;

  // 레드 격파 후 성도 해금
  const johtoUnlocked =
  save.adminMode ||
  (save.wins?.champion || 0) > 0;

  function goFullscreen() {
    const el =
      document.documentElement;

    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;

    if (req) {
      req.call(el).catch(() => {});
    }
  }

  function selectRegion(region) {
    if (
      region === "johto" &&
      !johtoUnlocked
    ) {
      playSfx("buzzer");
      return;
    }

    playSfx("click");
    setSelectedRegion(region);
  }

  function trainerUnlocked(t) {
    if (save.adminMode) {
      return true;
    }
  
    if (!t.requires) {
      return true;
    }
  
    return (
      (save.wins?.[t.requires] || 0) > 0
    );
  }

  const trainers =
    selectedRegion
      ? TRAINERS_BY_REGION[
          selectedRegion
        ]
      : [];

  return (
    <div className="main-menu">
      <button
        className="btn-fullscreen"
        onMouseEnter={() =>
          playSfx("cursor")
        }
        onClick={() => {
          playSfx("click");
          goFullscreen();
        }}
        title="전체화면"
      >
        ⛶
      </button>

      <div className="title-block">
        <h1 className="game-title">
          POKE STONE
        </h1>

        <p className="game-subtitle">
          FAN-MADE CARD BATTLE
        </p>
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

      {/* =========================================
          지방 선택
          ========================================= */}
      {!selectedRegion && (
        <>
          <div className="region-title">
            도전할 지방을 선택하세요
          </div>

          <div className="region-select">
            <button
              className="region-card"
              onMouseEnter={() =>
                playSfx("cursor")
              }
              onClick={() =>
                selectRegion("kanto")
              }
            >

              <span className="region-info">
                <span className="region-name">
                  관동지방
                </span>

                <span className="region-sub">
                  KANTO
                </span>

                <span className="region-desc">
                  체육관 로드 · 챔피언 레드
                </span>
              </span>

              <span className="region-go">
                선택 ▶
              </span>
            </button>

            <button
              className={[
                "region-card",
                !johtoUnlocked
                  ? "region-locked"
                  : "region-johto",
              ].join(" ")}
              onMouseEnter={() =>
                johtoUnlocked &&
                playSfx("cursor")
              }
              onClick={() =>
                selectRegion("johto")
              }
            >

              <span className="region-info">
                <span className="region-name">
                  성도지방
                </span>

                <span className="region-sub">
                  JOHTO
                </span>

                <span className="region-desc">
                  강한 AI · 안정적인 덱
                </span>

                {!johtoUnlocked && (
                  <span className="region-lock-text">
                    🔒 챔피언 레드 격파 후
                    해금
                  </span>
                )}
              </span>

              <span className="region-go">
                {johtoUnlocked
                  ? "선택 ▶"
                  : "LOCK"}
              </span>
            </button>
          </div>
        </>
      )}

      {/* =========================================
          트레이너 선택
          ========================================= */}
      {selectedRegion && (
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
              <strong>
                {selectedRegion ===
                "kanto"
                  ? "관동지방"
                  : "성도지방"}
              </strong>

              <span className="trainer-region-sub">
                {selectedRegion ===
                "kanto"
                  ? " KANTO"
                  : " JOHTO"}
              </span>
            </div>
          </div>

          <div className="trainer-list">
            {trainers.map((t) => {
              const wins =
                save.wins?.[t.id] ||
                0;

              const progressUnlocked =
                trainerUnlocked(t);

              const canBattle =
                deckReady &&
                progressUnlocked;

              const requiredTrainer =
                t.requires
                  ? TRAINER_MAP[
                      t.requires
                    ]
                  : null;

              return (
                <button
                  key={t.id}
                  className={[
                    "trainer-card",
                    !canBattle
                      ? "btn-locked"
                      : "",
                  ].join(" ")}
                  onMouseEnter={() =>
                    canBattle &&
                    playSfx("cursor")
                  }
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
                    spriteKey={
                      t.sprite
                    }
                    emoji={t.emoji}
                    size={56}
                  />

                  <span className="trainer-info">
                    <span className="trainer-name">
                      {t.name}
                    </span>

                    <span className="trainer-meta">
                      {progressUnlocked ? (
                        <>
                          <img
                            className="res-icon small"
                            src={
                              UI_SPRITES.coin
                            }
                            alt=""
                            width={14}
                            height={14}
                            draggable={
                              false
                            }
                          />

                          {t.reward}

                          {wins > 0 &&
                            ` · 승리 ${wins}회`}
                        </>
                      ) : (
                        <>
                          🔒{" "}
                          {requiredTrainer
                            ?.name ||
                            "이전 트레이너"}{" "}
                          격파 필요
                        </>
                      )}
                    </span>
                  </span>

                  <span className="trainer-go">
                    {canBattle
                      ? "배틀 ▶"
                      : "LOCK"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {!deckReady && (
        <p className="deck-warning center">
          덱이 30장이 아니에요. 덱
          편집에서 채워주세요!
        </p>
      )}

      <div className="menu-buttons">
        <button
          className="btn-secondary with-icon"
          onMouseEnter={() =>
            playSfx("cursor")
          }
          onClick={() => {
            playSfx("slide");
            onShop();
          }}
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
          onMouseEnter={() =>
            playSfx("cursor")
          }
          onClick={() => {
            playSfx("pc");
            onDeck();
          }}
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
      </div>

      <div className="menu-footer">
        {username && (
          <span
            style={{
              opacity: 0.55,
              marginRight: 10,
            }}
          >
            {username}님
          </span>
        )}

        {onLogout && (
          <button
            className="btn-ghost small"
            onClick={() => {
              playSfx("click");
              onLogout();
            }}
          >
            로그아웃
          </button>
        )}

        {" "}

        {!confirmReset ? (
          <button
            className="btn-ghost small"
            onClick={() => {
              playSfx("click");
              setConfirmReset(true);
            }}
          >
            세이브 초기화
          </button>
        ) : (
          <span>
            정말 초기화할까요?{" "}

            <button
              className="btn-ghost small danger"
              onClick={() => {
                playSfx("click");
                resetSave();
                setConfirmReset(false);
                setSelectedRegion(
                  null,
                );
                onSaveChange(true);
              }}
            >
              네, 전부 삭제
            </button>{" "}

            <button
              className="btn-ghost small"
              onClick={() => {
                playSfx("click");
                setConfirmReset(false);
              }}
            >
              취소
            </button>
          </span>
        )}
      </div>
    </div>
  );
}