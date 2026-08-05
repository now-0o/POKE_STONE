import React, { useState } from 'react';
import { TRAINERS } from '../data/trainers.js';
import { resetSave } from '../state/save.js';
import { TrainerSprite } from './Card.jsx';
import { UI_SPRITES } from '../data/cards.js';
import { playSfx } from '../audio.js';

export default function MainMenu({ save, username, onBattle, onShop, onDeck, onSaveChange, onLogout }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const deckReady = save.deck.length === 30;

  // 전체화면 진입 (전체화면 API는 사용자 클릭 같은 제스처 안에서만 호출 가능).
  // iOS Safari는 이 API를 사실상 지원하지 않아서 버튼을 눌러도 반응이 없을 수 있음 -
  // 그 경우엔 "공유 → 홈 화면에 추가"로 앱처럼 설치해서 쓰는 게 대안.
  function goFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) req.call(el).catch(() => {});
  }

  return (
    <div className="main-menu">
      <button className="btn-fullscreen" onMouseEnter={() => playSfx('cursor')} onClick={() => { playSfx('click'); goFullscreen(); }} title="전체화면">⛶</button>
      <div className="title-block">
        <h1 className="game-title">POKE STONE</h1>
        <p className="game-subtitle">FAN-MADE CARD BATTLE</p>
      </div>

      <div className="menu-money">
        <span className="res-item">
          <img className="res-icon" src={UI_SPRITES.coin} alt="돈" width={22} height={22} draggable={false} />
          {save.money}
        </span>
        <span className="res-item">
          <img className="res-icon" src={UI_SPRITES.pokeball} alt="개봉한 팩" width={22} height={22} draggable={false} />
          팩 {save.packsOpened}개 개봉
        </span>
      </div>

      <div className="trainer-list">
        {TRAINERS.map((t) => {
          const wins = save.wins[t.id] || 0;
          return (
            <button
              key={t.id}
              className="trainer-card"
              onMouseEnter={() => deckReady && playSfx('cursor')}
              onClick={() => { if (deckReady) { playSfx('click'); onBattle(t); } else playSfx('buzzer'); }}
              disabled={!deckReady}
            >
              <TrainerSprite spriteKey={t.sprite} emoji={t.emoji} size={56} />
              <span className="trainer-info">
                <span className="trainer-name">{t.name}</span>
                <span className="trainer-meta">
                  <img className="res-icon small" src={UI_SPRITES.coin} alt="" width={14} height={14} draggable={false} />
                  {t.reward}{wins > 0 && ` · 승리 ${wins}회`}
                </span>
              </span>
              <span className="trainer-go">배틀 ▶</span>
            </button>
          );
        })}
      </div>
      {!deckReady && <p className="deck-warning center">덱이 30장이 아니에요. 덱 편집에서 채워주세요!</p>}

      <div className="menu-buttons">
        <button className="btn-secondary with-icon" onMouseEnter={() => playSfx('cursor')} onClick={() => { playSfx('slide'); onShop(); }}>
          <img className="res-icon" src={UI_SPRITES.pokeball} alt="" width={20} height={20} draggable={false} />
          카드팩 상점
        </button>
        <button className="btn-secondary with-icon" onMouseEnter={() => playSfx('cursor')} onClick={() => { playSfx('pc'); onDeck(); }}>
          <img className="res-icon" src={UI_SPRITES.map} alt="" width={20} height={20} draggable={false} />
          컬렉션 · 덱
        </button>
      </div>

      <div className="menu-footer">
        {username && <span style={{ opacity: 0.55, marginRight: 10 }}>{username}님</span>}
        {onLogout && <button className="btn-ghost small" onClick={() => { playSfx('click'); onLogout(); }}>로그아웃</button>}
        {' '}
        {!confirmReset ? (
          <button className="btn-ghost small" onClick={() => { playSfx('click'); setConfirmReset(true); }}>세이브 초기화</button>
        ) : (
          <span>
            정말 초기화할까요?{' '}
            <button className="btn-ghost small danger" onClick={() => { playSfx('click'); resetSave(); setConfirmReset(false); onSaveChange(true); }}>
              네, 전부 삭제
            </button>{' '}
            <button className="btn-ghost small" onClick={() => { playSfx('click'); setConfirmReset(false); }}>취소</button>
          </span>
        )}
      </div>
    </div>
  );
}
