import React, { useState, useMemo, useRef, useLayoutEffect } from "react";
import {
  CARDS,
  CARD_MAP,
  MAX_COPIES,
  MAX_LEGENDARY_POKEMON,
  isLegendaryPokemon,
  TYPE_COLORS,
  DEX,
  ABILITY_TEXT,
} from "../data/cards.js";
import { persist } from "../state/save.js";
import { HandCard, Sprite, useInspect } from "./Card.jsx";
import { playSfx } from "../audio.js";

const TYPE_FILTERS = [
  "전체",
  "물",
  "불꽃",
  "풀",
  "전기",
  "얼음",
  "격투",
  "독",
  "땅",
  "비행",
  "에스퍼",
  "벌레",
  "바위",
  "고스트",
  "드래곤",
  "악",
  "강철",
  "페어리",
  "노말",
  "기술",
  "도구",
  "퀘스트",
];

const MOBILE_PAGE_SIZE = 20;

function getAbilityLabel(abilityId) {
  const text = ABILITY_TEXT[abilityId];

  if (!text) {
    return abilityId;
  }

  return text.split(":")[0].trim();
}

function getCardAbilities(card) {
  return [card.ability, card.secondaryAbility, card.mega?.ability].filter(Boolean);
}

function buildEvolutionFamilyMap() {
  const pokemonCards = CARDS.filter((card) => card.kind === "pokemon");
  const graph = new Map();

  pokemonCards.forEach((card) => {
    graph.set(card.id, new Set());
  });

  pokemonCards.forEach((card) => {
    if (!card.evolvesFrom || !graph.has(card.evolvesFrom)) {
      return;
    }

    graph.get(card.id).add(card.evolvesFrom);
    graph.get(card.evolvesFrom).add(card.id);
  });

  const familyMap = new Map();

  pokemonCards.forEach((card) => {
    if (familyMap.has(card.id)) {
      return;
    }

    const visited = new Set();
    const stack = [card.id];

    while (stack.length) {
      const id = stack.pop();

      if (visited.has(id)) {
        continue;
      }

      visited.add(id);

      graph.get(id)?.forEach((nextId) => {
        if (!visited.has(nextId)) {
          stack.push(nextId);
        }
      });
    }

    const family = [...visited];

    family.forEach((id) => {
      familyMap.set(id, family);
    });
  });

  return familyMap;
}

const EVOLUTION_FAMILY_MAP = buildEvolutionFamilyMap();

function isMobileCollectionDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 1024px)").matches
  );
}

export default function DeckEditor({ save, onSaveChange, onBack }) {
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("cost");
  const [abilityFilters, setAbilityFilters] = useState([]);
  const [mobilePage, setMobilePage] = useState(0);
  const { inspect, press, clickSuppressed } = useInspect();

  const mobileLite = useMemo(() => isMobileCollectionDevice(), []);

  function resetMobilePage() {
    if (mobileLite) {
      setMobilePage(0);
    }
  }

  function toggleAbilityFilter(abilityId) {
    resetMobilePage();
    setAbilityFilters((prev) =>
      prev.includes(abilityId)
        ? prev.filter((id) => id !== abilityId)
        : [...prev, abilityId],
    );

    playSfx("click");
  }

  const activePreset = save.activeDeckPreset || 0;
  const presets = save.deckPresets || [];

  const deckCounts = useMemo(() => {
    const c = {};
    save.deck.forEach((id) => (c[id] = (c[id] || 0) + 1));
    return c;
  }, [save.deck]);

  const abilityOptions = useMemo(() => {
    const ids = new Set();

    CARDS.forEach((card) => {
      if (!save.collection[card.id]) {
        return;
      }

      getCardAbilities(card).forEach((abilityId) => ids.add(abilityId));
    });

    return [...ids]
      .map((id) => ({
        id,
        label: getAbilityLabel(id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [save.collection]);

  const legendaryPokemonCount = useMemo(() => {
    return save.deck.reduce((count, id) => {
      const card = CARD_MAP[id];
      return count + (isLegendaryPokemon(card) ? 1 : 0);
    }, 0);
  }, [save.deck]);

  const searchMatchIds = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return null;
    }

    const result = new Set();
    const directMatches = CARDS.filter(
      (card) =>
        card.name.toLowerCase().includes(q) ||
        card.id.toLowerCase().includes(q),
    );

    directMatches.forEach((card) => {
      result.add(card.id);

      if (card.kind === "pokemon") {
        const family = EVOLUTION_FAMILY_MAP.get(card.id);
        family?.forEach((id) => result.add(id));
      }
    });

    return result;
  }, [search]);

  const ownedCards = useMemo(() => {
    return CARDS.filter((card) => (save.collection[card.id] || 0) > 0)
      .filter((card) => filter === "전체" || card.type === filter)
      .filter((card) => {
        if (abilityFilters.length === 0) {
          return true;
        }

        const abilities = getCardAbilities(card);
        return abilityFilters.some((abilityId) => abilities.includes(abilityId));
      })
      .filter((card) => {
        if (!searchMatchIds) {
          return true;
        }

        return searchMatchIds.has(card.id);
      })
      .sort((a, b) => {
        const RARITY_ORDER = {
          C: 0,
          R: 1,
          E: 2,
          L: 3,
        };

        if (sortMode === "dex") {
          const da = DEX[a.id] ?? 99999;
          const db = DEX[b.id] ?? 99999;
          return da - db || a.name.localeCompare(b.name);
        }

        if (sortMode === "rarity_desc") {
          return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.cost - b.cost;
        }

        if (sortMode === "rarity_asc") {
          return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.cost - b.cost;
        }

        return a.cost - b.cost || a.name.localeCompare(b.name);
      });
  }, [save.collection, filter, searchMatchIds, abilityFilters, sortMode]);

  const mobilePageCount = mobileLite
    ? Math.max(1, Math.ceil(ownedCards.length / MOBILE_PAGE_SIZE))
    : 1;
  const safeMobilePage = Math.min(mobilePage, mobilePageCount - 1);
  const visibleOwnedCards = mobileLite
    ? ownedCards.slice(
        safeMobilePage * MOBILE_PAGE_SIZE,
        (safeMobilePage + 1) * MOBILE_PAGE_SIZE,
      )
    : ownedCards;

  const collectionGridRef = useRef(null);
  const collectionPaneRef = useRef(null);
  const previousCardRectsRef = useRef(new Map());
  const deckNameInputRef = useRef(null);

  function captureCardPositions() {
    if (mobileLite) {
      return;
    }

    const grid = collectionGridRef.current;
    if (!grid) return;

    const rects = new Map();

    grid.querySelectorAll("[data-card-id]").forEach((el) => {
      rects.set(el.dataset.cardId, el.getBoundingClientRect());
    });

    previousCardRectsRef.current = rects;
  }

  function changeMobilePage(nextPage) {
    const clamped = Math.max(0, Math.min(nextPage, mobilePageCount - 1));
    setMobilePage(clamped);
    collectionPaneRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }

  useLayoutEffect(() => {
    if (mobileLite) {
      previousCardRectsRef.current = new Map();
      return;
    }

    const grid = collectionGridRef.current;
    if (!grid) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const previousRects = previousCardRectsRef.current;

    grid.querySelectorAll("[data-card-id]").forEach((el) => {
      const cardId = el.dataset.cardId;
      const newRect = el.getBoundingClientRect();
      const oldRect = previousRects.get(cardId);

      if (oldRect) {
        const deltaX = oldRect.left - newRect.left;
        const deltaY = oldRect.top - newRect.top;

        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          el.getAnimations().forEach((animation) => animation.cancel());
          el.animate(
            [
              { transform: `translate(${deltaX}px, ${deltaY}px)` },
              { transform: "translate(0, 0)" },
            ],
            {
              duration: 240,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            },
          );
        }

        return;
      }

      el.getAnimations().forEach((animation) => animation.cancel());
      el.animate(
        [
          { opacity: 0, transform: "translateY(8px) scale(0.96)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        {
          duration: 180,
          easing: "ease-out",
        },
      );
    });

    previousCardRectsRef.current = new Map();
  }, [ownedCards, mobileLite]);

  function addToDeck(cardId) {
    if (clickSuppressed()) return;

    const card = CARD_MAP[cardId];
    const inDeck = save.deck.filter((id) => id === cardId).length;
    const owned = save.collection[cardId] || 0;
    const max = Math.min(MAX_COPIES[card.rarity], owned);

    if (save.deck.length >= 30 || inDeck >= max) {
      playSfx("buzzer");
      return;
    }

    if (
      !save.adminMode &&
      isLegendaryPokemon(card) &&
      legendaryPokemonCount >= MAX_LEGENDARY_POKEMON
    ) {
      playSfx("buzzer");
      return;
    }

    save.deck = [...save.deck, cardId];
    syncActivePreset(save.deck);
    persist(save);
    playSfx("pickup");
    onSaveChange();
  }

  function removeFromDeck(cardId) {
    const idx = save.deck.indexOf(cardId);
    if (idx === -1) return;

    save.deck = [...save.deck.slice(0, idx), ...save.deck.slice(idx + 1)];
    syncActivePreset(save.deck);
    persist(save);
    playSfx("putdown");
    onSaveChange();
  }

  function clearDeck() {
    if (save.deck.length === 0) {
      return;
    }

    save.deck = [];
    syncActivePreset([]);
    persist(save);
    playSfx("putdown");
    onSaveChange();
  }

  const deckList = useMemo(() => {
    const ids = [...new Set(save.deck)];
    return ids
      .map((id) => ({ card: CARD_MAP[id], count: deckCounts[id] }))
      .sort(
        (a, b) =>
          a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name),
      );
  }, [save.deck, deckCounts]);

  function syncActivePreset(deck = save.deck) {
    if (!Array.isArray(save.deckPresets)) {
      return;
    }

    save.deckPresets = save.deckPresets.map((preset, index) =>
      index === save.activeDeckPreset
        ? {
            ...preset,
            deck: [...deck],
          }
        : preset,
    );
  }

  function selectPreset(index) {
    if (index === save.activeDeckPreset) {
      return;
    }

    playSfx("click");
    syncActivePreset(save.deck);

    const nextPreset = save.deckPresets[index];
    save.activeDeckPreset = index;
    save.deck = [...(nextPreset?.deck || [])];

    persist(save);
    onSaveChange();
  }

  function renamePreset(index, value) {
    const name = value.trim() || `덱 ${index + 1}`;

    save.deckPresets = save.deckPresets.map((preset, i) =>
      i === index
        ? {
            ...preset,
            name,
          }
        : preset,
    );

    persist(save);
    onSaveChange();
  }

  return (
    <div
      className="deck-editor"
      style={{
        height: "calc(100dvh - 24px)",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {inspect && (
        <div className="inspect-overlay">
          <HandCard cardId={inspect.cardId} playable ghost />
        </div>
      )}

      <div className="editor-topbar" style={{ flex: "0 0 auto" }}>
        <div className="screen-header">
          <button
            className="btn-ghost"
            onClick={() => {
              playSfx("click");
              onBack();
            }}
          >
            ← 돌아가기
          </button>
          <h2>컬렉션 · 덱 편집</h2>
          <div
            className={`deck-count ${save.deck.length === 30 ? "ok" : "warn"}`}
          >
            덱 {save.deck.length}/30 · 전설 {legendaryPokemonCount}/3
          </div>
        </div>

        <div className="deck-search-row">
          <span className="deck-search-icon">🔎</span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              captureCardPositions();
              resetMobilePage();
              setSearch(e.target.value);
            }}
            placeholder="카드 이름 검색"
            className="deck-search-input"
          />

          {search && (
            <button
              type="button"
              className="deck-search-clear"
              onClick={() => {
                captureCardPositions();
                resetMobilePage();
                setSearch("");
              }}
            >
              ×
            </button>
          )}
        </div>

        <div className="type-filters">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              className={`filter-btn ${filter === t ? "active" : ""}`}
              style={t !== "전체" ? { "--type-color": TYPE_COLORS[t] } : {}}
              onMouseEnter={() => playSfx("cursor")}
              onClick={() => {
                playSfx("click");
                captureCardPositions();
                resetMobilePage();
                setFilter(t);
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <details className="ability-filter-box">
          <summary>
            특성 필터
            {abilityFilters.length > 0 && ` (${abilityFilters.length})`}
          </summary>

          <div className="ability-filter-list">
            {abilityOptions.map(({ id, label }) => (
              <label
                key={id}
                className={[
                  "ability-filter-check",
                  abilityFilters.includes(id) ? "active" : "",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={abilityFilters.includes(id)}
                  onChange={() => toggleAbilityFilter(id)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {abilityFilters.length > 0 && (
            <button
              type="button"
              className="ability-filter-reset"
              onClick={() => {
                playSfx("click");
                resetMobilePage();
                setAbilityFilters([]);
              }}
            >
              특성 필터 초기화
            </button>
          )}
        </details>

        <div className="sort-row">
          {[
            { key: "dex", label: "도감번호순" },
            { key: "cost", label: "코스트순" },
            { key: "rarity_desc", label: "등급 높은순" },
            { key: "rarity_asc", label: "등급 낮은순" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`sort-btn ${sortMode === key ? "active" : ""}`}
              onClick={() => {
                playSfx("click");
                captureCardPositions();
                resetMobilePage();
                setSortMode(key);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="editor-layout"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "hidden",
          alignItems: "stretch",
        }}
      >
        <div
          ref={collectionPaneRef}
          className="collection-pane"
          style={{
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehaviorY: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {mobileLite && ownedCards.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                margin: "0 0 10px",
                padding: "6px 8px",
                fontSize: "11px",
                opacity: 0.85,
              }}
            >
              <span>
                카드 {safeMobilePage * MOBILE_PAGE_SIZE + 1}-
                {Math.min((safeMobilePage + 1) * MOBILE_PAGE_SIZE, ownedCards.length)} / {ownedCards.length}
              </span>
              <span>모바일 경량 모드</span>
            </div>
          )}

          <div className="collection-grid" ref={collectionGridRef}>
            {visibleOwnedCards.map((card) => {
              const owned = save.collection[card.id];
              const inDeck = deckCounts[card.id] || 0;
              const max = Math.min(MAX_COPIES[card.rarity], owned);

              return (
                <div
                  key={card.id}
                  className="collection-item"
                  data-card-id={card.id}
                >
                  <HandCard
                    cardId={card.id}
                    playable={
                      inDeck < max &&
                      save.deck.length < 30 &&
                      (save.adminMode ||
                        !isLegendaryPokemon(card) ||
                        legendaryPokemonCount < MAX_LEGENDARY_POKEMON)
                    }
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

          {mobileLite && mobilePageCount > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "14px 6px 8px",
              }}
            >
              <button
                type="button"
                className="btn-ghost small"
                disabled={safeMobilePage === 0}
                onClick={() => changeMobilePage(safeMobilePage - 1)}
              >
                ← 이전
              </button>
              <span style={{ minWidth: "58px", textAlign: "center", fontSize: "12px" }}>
                {safeMobilePage + 1} / {mobilePageCount}
              </span>
              <button
                type="button"
                className="btn-ghost small"
                disabled={safeMobilePage >= mobilePageCount - 1}
                onClick={() => changeMobilePage(safeMobilePage + 1)}
              >
                다음 →
              </button>
            </div>
          )}
        </div>

        <div
          className="deck-pane"
          style={{
            position: "static",
            top: "auto",
            height: "100%",
            maxHeight: "none",
            alignSelf: "stretch",
            overflow: "hidden",
          }}
        >
          <div className="deck-preset-panel">
            <div className="deck-preset-tabs">
              {presets.map((preset, index) => (
                <button
                  key={index}
                  className={`deck-preset-btn ${
                    activePreset === index ? "active" : ""
                  }`}
                  onClick={() => selectPreset(index)}
                >
                  <span className="deck-preset-name">{preset.name}</span>
                  <span className="deck-preset-count">
                    {activePreset === index ? save.deck.length : preset.deck.length}
                    /30
                  </span>
                </button>
              ))}
            </div>

            <div className="deck-name-editor">
              <span>덱 이름</span>
              <input
                ref={deckNameInputRef}
                key={`${activePreset}-${presets[activePreset]?.name}`}
                type="text"
                maxLength={16}
                defaultValue={
                  presets[activePreset]?.name || `덱 ${activePreset + 1}`
                }
              />
              <button
                type="button"
                className="btn-secondary"
                style={{
                  flexShrink: 0,
                  padding: "6px 10px",
                  fontSize: "11px",
                }}
                onClick={() => {
                  playSfx("click");
                  renamePreset(
                    activePreset,
                    deckNameInputRef.current?.value || "",
                  );
                }}
              >
                수정
              </button>
            </div>

            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <h3 style={{ margin: 0 }}>내 덱</h3>
              <button
                type="button"
                className="btn-ghost small danger"
                disabled={save.deck.length === 0}
                onClick={clearDeck}
                style={{
                  flexShrink: 0,
                  textDecoration: "none",
                  fontSize: "10px",
                }}
              >
                전체 제거
              </button>
            </div>
          </div>

          <div className="deck-card-list">
            {deckList.map(({ card, count }) => (
              <div
                key={card.id}
                className="deck-row"
                style={{ "--type-color": TYPE_COLORS[card.type] }}
                onClick={() => removeFromDeck(card.id)}
                title="클릭하면 1장 제거"
              >
                <span className="deck-row-cost">{card.cost}</span>
                <span className="deck-row-emoji">
                  <Sprite cardId={card.id} emoji={card.emoji} size={22} />
                </span>
                <span className="deck-row-name">{card.name}</span>
                <span className="deck-row-count">×{count}</span>
              </div>
            ))}

            {save.deck.length < 30 && (
              <p className="deck-warning">
                덱이 30장이 되어야 배틀할 수 있어요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
