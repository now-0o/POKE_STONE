import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ABILITY_TEXT,
  CARDS,
  CARD_MAP,
  DEX,
  MAX_COPIES,
  MAX_LEGENDARY_POKEMON,
  TYPE_COLORS,
  isLegendaryPokemon,
} from "../data/cards.js";
import { persist } from "../state/save.js";
import { playSfx } from "../audio.js";
import { HandCard, Sprite, useInspect } from "./Card.jsx";
import "../styles/mobile-deck-editor.css";

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

const SORT_OPTIONS = [
  { key: "dex", label: "도감번호순" },
  { key: "cost", label: "코스트순" },
  { key: "rarity_desc", label: "등급 높은순" },
  { key: "rarity_asc", label: "등급 낮은순" },
];

const INITIAL_RENDER_COUNT = 28;
const OVERSCAN_CARDS = 10;

function getAbilityLabel(abilityId) {
  const text = ABILITY_TEXT[abilityId];
  return text ? text.split(":")[0].trim() : abilityId;
}

function getCardAbilities(card) {
  return [card.ability, card.secondaryAbility, card.mega?.ability].filter(Boolean);
}

function buildEvolutionFamilyMap() {
  const pokemonCards = CARDS.filter((card) => card.kind === "pokemon");
  const graph = new Map();

  pokemonCards.forEach((card) => graph.set(card.id, new Set()));

  pokemonCards.forEach((card) => {
    if (!card.evolvesFrom || !graph.has(card.evolvesFrom)) return;
    graph.get(card.id).add(card.evolvesFrom);
    graph.get(card.evolvesFrom).add(card.id);
  });

  const familyMap = new Map();

  pokemonCards.forEach((card) => {
    if (familyMap.has(card.id)) return;

    const visited = new Set();
    const stack = [card.id];

    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      graph.get(id)?.forEach((nextId) => {
        if (!visited.has(nextId)) stack.push(nextId);
      });
    }

    const family = [...visited];
    family.forEach((id) => familyMap.set(id, family));
  });

  return familyMap;
}

const EVOLUTION_FAMILY_MAP = buildEvolutionFamilyMap();

function sameVirtualWindow(a, b) {
  return (
    a.start === b.start &&
    a.end === b.end &&
    a.top === b.top &&
    a.totalHeight === b.totalHeight
  );
}

export default function MobileDeckEditor({ save, onSaveChange, onBack }) {
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("cost");
  const [abilityFilters, setAbilityFilters] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [virtualWindow, setVirtualWindow] = useState({
    start: 0,
    end: INITIAL_RENDER_COUNT,
    top: 0,
    totalHeight: 0,
  });

  const { inspect, press, clickSuppressed } = useInspect();
  const collectionPaneRef = useRef(null);
  const collectionGridRef = useRef(null);
  const deckNameInputRef = useRef(null);
  const virtualMetricsRef = useRef({ columns: 0, rowStep: 0 });
  const virtualRafRef = useRef(null);

  const activePreset = save.activeDeckPreset || 0;
  const presets = save.deckPresets || [];

  const deckCounts = useMemo(() => {
    const counts = {};
    save.deck.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [save.deck]);

  const legendaryPokemonCount = useMemo(() => {
    return save.deck.reduce((count, id) => {
      return count + (isLegendaryPokemon(CARD_MAP[id]) ? 1 : 0);
    }, 0);
  }, [save.deck]);

  const abilityOptions = useMemo(() => {
    const ids = new Set();

    CARDS.forEach((card) => {
      if (!save.collection[card.id]) return;
      getCardAbilities(card).forEach((abilityId) => ids.add(abilityId));
    });

    return [...ids]
      .map((id) => ({ id, label: getAbilityLabel(id) }))
      .sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [save.collection]);

  const searchMatchIds = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return null;

    const result = new Set();
    const directMatches = CARDS.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        card.id.toLowerCase().includes(query),
    );

    directMatches.forEach((card) => {
      result.add(card.id);
      if (card.kind === "pokemon") {
        EVOLUTION_FAMILY_MAP.get(card.id)?.forEach((id) => result.add(id));
      }
    });

    return result;
  }, [search]);

  const ownedCards = useMemo(() => {
    const rarityOrder = { C: 0, R: 1, E: 2, L: 3 };

    return CARDS.filter((card) => (save.collection[card.id] || 0) > 0)
      .filter((card) => filter === "전체" || card.type === filter)
      .filter((card) => {
        if (abilityFilters.length === 0) return true;
        const abilities = getCardAbilities(card);
        return abilityFilters.some((abilityId) => abilities.includes(abilityId));
      })
      .filter((card) => !searchMatchIds || searchMatchIds.has(card.id))
      .sort((a, b) => {
        if (sortMode === "dex") {
          const da = DEX[a.id] ?? 99999;
          const db = DEX[b.id] ?? 99999;
          return da - db || a.name.localeCompare(b.name);
        }

        if (sortMode === "rarity_desc") {
          return rarityOrder[b.rarity] - rarityOrder[a.rarity] || a.cost - b.cost;
        }

        if (sortMode === "rarity_asc") {
          return rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.cost - b.cost;
        }

        return a.cost - b.cost || a.name.localeCompare(b.name);
      });
  }, [save.collection, filter, abilityFilters, searchMatchIds, sortMode]);

  const deckList = useMemo(() => {
    return [...new Set(save.deck)]
      .map((id) => ({ card: CARD_MAP[id], count: deckCounts[id] }))
      .filter(({ card }) => Boolean(card))
      .sort(
        (a, b) =>
          a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name),
      );
  }, [save.deck, deckCounts]);

  const visibleCards = ownedCards.slice(
    Math.min(virtualWindow.start, ownedCards.length),
    Math.min(virtualWindow.end, ownedCards.length),
  );

  const sortLabel =
    SORT_OPTIONS.find((option) => option.key === sortMode)?.label || "코스트순";
  const filterSummary = [
    search.trim() ? `검색 ${search.trim()}` : null,
    filter !== "전체" ? filter : "전체 타입",
    abilityFilters.length > 0 ? `특성 ${abilityFilters.length}` : null,
    sortLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  function calculateVirtualWindow(columns, rowStep) {
    const pane = collectionPaneRef.current;
    if (!pane || columns <= 0 || rowStep <= 0) return;

    const totalRows = Math.ceil(ownedCards.length / columns);
    if (totalRows === 0) {
      const next = { start: 0, end: 0, top: 0, totalHeight: 0 };
      setVirtualWindow((prev) => (sameVirtualWindow(prev, next) ? prev : next));
      return;
    }

    const firstVisibleRow = Math.max(0, Math.floor(pane.scrollTop / rowStep));
    const lastVisibleRow = Math.min(
      totalRows - 1,
      Math.floor((pane.scrollTop + Math.max(1, pane.clientHeight - 1)) / rowStep),
    );
    const overscanRows = Math.max(1, Math.ceil(OVERSCAN_CARDS / columns));
    const startRow = Math.max(0, firstVisibleRow - overscanRows);
    const endRow = Math.min(totalRows - 1, lastVisibleRow + overscanRows);

    const next = {
      start: startRow * columns,
      end: Math.min(ownedCards.length, (endRow + 1) * columns),
      top: startRow * rowStep,
      totalHeight: totalRows * rowStep,
    };

    setVirtualWindow((prev) => (sameVirtualWindow(prev, next) ? prev : next));
  }

  function measureGrid() {
    const grid = collectionGridRef.current;
    const children = grid ? Array.from(grid.children) : [];
    if (!grid || children.length === 0) return;

    const firstTop = children[0].offsetTop;
    let columns = 0;

    while (
      columns < children.length &&
      Math.abs(children[columns].offsetTop - firstTop) < 1
    ) {
      columns += 1;
    }

    columns = Math.max(1, columns);
    let rowStep = 0;

    if (children.length > columns) {
      rowStep = children[columns].offsetTop - firstTop;
    }

    if (rowStep <= 0) {
      const style = window.getComputedStyle(grid);
      const gap = parseFloat(style.rowGap || style.gap || "0") || 0;
      rowStep = children[0].offsetHeight + gap;
    }

    if (rowStep <= 0) return;

    virtualMetricsRef.current = { columns, rowStep };
    calculateVirtualWindow(columns, rowStep);
  }

  function handleCollectionScroll() {
    if (virtualRafRef.current !== null) return;

    virtualRafRef.current = requestAnimationFrame(() => {
      virtualRafRef.current = null;
      const { columns, rowStep } = virtualMetricsRef.current;
      calculateVirtualWindow(columns, rowStep);
    });
  }

  useLayoutEffect(() => {
    const pane = collectionPaneRef.current;
    if (pane) pane.scrollTop = 0;

    virtualMetricsRef.current = { columns: 0, rowStep: 0 };
    setVirtualWindow({
      start: 0,
      end: Math.min(INITIAL_RENDER_COUNT, ownedCards.length),
      top: 0,
      totalHeight: 0,
    });
  }, [ownedCards]);

  useLayoutEffect(() => {
    measureGrid();
  }, [ownedCards.length, virtualWindow.start, virtualWindow.end]);

  useEffect(() => {
    const pane = collectionPaneRef.current;
    if (!pane || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      if (virtualRafRef.current !== null) return;
      virtualRafRef.current = requestAnimationFrame(() => {
        virtualRafRef.current = null;
        virtualMetricsRef.current = { columns: 0, rowStep: 0 };
        measureGrid();
      });
    });

    observer.observe(pane);

    return () => {
      observer.disconnect();
      if (virtualRafRef.current !== null) {
        cancelAnimationFrame(virtualRafRef.current);
        virtualRafRef.current = null;
      }
    };
  }, [ownedCards.length]);

  function syncActivePreset(deck = save.deck) {
    if (!Array.isArray(save.deckPresets)) return;

    save.deckPresets = save.deckPresets.map((preset, index) =>
      index === save.activeDeckPreset ? { ...preset, deck: [...deck] } : preset,
    );
  }

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
    const index = save.deck.indexOf(cardId);
    if (index === -1) return;

    save.deck = [...save.deck.slice(0, index), ...save.deck.slice(index + 1)];
    syncActivePreset(save.deck);
    persist(save);
    playSfx("putdown");
    onSaveChange();
  }

  function clearDeck() {
    if (save.deck.length === 0) return;
    save.deck = [];
    syncActivePreset([]);
    persist(save);
    playSfx("putdown");
    onSaveChange();
  }

  function selectPreset(index) {
    if (index === save.activeDeckPreset) return;

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

    save.deckPresets = save.deckPresets.map((preset, presetIndex) =>
      presetIndex === index ? { ...preset, name } : preset,
    );

    persist(save);
    onSaveChange();
  }

  function toggleAbilityFilter(abilityId) {
    playSfx("click");
    setAbilityFilters((prev) =>
      prev.includes(abilityId)
        ? prev.filter((id) => id !== abilityId)
        : [...prev, abilityId],
    );
  }

  function renderCards(cards) {
    return cards.map((card) => {
      const owned = save.collection[card.id] || 0;
      const inDeck = deckCounts[card.id] || 0;
      const max = Math.min(MAX_COPIES[card.rarity], owned);
      const playable =
        inDeck < max &&
        save.deck.length < 30 &&
        (save.adminMode ||
          !isLegendaryPokemon(card) ||
          legendaryPokemonCount < MAX_LEGENDARY_POKEMON);

      return (
        <div key={card.id} className="collection-item" data-card-id={card.id}>
          <HandCard
            cardId={card.id}
            playable={playable}
            onClick={() => addToDeck(card.id)}
            onPointerDown={press({ cardId: card.id })}
          />
          <div className="collection-meta">
            보유 {owned} · 덱 {inDeck}/{max}
          </div>
        </div>
      );
    });
  }

  const virtualized = virtualWindow.totalHeight > 0 && ownedCards.length > 0;

  return (
    <div className="mobile-deck-editor">
      {inspect && (
        <div className="inspect-overlay">
          <HandCard cardId={inspect.cardId} playable ghost />
        </div>
      )}

      <header className="mobile-deck-top">
        <div className="mobile-deck-header">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              playSfx("click");
              onBack();
            }}
          >
            ← 뒤로
          </button>

          <h2 className="mobile-deck-title">컬렉션 · 덱 편집</h2>

          <div
            className={`mobile-deck-count ${save.deck.length === 30 ? "ok" : ""}`}
          >
            <div>덱 {save.deck.length}/30</div>
            <div>전설 {legendaryPokemonCount}/3</div>
          </div>
        </div>

        <button
          type="button"
          className={`mobile-filter-toggle ${filtersOpen ? "open" : ""}`}
          aria-expanded={filtersOpen}
          onClick={() => {
            playSfx("click");
            setFiltersOpen((open) => !open);
          }}
        >
          <span className="mobile-filter-summary">검색 · 필터 · 정렬 — {filterSummary}</span>
          <span className="mobile-filter-chevron">⌄</span>
        </button>

        {filtersOpen && (
          <div className="mobile-filter-panel">
            <div className="deck-search-row">
              <span className="deck-search-icon">🔎</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="카드 이름 검색"
                className="deck-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="deck-search-clear"
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
            </div>

            <div className="mobile-filter-section">
              <div className="mobile-filter-label">
                <span>타입</span>
                <span>{filter}</span>
              </div>
              <div className="mobile-type-filters">
                {TYPE_FILTERS.map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={`filter-btn ${filter === type ? "active" : ""}`}
                    style={
                      type !== "전체" ? { "--type-color": TYPE_COLORS[type] } : {}
                    }
                    onClick={() => {
                      playSfx("click");
                      setFilter(type);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mobile-filter-section">
              <div className="mobile-filter-label">
                <span>정렬</span>
                <span>{sortLabel}</span>
              </div>
              <div className="mobile-sort-filters">
                {SORT_OPTIONS.map(({ key, label }) => (
                  <button
                    type="button"
                    key={key}
                    className={`sort-btn ${sortMode === key ? "active" : ""}`}
                    onClick={() => {
                      playSfx("click");
                      setSortMode(key);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <details className="mobile-ability-box">
              <summary>
                특성 필터
                {abilityFilters.length > 0 && ` (${abilityFilters.length})`}
              </summary>

              <div className="mobile-ability-list">
                {abilityOptions.map(({ id, label }) => (
                  <label
                    key={id}
                    className={`mobile-ability-check ${
                      abilityFilters.includes(id) ? "active" : ""
                    }`}
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
                  className="mobile-filter-reset"
                  onClick={() => {
                    playSfx("click");
                    setAbilityFilters([]);
                  }}
                >
                  특성 필터 초기화
                </button>
              )}
            </details>
          </div>
        )}
      </header>

      <main
        ref={collectionPaneRef}
        className="mobile-collection-pane"
        onScroll={handleCollectionScroll}
      >
        {ownedCards.length === 0 ? (
          <div className="mobile-deck-empty">조건에 맞는 카드가 없습니다.</div>
        ) : (
          <div
            style={{
              position: "relative",
              height: virtualized ? `${virtualWindow.totalHeight}px` : "auto",
            }}
          >
            <div
              ref={collectionGridRef}
              className="mobile-deck-grid"
              style={
                virtualized
                  ? {
                      position: "absolute",
                      top: `${virtualWindow.top}px`,
                      left: 0,
                      right: 0,
                    }
                  : undefined
              }
            >
              {renderCards(visibleCards)}
            </div>
          </div>
        )}
      </main>

      <section className={`mobile-deck-sheet ${sheetOpen ? "open" : ""}`}>
        <div className="mobile-deck-sheet-bar">
          <button
            type="button"
            className="mobile-sheet-toggle"
            aria-label={sheetOpen ? "덱 바텀시트 닫기" : "덱 바텀시트 열기"}
            onClick={() => setSheetOpen((open) => !open)}
          />

          <div className="mobile-preset-tabs">
            {presets.map((preset, index) => (
              <button
                type="button"
                key={index}
                className={`mobile-preset-btn ${
                  activePreset === index ? "active" : ""
                }`}
                onClick={() => selectPreset(index)}
              >
                <span className="mobile-preset-name">{preset.name}</span>
                <span className="mobile-preset-count">
                  {activePreset === index ? save.deck.length : preset.deck.length}/30
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mobile-sheet-arrow"
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? "덱 목록 내리기" : "덱 목록 올리기"}
            onClick={() => setSheetOpen((open) => !open)}
          >
            ⌃
          </button>
        </div>

        <div className="mobile-deck-sheet-content">
          <div className="mobile-deck-sheet-tools">
            <input
              ref={deckNameInputRef}
              key={`${activePreset}-${presets[activePreset]?.name}`}
              type="text"
              maxLength={16}
              defaultValue={presets[activePreset]?.name || `덱 ${activePreset + 1}`}
              className="mobile-deck-name-input"
              aria-label="덱 이름"
            />
            <button
              type="button"
              className="mobile-deck-tool-btn"
              onClick={() => {
                playSfx("click");
                renamePreset(
                  activePreset,
                  deckNameInputRef.current?.value || "",
                );
              }}
            >
              이름 수정
            </button>
            <button
              type="button"
              className="mobile-deck-tool-btn danger"
              disabled={save.deck.length === 0}
              onClick={clearDeck}
            >
              전체 제거
            </button>
          </div>

          <div className="mobile-deck-list-header">
            <span>내 덱</span>
            <span>{save.deck.length}/30 · 눌러서 1장 제거</span>
          </div>

          <div className="mobile-deck-list">
            {deckList.length === 0 ? (
              <div className="mobile-deck-empty">
                컬렉션의 카드를 눌러 덱에 추가하세요.
              </div>
            ) : (
              deckList.map(({ card, count }) => (
                <div
                  key={card.id}
                  className="deck-row"
                  style={{ "--type-color": TYPE_COLORS[card.type] }}
                  onClick={() => removeFromDeck(card.id)}
                >
                  <span className="deck-row-cost">{card.cost}</span>
                  <span className="deck-row-emoji">
                    <Sprite cardId={card.id} emoji={card.emoji} size={22} />
                  </span>
                  <span className="deck-row-name">{card.name}</span>
                  <span className="deck-row-count">×{count}</span>
                </div>
              ))
            )}

            {save.deck.length < 30 && save.deck.length > 0 && (
              <p className="deck-warning">덱이 30장이 되어야 배틀할 수 있어요.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
