import React, { useState, useMemo } from 'react';
import { CARDS, CARD_MAP, MAX_COPIES, TYPE_COLORS, RARITY_NAME, DEX } from '../data/cards.js';
import { persist } from '../state/save.js';
import { HandCard, Sprite, useInspect } from './Card.jsx';
import { playSfx } from '../audio.js';

const TYPE_FILTERS = ['전체', '물', '불꽃', '풀', '전기', '얼음', '격투', '독', '땅', '비행', '에스퍼', '벌레', '바위', '고스트', '드래곤', '악', '강철', '페어리', '노말', '기술', '도구'];

export default function DeckEditor({ save, onSaveChange, onBack }) {
  const [filter, setFilter] = useState('전체');
  const [sortMode, setSortMode] = useState('cost'); // 'dex' | 'cost' | 'rarity_desc' | 'rarity_asc'
  const { inspect, press, clickSuppressed } = useInspect();

  const deckCounts = useMemo(() => {
    const c = {};
    save.deck.forEach((id) => (c[id] = (c[id] || 0) + 1));
    return c;
  }, [save.deck]);

  const ownedCards = useMemo(() => {
    return CARDS
      .filter((card) => (save.collection[card.id] || 0) > 0)
      .filter((card) => filter === '전체' || card.type === filter)
      .sort((a, b) => {
        const RARITY_ORDER = { C: 0, R: 1, E: 2, L: 3 };
        if (sortMode === 'dex') {
          const da = DEX[a.id] ?? 99999, db = DEX[b.id] ?? 99999;
          return da - db || a.name.localeCompare(b.name);
        }
        if (sortMode === 'rarity_desc') return (RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]) || (a.cost - b.cost);
        if (sortMode === 'rarity_asc') return (RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]) || (a.cost - b.cost);
        return a.cost - b.cost || a.name.localeCompare(b.name); // 'cost' (기본)
      });
  }, [save.collection, filter]);

  function addToDeck(cardId) {
    if (clickSuppressed()) return;
    const card = CARD_MAP[cardId];
    const inDeck = save.deck.filter((id) => id === cardId).length; // 항상 실제 덱 기준
    const owned = save.collection[cardId] || 0;
    const max = Math.min(MAX_COPIES[card.rarity], owned);
    if (save.deck.length >= 30 || inDeck >= max) { playSfx('buzzer'); return; }
    save.deck = [...save.deck, cardId]; // 새 배열로 교체 -> 메모/리렌더 정상 갱신
    persist(save);
    playSfx('pickup');
    onSaveChange();
  }

  function removeFromDeck(cardId) {
    const idx = save.deck.indexOf(cardId);
    if (idx === -1) return;
    save.deck = [...save.deck.slice(0, idx), ...save.deck.slice(idx + 1)]; // 새 배열로 교체
    persist(save);
    playSfx('putdown');
    onSaveChange();
  }

  // 덱 목록 (그룹핑)
  const deckList = useMemo(() => {
    const ids = [...new Set(save.deck)];
    return ids
      .map((id) => ({ card: CARD_MAP[id], count: deckCounts[id] }))
      .sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
  }, [save.deck, deckCounts]);

  return (
    <div className="deck-editor">
      {inspect && (
        <div className="inspect-overlay">
          <HandCard cardId={inspect.cardId} playable ghost />
        </div>
      )}

      <div className="editor-topbar">
        <div className="screen-header">
          <button className="btn-ghost" onClick={() => { playSfx('click'); onBack(); }}>← 돌아가기</button>
          <h2>컬렉션 · 덱 편집</h2>
          <div className={`deck-count ${save.deck.length === 30 ? 'ok' : 'warn'}`}>
            덱 {save.deck.length}/30
          </div>
        </div>
        <div className="type-filters">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              className={`filter-btn ${filter === t ? 'active' : ''}`}
              style={t !== '전체' ? { '--type-color': TYPE_COLORS[t] } : {}}
              onMouseEnter={() => playSfx('cursor')}
              onClick={() => { playSfx('click'); setFilter(t); }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <div className="sort-row">
          {[
            { key: 'dex', label: '도감번호순' },
            { key: 'cost', label: '코스트순' },
            { key: 'rarity_desc', label: '등급 높은순' },
            { key: 'rarity_asc', label: '등급 낮은순' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`sort-btn ${sortMode === key ? 'active' : ''}`}
              onClick={() => { playSfx('click'); setSortMode(key); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-layout">
        {/* 컬렉션 */}
        <div className="collection-pane">
          <div className="collection-grid">
            {ownedCards.map((card) => {
              const owned = save.collection[card.id];
              const inDeck = deckCounts[card.id] || 0;
              const max = Math.min(MAX_COPIES[card.rarity], owned);
              return (
                <div key={card.id} className="collection-item">
                  <HandCard
                    cardId={card.id}
                    playable={inDeck < max && save.deck.length < 30}
                    onClick={() => addToDeck(card.id)}
                    onPointerDown={press({ cardId: card.id })}
                  />
                  <div className="collection-meta">
                    보유 {owned} · 덱 {inDeck}/{max}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 덱 리스트 */}
        <div className="deck-pane">
          <h3>내 덱</h3>
          {deckList.map(({ card, count }) => (
            <div
              key={card.id}
              className="deck-row"
              style={{ '--type-color': TYPE_COLORS[card.type] }}
              onClick={() => removeFromDeck(card.id)}
              title="클릭하면 1장 제거"
            >
              <span className="deck-row-cost">{card.cost}</span>
              <span className="deck-row-emoji"><Sprite cardId={card.id} emoji={card.emoji} size={22} /></span>
              <span className="deck-row-name">{card.name}</span>
              <span className="deck-row-count">×{count}</span>
            </div>
          ))}
          {save.deck.length < 30 && (
            <p className="deck-warning">덱이 30장이 되어야 배틀할 수 있어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
