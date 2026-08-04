import React, { useState } from 'react';
import { TRAINERS } from '../data/trainers.js';
import { resetSave } from '../state/save.js';
import { TrainerSprite } from './Card.jsx';
import { UI_SPRITES } from '../data/cards.js';

export default function MainMenu({ save, onBattle, onShop, onDeck, onSaveChange }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const deckReady = save.deck.length === 30;

  return (
    <div className="main-menu">
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
              onClick={() => deckReady && onBattle(t)}
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
        <button className="btn-secondary with-icon" onClick={onShop}>
          <img className="res-icon" src={UI_SPRITES.pokeball} alt="" width={20} height={20} draggable={false} />
          카드팩 상점
        </button>
        <button className="btn-secondary with-icon" onClick={onDeck}>
          <img className="res-icon" src={UI_SPRITES.map} alt="" width={20} height={20} draggable={false} />
          컬렉션 · 덱
        </button>
      </div>

      <div className="menu-footer">
        {!confirmReset ? (
          <button className="btn-ghost small" onClick={() => setConfirmReset(true)}>세이브 초기화</button>
        ) : (
          <span>
            정말 초기화할까요?{' '}
            <button className="btn-ghost small danger" onClick={() => { resetSave(); setConfirmReset(false); onSaveChange(true); }}>
              네, 전부 삭제
            </button>{' '}
            <button className="btn-ghost small" onClick={() => setConfirmReset(false)}>취소</button>
          </span>
        )}
      </div>
    </div>
  );
}
