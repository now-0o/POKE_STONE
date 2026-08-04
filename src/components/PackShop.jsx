import React, { useState } from 'react';
import { PACKS, RARITY_NAME, BALL_SPRITES, UI_SPRITES, RARITY_BALL } from '../data/cards.js';
import { openPack } from '../state/save.js';
import { HandCard, useInspect } from './Card.jsx';

// 레어도별 몬스터볼 카드백 (플립 애니메이션과 충돌하지 않게 정적)
// C: 몬스터볼 / R: 슈퍼볼 / E: 하이퍼볼 / L: 마스터볼
function CardBack({ rarity }) {
  const ball = BALL_SPRITES[RARITY_BALL[rarity] || 'poke'];
  return (
    <div className={`card-back cb-rarity-${rarity}`}>
      <div className="cb-frame">
        <div className="cb-logo">POKE STONE</div>
        <img className="cb-ball" src={ball} alt="" width={52} height={52} draggable={false} />
        <div className="cb-dots"><span /><span /><span /></div>
      </div>
      <div className="cb-shine" />
    </div>
  );
}

export default function PackShop({ save, onSaveChange, onBack }) {
  const [result, setResult] = useState(null);
  const [flipped, setFlipped] = useState([]); // 개별 클릭으로 오픈된 인덱스들
  const [settled, setSettled] = useState([]); // 플립 애니메이션까지 끝난 인덱스들
  const [leaving, setLeaving] = useState(false); // 자동 공개 후 퇴장 중
  const { inspect, press } = useInspect();

  const [lastPack, setLastPack] = useState('basic');

  function buyPack(packId = lastPack) {
    const pack = PACKS[packId];
    if (save.money < pack.price) return;
    setLastPack(packId);
    const r = openPack(save, packId);
    if (!r) return;
    setResult(r);
    setFlipped([]);
    setSettled([]);
    onSaveChange();
  }

  function flipCard(i) {
    if (flipped.includes(i)) return;
    setFlipped((f) => [...f, i]);
    setTimeout(() => setSettled((st) => [...st, i]), 600); // 플립(0.55s) 종료 후 정착
  }

  const allRevealed = result && flipped.length >= result.cards.length;

  // 안 뒤집은 카드가 있는 채로 나가면: 전부 자동 공개 -> 잠깐 보여주고 퇴장
  function handleBack() {
    if (leaving) return;
    if (result && !allRevealed) {
      setLeaving(true);
      setFlipped(result.cards.map((_, i) => i));
      setTimeout(onBack, 1600);
      return;
    }
    onBack();
  }

  return (
    <div className="pack-shop">
      {inspect && (
        <div className="inspect-overlay">
          <HandCard cardId={inspect.cardId} playable ghost />
        </div>
      )}
      <div className="screen-header">
        <button className="btn-ghost" onClick={handleBack}>{leaving ? '확인 중...' : '← 돌아가기'}</button>
        <h2>카드팩 상점</h2>
        <div className="money-display"><img className="res-icon" src={UI_SPRITES.coin} alt="돈" width={20} height={20} draggable={false} />{save.money}</div>
      </div>

      {!result && (
        <div className="pack-buy-area">
          <div className="pack-row">
            {Object.values(PACKS).map((pack) => (
              <div key={pack.id} className={`pack-column pack-${pack.id}`}>
                <div
                  className={`pack-visual ${save.money < pack.price ? 'pack-locked' : ''}`}
                  onClick={save.money >= pack.price ? () => buyPack(pack.id) : undefined}
                >
                  <div className="pack-foil-top" />
                  <img className="pack-ball" src={BALL_SPRITES[pack.ball]} alt="" width={72} height={72} draggable={false} />
                  <div className="pack-label">{pack.name}</div>
                  <div className="pack-sublabel">{pack.sub}</div>
                  <div className="pack-price">
                    {pack.price} · 5장 · {RARITY_NAME[pack.guarantee]} 이상 1장 보장
                  </div>
                  <div className="pack-foil-bottom" />
                </div>
                <button
                  className={`btn-primary ${pack.id === 'premium' ? 'btn-premium' : ''}`}
                  onClick={() => buyPack(pack.id)}
                  disabled={save.money < pack.price}
                >
                  {save.money >= pack.price ? '팩 개봉!' : '돈이 부족하다...'}
                </button>
              </div>
            ))}
          </div>
          <p className="pack-note">
            같은 카드는 2장(레전드 1장)까지 보관됩니다. 초과분은 자동으로 환급돼요.
          </p>
        </div>
      )}

      {result && (
        <div className="pack-open-area">
          <div className="pack-cards">
            {result.cards.map((r, i) => {
              const front = (
                <div className="pack-card-wrap">
                  <HandCard cardId={r.card.id} playable onPointerDown={press({ cardId: r.card.id })} />
                  <div className={`rarity-tag rarity-${r.card.rarity}`}>
                    {RARITY_NAME[r.card.rarity]}
                    {r.refunded > 0 && <span className="refund"> (중복 +{r.refunded}원)</span>}
                  </div>
                </div>
              );
              // 플립 완료: 3D 래퍼 없이 렌더 -> 틸트/홀로 정상 작동
              if (settled.includes(i)) {
                return <div key={i} className="flip-card settled">{front}</div>;
              }
              return (
                <div
                  key={i}
                  className={`flip-card ${flipped.includes(i) ? 'flipped' : ''}`}
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
          {!allRevealed && <p className="reveal-hint">뒤집고 싶은 카드를 눌러보자! 볼 종류가 힌트다.</p>}
          {allRevealed && (
            <div className="pack-done">
              {result.refundTotal > 0 && <p>중복 환급 합계: +{result.refundTotal}원</p>}
              <button className="btn-primary" onClick={() => setResult(null)}>확인</button>
              <button
                className="btn-secondary"
                onClick={() => { setResult(null); setTimeout(() => buyPack(lastPack), 0); }}
                disabled={save.money < PACKS[lastPack].price}
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
