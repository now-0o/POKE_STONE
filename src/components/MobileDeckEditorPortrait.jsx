import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  addDeckVariant,
  buildOwnedVariants,
  canAddDeckVariant,
  clearDeckVariants,
  getDeckVariantRows,
  removeDeckVariant,
  selectDeckPreset,
  shinyInDeck,
  shinyOwned,
  syncActivePresetVariants,
} from "../state/shiny.js";
import { playSfx } from "../audio.js";
import { HandCard, Sprite, useInspect } from "./Card.jsx";

const TYPE_FILTERS = [
  "전체", "물", "불꽃", "풀", "전기", "얼음", "격투", "독", "땅",
  "비행", "에스퍼", "벌레", "바위", "고스트", "드래곤", "악",
  "강철", "페어리", "노말", "기술", "도구", "퀘스트",
];

const SORT_OPTIONS = [
  { key: "dex", label: "도감번호순" },
  { key: "cost", label: "코스트순" },
  { key: "rarity_desc", label: "등급 높은순" },
  { key: "rarity_asc", label: "등급 낮은순" },
];

const COLUMNS = 3;
const CARD_ROW_HEIGHT = 190;
const OVERSCAN_ROWS = 2;

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

export default function MobileDeckEditorPortrait({ save, onSaveChange, onBack }) {
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("cost");
  const [abilityFilters, setAbilityFilters] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);

  const { inspect, press, clickSuppressed } = useInspect();
  const collectionPaneRef = useRef(null);
  const deckNameInputRef = useRef(null);
  const scrollRafRef = useRef(null);

  const activePreset = save.activeDeckPreset || 0;
  const presets = save.deckPresets || [];

  const deckCounts = useMemo(() => {
    const counts = {};
    save.deck.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [save.deck]);

  const legendaryPokemonCount = useMemo(
    () =>
      save.deck.reduce(
        (count, id) => count + (isLegendaryPokemon(CARD_MAP[id]) ? 1 : 0),
        0,
      ),
    [save.deck],
  );

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
    CARDS.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        card.id.toLowerCase().includes(query),
    ).forEach((card) => {
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

  const ownedVariants = useMemo(() => buildOwnedVariants(ownedCards, save), [ownedCards, save.shinyCollection]);

  const deckList = useMemo(
    () => getDeckVariantRows(save).sort(
      (a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name) || Number(a.shiny) - Number(b.shiny),
    ),
    [save.deck, save.deckShiny],
  );

  useEffect(() => {
    const pane = collectionPaneRef.current;
    if (!pane) return undefined;

    const updateSize = () => setViewportHeight(Math.max(1, pane.clientHeight));
    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pane = collectionPaneRef.current;
    if (pane) pane.scrollTop = 0;
    setScrollTop(0);
  }, [filter, search, sortMode, abilityFilters]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  function handleCollectionScroll(event) {
    const nextTop = event.currentTarget.scrollTop;
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      setScrollTop(nextTop);
    });
  }

  const totalRows = Math.ceil(ownedVariants.length / COLUMNS);
  const firstVisibleRow = Math.max(0, Math.floor(scrollTop / CARD_ROW_HEIGHT));
  const visibleRows = Math.max(1, Math.ceil(viewportHeight / CARD_ROW_HEIGHT));
  const startRow = Math.max(0, firstVisibleRow - OVERSCAN_ROWS);
  const endRow = Math.min(
    totalRows,
    firstVisibleRow + visibleRows + OVERSCAN_ROWS + 1,
  );
  const visibleCards = ownedVariants.slice(
    startRow * COLUMNS,
    Math.min(ownedVariants.length, endRow * COLUMNS),
  );
  const virtualTop = startRow * CARD_ROW_HEIGHT;
  const virtualHeight = totalRows * CARD_ROW_HEIGHT;

  function syncActivePreset() {
    syncActivePresetVariants(save);
  }

  function addToDeck(cardId, shiny = false) {
    if (clickSuppressed()) return;
    const card = CARD_MAP[cardId];
    if (
      !save.adminMode &&
      isLegendaryPokemon(card) &&
      legendaryPokemonCount >= MAX_LEGENDARY_POKEMON
    ) {
      playSfx("buzzer");
      return;
    }
    if (!addDeckVariant(save, cardId, shiny)) {
      playSfx("buzzer");
      return;
    }
    persist(save);
    playSfx("pickup");
    onSaveChange();
  }

  function removeFromDeck(cardId, shiny = false) {
    if (!removeDeckVariant(save, cardId, shiny)) return;
    persist(save);
    playSfx("putdown");
    onSaveChange();
  }

  function clearDeck() {
    if (save.deck.length === 0) return;
    clearDeckVariants(save);
    persist(save);
    playSfx("putdown");
    onSaveChange();
  }

  function selectPreset(index) {
    if (index === save.activeDeckPreset) return;
    playSfx("click");
    if (!selectDeckPreset(save, index)) return;
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

  function renderCard({ card, shiny }) {
    const owned = save.collection[card.id] || 0;
    const inDeck = deckCounts[card.id] || 0;
    const max = Math.min(MAX_COPIES[card.rarity], owned);
    const variantDeck = shiny ? shinyInDeck(save, card.id) : inDeck - shinyInDeck(save, card.id);
    const variantOwned = shiny ? shinyOwned(save, card.id) : owned;
    const playable =
      canAddDeckVariant(save, card.id, shiny) &&
      (save.adminMode ||
        !isLegendaryPokemon(card) ||
        legendaryPokemonCount < MAX_LEGENDARY_POKEMON);

    return (
      <div key={`${card.id}-${shiny ? "shiny" : "normal"}`} className={`mobile-v2-card-item ${shiny ? "collection-item-shiny" : ""}`} data-card-id={card.id}>
        <div className="mobile-portrait-card-shell">
          <HandCard
            cardId={card.id}
            shiny={shiny}
            playable={playable}
            onClick={() => addToDeck(card.id, shiny)}
            onPointerDown={press({ cardId: card.id, shiny })}
          />
        </div>
        <div className="mobile-v2-card-meta">
          {shiny ? `✨ 이로치 ${variantOwned} · 덱 ${variantDeck}/${variantOwned}` : `보유 ${owned} · 덱 ${variantDeck}/${max}`}
        </div>
      </div>
    );
  }

  const sortLabel =
    SORT_OPTIONS.find((option) => option.key === sortMode)?.label || "코스트순";

  return (
    <div
      className="mobile-deck-editor mobile-deck-editor-v2 mobile-deck-editor-portrait"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      {inspect && (
        <div className="inspect-overlay mobile-v2-inspect-overlay">
          <HandCard cardId={inspect.cardId} shiny={!!inspect.shiny} playable ghost />
        </div>
      )}

      <header className="mobile-v2-top">
        <div className="mobile-v2-header">
          <button
            type="button"
            className="btn-ghost mobile-v2-back"
            onClick={() => {
              playSfx("click");
              onBack();
            }}
          >
            ← 뒤로
          </button>
          <h2>컬렉션 · 덱 편집</h2>
          <div className={`mobile-v2-count ${save.deck.length === 30 ? "ok" : ""}`}>
            <span>덱 {save.deck.length}/30</span>
            <span>전설 {legendaryPokemonCount}/3</span>
          </div>
        </div>

        <div className="mobile-v2-search deck-search-row">
          <span className="deck-search-icon">🔎</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="카드 이름 검색"
            className="deck-search-input"
            autoComplete="off"
            enterKeyHint="search"
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

        <button
          type="button"
          className={`mobile-v2-filter-toggle ${filtersOpen ? "open" : ""}`}
          aria-expanded={filtersOpen}
          onClick={() => {
            playSfx("click");
            setFiltersOpen((open) => !open);
          }}
        >
          <span>
            필터 · 정렬 — {filter !== "전체" ? filter : "전체 타입"} · {sortLabel}
            {abilityFilters.length > 0 ? ` · 특성 ${abilityFilters.length}` : ""}
          </span>
          <strong>⌄</strong>
        </button>

        {filtersOpen && (
          <div className="mobile-v2-filter-panel">
            <section>
              <div className="mobile-v2-filter-label">
                <span>타입</span>
                <span>{filter}</span>
              </div>
              <div className="mobile-v2-chip-row">
                {TYPE_FILTERS.map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={`filter-btn ${filter === type ? "active" : ""}`}
                    style={type !== "전체" ? { "--type-color": TYPE_COLORS[type] } : {}}
                    onClick={() => {
                      playSfx("click");
                      setFilter(type);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mobile-v2-filter-label">
                <span>정렬</span>
                <span>{sortLabel}</span>
              </div>
              <div className="mobile-v2-chip-row">
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
            </section>

            <details className="mobile-v2-ability-box">
              <summary>
                특성 필터
                {abilityFilters.length > 0 && ` (${abilityFilters.length})`}
              </summary>
              <div className="mobile-v2-ability-list">
                {abilityOptions.map(({ id, label }) => (
                  <label
                    key={id}
                    className={`mobile-v2-ability-check ${
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
                  className="mobile-v2-filter-reset"
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
        className="mobile-v2-collection"
        onScroll={handleCollectionScroll}
      >
        {ownedCards.length === 0 ? (
          <div className="mobile-v2-empty">조건에 맞는 카드가 없습니다.</div>
        ) : (
          <div className="mobile-v2-virtual-space" style={{ height: `${virtualHeight}px` }}>
            <div
              className="mobile-v2-grid"
              style={{
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                transform: `translateY(${virtualTop}px)`,
              }}
            >
              {visibleCards.map(renderCard)}
            </div>
          </div>
        )}
      </main>

      <section className={`mobile-v2-sheet ${sheetOpen ? "open" : ""}`}>
        <div className="mobile-v2-sheet-bar">
          <div
            className="mobile-v2-presets"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, presets.length)}, minmax(0, 1fr))`,
            }}
          >
            {presets.map((preset, index) => (
              <button
                type="button"
                key={index}
                className={`mobile-v2-preset ${activePreset === index ? "active" : ""}`}
                onClick={() => selectPreset(index)}
              >
                <span>{preset.name}</span>
                <small>
                  {activePreset === index ? save.deck.length : preset.deck.length}/30
                </small>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mobile-v2-sheet-arrow"
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? "덱 목록 내리기" : "덱 목록 올리기"}
            onClick={() => setSheetOpen((open) => !open)}
          >
            <span>⌃</span>
          </button>
        </div>

        <div className="mobile-v2-sheet-content">
          <div className="mobile-v2-tools">
            <input
              ref={deckNameInputRef}
              key={`${activePreset}-${presets[activePreset]?.name}`}
              type="text"
              maxLength={16}
              defaultValue={presets[activePreset]?.name || `덱 ${activePreset + 1}`}
              aria-label="덱 이름"
            />
            <button
              type="button"
              onClick={() => {
                playSfx("click");
                renamePreset(activePreset, deckNameInputRef.current?.value || "");
              }}
            >
              이름 수정
            </button>
            <button
              type="button"
              className="danger"
              disabled={save.deck.length === 0}
              onClick={clearDeck}
            >
              전체 제거
            </button>
          </div>

          <div className="mobile-v2-list-head">
            <strong>내 덱</strong>
            <span>{save.deck.length}/30 · 눌러서 1장 제거</span>
          </div>

          <div className="mobile-v2-deck-list">
            {deckList.length === 0 ? (
              <div className="mobile-v2-empty">컬렉션의 카드를 눌러 덱에 추가하세요.</div>
            ) : (
              deckList.map(({ card, count, shiny }) => (
                <div
                  key={`${card.id}-${shiny ? "shiny" : "normal"}`}
                  className={`deck-row ${shiny ? "deck-row-shiny" : ""}`}
                  style={{ "--type-color": TYPE_COLORS[card.type] }}
                  onClick={() => removeFromDeck(card.id, shiny)}
                >
                  <span className="deck-row-cost">{card.cost}</span>
                  <span className="deck-row-emoji">
                    <Sprite cardId={card.id} shiny={shiny} emoji={card.emoji} size={22} />
                  </span>
                  <span className="deck-row-name">{shiny ? `✨ ${card.name}` : card.name}</span>
                  <span className="deck-row-count">×{count}</span>
                </div>
              ))
            )}
            {save.deck.length > 0 && save.deck.length < 30 && (
              <p className="deck-warning">덱이 30장이 되어야 배틀할 수 있어요.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
