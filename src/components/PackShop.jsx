import React, { useState, useRef } from "react";
import {
  PACKS,
  RARITY_NAME,
  BALL_SPRITES,
  UI_SPRITES,
  RARITY_BALL,
} from "../data/cards.js";
import { openPack } from "../state/save.js";
import { HandCard, useInspect } from "./Card.jsx";
import { playSfx, playCry } from "../audio.js";

// 레어도별 몬스터볼 카드백 (플립 애니메이션과 충돌하지 않게 정적)
// C: 몬스터볼 / R: 슈퍼볼 / E: 하이퍼볼 / L: 마스터볼
function CardBack({ rarity }) {
  const ball = BALL_SPRITES[RARITY_BALL[rarity] || "poke"];
  return (
    <div className={`card-back cb-rarity-${rarity}`}>
      <div className="cb-frame">
        <div className="cb-logo">POKE STONE</div>
        <img
          className="cb-ball"
          src={ball}
          alt=""
          width={52}
          height={52}
          draggable={false}
        />
        <div className="cb-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="cb-shine" />
    </div>
  );
}

export default function PackShop({ save, onSaveChange, onBack }) {
  const [result, setResult] = useState(null);
  const [flipped, setFlipped] = useState([]);
  const [legendFlash, setLegendFlash] = useState(null);
  const [settled, setSettled] = useState([]);
  const [packRound, setPackRound] = useState(0);

  const openedRef = useRef(new Set());
  const packSeqRef = useRef(0);

  const { inspect, press } = useInspect();

  const [lastPack, setLastPack] = useState("basic");

  function buyPack(packId = lastPack) {
    const pack = PACKS[packId];

    if (save.money < pack.price) {
      playSfx("buzzer");
      return;
    }

    const r = openPack(save, packId);
    if (!r) return;

    // 이전 팩의 비동기 플립 처리를 무효화
    packSeqRef.current += 1;
    openedRef.current = new Set();

    setLastPack(packId);
    setFlipped([]);
    setSettled([]);
    setLegendFlash(null);

    playSfx("buy");

    setResult(r);

    // 카드 DOM도 새 팩마다 새로 생성
    setPackRound((n) => n + 1);

    onSaveChange();
  }

  function flipCard(i) {
    if (!result) return;

    // 같은 카드 중복 플립 방지
    if (openedRef.current.has(i)) return;
    openedRef.current.add(i);

    const seq = packSeqRef.current;
    const card = result.cards[i]?.card;

    if (card?.rarity === "L") {
      playCry(card.id);
      setLegendFlash(i);

      setTimeout(() => {
        if (packSeqRef.current !== seq) return;
        setLegendFlash(null);
      }, 1800);
    } else {
      playSfx("click");
    }

    setFlipped((f) => (f.includes(i) ? f : [...f, i]));

    setTimeout(
      () => {
        // 그 사이 새 팩을 열었으면 이전 팩 타이머 무시
        if (packSeqRef.current !== seq) return;

        setSettled((st) => (st.includes(i) ? st : [...st, i]));
      },
      card?.rarity === "L" ? 900 : 600,
    );
  }

  function revealAll() {
    if (!result) return;

    result.cards.forEach((_, i) => {
      flipCard(i);
    });
  }

  const allRevealed = !!result && settled.length >= result.cards.length;

  return (
    <div className="pack-shop">
      {inspect && (
        <div className="inspect-overlay">
          <HandCard cardId={inspect.cardId} shiny={!!inspect.shiny} playable ghost />
        </div>
      )}
      <div className="screen-header">
        {!result ? (
          <button
            className="btn-ghost"
            onClick={() => {
              playSfx("click");
              onBack();
            }}
          >
            ← 돌아가기
          </button>
        ) : (
          <div className="pack-header-spacer" />
        )}

        <h2>카드팩 상점</h2>

        <div className="money-display">
          <img
            className="res-icon"
            src={UI_SPRITES.coin}
            alt="돈"
            width={20}
            height={20}
            draggable={false}
          />
          {save.money}
        </div>
      </div>

      {!result && (
        <div className="pack-buy-area">
          <div className="pack-section-label">기본 팩</div>
          <div className="pack-row">
            {Object.values(PACKS)
              .filter((p) => !p.legendPool && !p.generation)
              .map((pack) => (
                <div key={pack.id} className={`pack-column pack-${pack.id}`}>
                  <div
                    className={`pack-visual ${save.money < pack.price ? "pack-locked" : ""}`}
                    onMouseEnter={() => playSfx("cursor")}
                    onClick={() => buyPack(pack.id)}
                  >
                    <div className="pack-foil-top" />
                    <img
                      className="pack-ball"
                      src={BALL_SPRITES[pack.ball]}
                      alt=""
                      width={72}
                      height={72}
                      draggable={false}
                    />
                    <div className="pack-label">{pack.name}</div>
                    <div className="pack-sublabel">{pack.sub}</div>
                    <div className="pack-price">
                      {pack.price} · 5장 · {RARITY_NAME[pack.guarantee]} 이상
                      1장 보장
                    </div>
                    <div className="pack-foil-bottom" />
                  </div>
                  <button
                    className={`btn-primary ${pack.id === "premium" ? "btn-premium" : ""} ${save.money < pack.price ? "btn-locked" : ""}`}
                    onMouseEnter={() =>
                      save.money >= pack.price && playSfx("cursor")
                    }
                    onClick={() => buyPack(pack.id)}
                  >
                    {save.money >= pack.price ? "팩 개봉!" : "돈이 부족하다..."}
                  </button>
                </div>
              ))}
          </div>
          <div className="pack-section-label pack-section-legend">
            ✦ 레전드 테마팩 — 레전드 확률 4%, 특정 레전드만 등장
          </div>
          <div className="pack-row">
            {Object.values(PACKS)
              .filter((p) => !!p.legendPool)
              .map((pack) => (
                <div key={pack.id} className={`pack-column pack-${pack.id}`}>
                  <div
                    className={`pack-visual pack-legend-theme ${save.money < pack.price ? "pack-locked" : ""}`}
                    onMouseEnter={() => playSfx("cursor")}
                    onClick={() => buyPack(pack.id)}
                  >
                    <div className="pack-foil-top" />
                    <img
                      className="pack-ball"
                      src={BALL_SPRITES[pack.ball]}
                      alt=""
                      width={72}
                      height={72}
                      draggable={false}
                    />
                    <div className="pack-label">{pack.name}</div>
                    <div className="pack-sublabel">{pack.sub}</div>
                    <div className="pack-price">
                      {pack.price} · 5장 · {RARITY_NAME[pack.guarantee]} 이상
                      1장 보장
                    </div>
                    <div className="pack-foil-bottom" />
                  </div>
                  <button
                    className={`btn-primary btn-legend-pack ${save.money < pack.price ? "btn-locked" : ""}`}
                    onMouseEnter={() =>
                      save.money >= pack.price && playSfx("cursor")
                    }
                    onClick={() => buyPack(pack.id)}
                  >
                    {save.money >= pack.price ? "팩 개봉!" : "돈이 부족하다..."}
                  </button>
                </div>
              ))}
          </div>
          <div className="pack-section-label">세대별 포켓몬팩</div>

          <div className="pack-row">
            {Object.values(PACKS)
              .filter((p) => !!p.generation)
              .map((pack) => (
                <div key={pack.id} className={`pack-column pack-${pack.id}`}>
                  <div
                    className={`pack-visual pack-generation ${
                      save.money < pack.price ? "pack-locked" : ""
                    }`}
                    onMouseEnter={() => playSfx("cursor")}
                    onClick={() => buyPack(pack.id)}
                  >
                    <div className="pack-foil-top" />

                    <img
                      className="pack-ball"
                      src={BALL_SPRITES[pack.ball]}
                      alt=""
                      width={72}
                      height={72}
                      draggable={false}
                    />

                    <div className="pack-label">{pack.name}</div>

                    <div className="pack-sublabel">{pack.sub}</div>

                    <div className="pack-price">
                      {pack.price} · 5장 · {RARITY_NAME[pack.guarantee]} 이상
                      1장 보장
                    </div>

                    <div className="pack-foil-bottom" />
                  </div>

                  <button
                    className={`btn-primary ${
                      save.money < pack.price ? "btn-locked" : ""
                    }`}
                    onMouseEnter={() =>
                      save.money >= pack.price && playSfx("cursor")
                    }
                    onClick={() => buyPack(pack.id)}
                  >
                    {save.money >= pack.price ? "팩 개봉!" : "돈이 부족하다..."}
                  </button>
                </div>
              ))}
          </div>
          <p className="pack-note">
            같은 카드는 2장(레전드 1장)까지 보관됩니다. 이미 가진 포켓몬이 다시 나오면
            5% 확률로 이로치가 되며, 초과 일반 카드는 자동 환급돼요.
          </p>
        </div>
      )}

      {result && (
        <div className="pack-open-area">
          <div className="pack-cards" key={packRound}>
            {result.cards.map((r, i) => {
              const front = (
                <div className={`pack-card-wrap ${r.shiny ? "pack-card-shiny" : ""}`}>
                  <HandCard
                    cardId={r.card.id}
                    shiny={!!r.shiny}
                    playable
                    onPointerDown={press({ cardId: r.card.id, shiny: !!r.shiny })}
                  />
                  <div className={`rarity-tag rarity-${r.card.rarity}`}>
                    {RARITY_NAME[r.card.rarity]}
                    {r.shiny && <span className="shiny-pack-label"> ✨ 이로치!</span>}
                    {r.refunded > 0 && (
                      <span className="refund"> (중복 +{r.refunded}원)</span>
                    )}
                  </div>
                </div>
              );
              // 플립 완료: 3D 래퍼 없이 렌더 -> 틸트/홀로 정상 작동
              if (settled.includes(i)) {
                return (
                  <div key={i} className="flip-card settled">
                    {front}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={`flip-card ${flipped.includes(i) ? "flipped" : ""} ${legendFlash === i ? "legend-flip" : ""} ${r.shiny ? "shiny-flip" : ""}`}
                  onClick={() => flipCard(i)}
                >
                  <div className="flip-inner">
                    <div className="flip-face flip-back">
                      <CardBack rarity={r.card.rarity} />
                    </div>
                    <div className="flip-face flip-front">{front}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {!allRevealed && (
            <div className="reveal-actions">
              <p className="reveal-hint">뒤집고 싶은 카드를 눌러보자!</p>

              <button
                className="btn-secondary btn-reveal-all"
                onMouseEnter={() => playSfx("cursor")}
                onClick={revealAll}
              >
                일괄 개봉
              </button>
            </div>
          )}
          {allRevealed && (
            <div className="pack-done">
              {result.refundTotal > 0 && (
                <p>중복 환급 합계: +{result.refundTotal}원</p>
              )}
              <button
                className="btn-primary"
                onMouseEnter={() => playSfx("cursor")}
                onClick={() => {
                  playSfx("click");

                  packSeqRef.current += 1;
                  openedRef.current = new Set();

                  setFlipped([]);
                  setSettled([]);
                  setLegendFlash(null);
                  setResult(null);
                }}
              >
                확인
              </button>
              <button
                className={`btn-secondary ${
                  save.money < PACKS[lastPack].price ? "btn-locked" : ""
                }`}
                onMouseEnter={() =>
                  save.money >= PACKS[lastPack].price && playSfx("cursor")
                }
                onClick={() => {
                  if (save.money < PACKS[lastPack].price) {
                    playSfx("buzzer");
                    return;
                  }

                  buyPack(lastPack);
                }}
              >
                한 팩 더! ({PACKS[lastPack].price})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
