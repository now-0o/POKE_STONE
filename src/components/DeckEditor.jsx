import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const MOBILE_INITIAL_RENDER = 28;
const MOBILE_OVERSCAN_CARDS = 10;

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

function sameVirtualWindow(a, b) {
  return (
    a.start === b.start &&
    a.end === b.end &&
    a.top === b.top &&
    a.totalHeight === b.totalHeight
  );
}

export default function DeckEditor({ save, onSaveChange, onBack }) {
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("cost");
  const [abilityFilters, setAbilityFilters] = useState([]);
  const [virtualWindow, setVirtualWindow] = useState({
    start: 0,
    end: MOBILE_INITIAL_RENDER,
    top: 0,
    totalHeight: 0,
  });
  const { inspect, press, clickSuppressed } = useInspect();

  const mobileLite = useMemo(() => isMobileCollectionDevice(), []);

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

  const ownedVariants = useMemo(() => buildOwnedVariants(ownedCards, save), [ownedCards, save.shinyCollection]);

  const collectionGridRef = useRef(null);
  const collectionPaneRef = useRef(null);
  const previousCardRectsRef = useRef(new Map());
  const deckNameInputRef = useRef(null);
  const virtualMetricsRef = useRef({ columns: 0, rowStep: 0 });
  const virtualRafRef = useRef(null);

  const visibleOwnedCards = mobileLite
    ? ownedVariants.slice(
        Math.min(virtualWindow.start, ownedVariants.length),
        Math.min(virtualWindow.end, ownedVariants.length),
      )
    : ownedVariants;

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

  function calculateVirtualWindow(columns, rowStep) {
    const pane = collectionPaneRef.current;

    if (!mobileLite || !pane || columns <= 0 || rowStep <= 0) {
      return;
    }

    const totalRows = Math.ceil(ownedVariants.length / columns);

    if (totalRows === 0) {
      const emptyWindow = { start: 0, end: 0, top: 0, totalHeight: 0 };
      setVirtualWindow((prev) =>
        sameVirtualWindow(prev, emptyWindow) ? prev : emptyWindow,
      );
      return;
    }

    const firstVisibleRow = Math.max(0, Math.floor(pane.scrollTop / rowStep));
    const lastVisibleRow = Math.min(
      totalRows - 1,
      Math.floor((pane.scrollTop + Math.max(1, pane.clientHeight - 1)) / rowStep),
    );
    const overscanRows = Math.max(1, Math.ceil(MOBILE_OVERSCAN_CARDS / columns));
    const startRow = Math.max(0, firstVisibleRow - overscanRows);
    const endRow = Math.min(totalRows - 1, lastVisibleRow + overscanRows);

    const nextWindow = {
      start: startRow * columns,
      end: Math.min(ownedVariants.length, (endRow + 1) * columns),
      top: startRow * rowStep,
      totalHeight: totalRows * rowStep,
    };

    setVirtualWindow((prev) =>
      sameVirtualWindow(prev, nextWindow) ? prev : nextWindow,
    );
  }

  function measureMobileGrid() {
    if (!mobileLite) {
      return;
    }

    const grid = collectionGridRef.current;
    const children = grid ? Array.from(grid.children) : [];

    if (!grid || children.length === 0) {
      return;
    }

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

    if (rowStep <= 0) {
      return;
    }

    const previous = virtualMetricsRef.current;
    virtualMetricsRef.current = { columns, rowStep };

    if (previous.columns !== columns || previous.rowStep !== rowStep) {
      calculateVirtualWindow(columns, rowStep);
      return;
    }

    calculateVirtualWindow(columns, rowStep);
  }

  function resetMobileVirtualization() {
    if (!mobileLite) {
      return;
    }

    if (virtualRafRef.current !== null) {
      cancelAnimationFrame(virtualRafRef.current);
      virtualRafRef.current = null;
    }

    virtualMetricsRef.current = { columns: 0, rowStep: 0 };
    collectionPaneRef.current?.scrollTo({ top: 0, behavior: "auto" });
    setVirtualWindow({
      start: 0,
      end: Math.min(MOBILE_INITIAL_RENDER, ownedVariants.length || MOBILE_INITIAL_RENDER),
      top: 0,
      totalHeight: 0,
    });
  }

  function handleCollectionScroll() {
    if (!mobileLite || virtualRafRef.current !== null) {
      return;
    }

    virtualRafRef.current = requestAnimationFrame(() => {
      virtualRafRef.current = null;
      const { columns, rowStep } = virtualMetricsRef.current;
      calculateVirtualWindow(columns, rowStep);
    });
  }

  useLayoutEffect(() => {
    if (!mobileLite) {
      return;
    }

    const pane = collectionPaneRef.current;

    if (pane) {
      pane.scrollTop = 0;
    }

    virtualMetricsRef.current = { columns: 0, rowStep: 0 };
    setVirtualWindow({
      start: 0,
      end: Math.min(MOBILE_INITIAL_RENDER, ownedVariants.length),
      top: 0,
      totalHeight: 0,
    });
  }, [mobileLite, ownedCards]);

  useLayoutEffect(() => {
    if (!mobileLite) {
      return;
    }

    measureMobileGrid();
  }, [
    mobileLite,
    ownedCards.length,
    virtualWindow.start,
    virtualWindow.end,
  ]);

  useEffect(() => {
    if (!mobileLite) {
      return undefined;
    }

    const onResize = () => {
      if (virtualRafRef.current !== null) {
        cancelAnimationFrame(virtualRafRef.current);
      }

      virtualRafRef.current = requestAnimationFrame(() => {
        virtualRafRef.current = null;
        virtualMetricsRef.current = { columns: 0, rowStep: 0 };
        setVirtualWindow((prev) => ({
          start: 0,
          end: Math.min(MOBILE_INITIAL_RENDER, ownedVariants.length),
          top: 0,
          totalHeight: 0,
        }));
        collectionPaneRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);

      if (virtualRafRef.current !== null) {
        cancelAnimationFrame(virtualRafRef.current);
        virtualRafRef.current = null;
      }
    };
  }, [mobileLite, ownedCards.length]);

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

  function toggleAbilityFilter(abilityId) {
    captureCardPositions();
    resetMobileVirtualization();
    setAbilityFilters((prev) =>
      prev.includes(abilityId)
        ? prev.filter((id) => id !== abilityId)
        : [...prev, abilityId],
    );

    playSfx("click");
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

  const deckList = useMemo(
    () => getDeckVariantRows(save).sort(
      (a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name) || Number(a.shiny) - Number(b.shiny),
    ),
    [save.deck, save.deckShiny],
  );

  function syncActivePreset() {
    syncActivePresetVariants(save);
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

  function renderCollectionCards(cards) {
    return cards.map(({ card, shiny }) => {
      const owned = save.collection[card.id];
      const inDeck = deckCounts[card.id] || 0;
      const max = Math.min(MAX_COPIES[card.rarity], owned);
      const variantDeck = shiny ? shinyInDeck(save, card.id) : inDeck - shinyInDeck(save, card.id);
      const variantOwned = shiny ? shinyOwned(save, card.id) : owned;

      return (
        <div
          key={`${card.id}-${shiny ? "shiny" : "normal"}`}
          className={`collection-item ${shiny ? "collection-item-shiny" : ""}`}
          data-card-id={`${card.id}-${shiny ? "shiny" : "normal"}`}
        >
          <HandCard
            cardId={card.id}
            shiny={shiny}
            playable={
              canAddDeckVariant(save, card.id, shiny) &&
              save.deck.length < 30 &&
              (save.adminMode ||
                !isLegendaryPokemon(card) ||
                legendaryPokemonCount < MAX_LEGENDARY_POKEMON)
            }
            onClick={() => addToDeck(card.id, shiny)}
            onPointerDown={press({ cardId: card.id, shiny })}
          />
          <div className="collection-meta">
            {shiny ? `✨ 이로치 ${variantOwned} · 덱 ${variantDeck}/${variantOwned}` : `보유 ${owned} · 덱 ${variantDeck}/${max}`}
          </div>
        </div>
      );
    });
  }

  const mobileVirtualized =
    mobileLite && virtualWindow.totalHeight > 0 && ownedCards.length > 0;

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
              resetMobileVirtualization();
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
                resetMobileVirtualization();
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
                resetMobileVirtualization();
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
                captureCardPositions();
                resetMobileVirtualization();
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
                resetMobileVirtualization();
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
          onScroll={mobileLite ? handleCollectionScroll : undefined}
          style={{
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehaviorY: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {mobileLite ? (
            <div
              style={{
                position: "relative",
                height: mobileVirtualized
                  ? `${virtualWindow.totalHeight}px`
                  : "auto",
                minHeight: mobileVirtualized ? 0 : undefined,
              }}
            >
              <div
                className="collection-grid"
                ref={collectionGridRef}
                style={
                  mobileVirtualized
                    ? {
                        position: "absolute",
                        top: `${virtualWindow.top}px`,
                        left: 0,
                        right: 0,
                      }
                    : undefined
                }
              >
                {renderCollectionCards(visibleOwnedCards)}
              </div>
            </div>
          ) : (
            <div className="collection-grid" ref={collectionGridRef}>
              {renderCollectionCards(ownedCards)}
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
            {deckList.map(({ card, count, shiny }) => (
              <div
                key={card.id}
                className="deck-row"
                style={{ "--type-color": TYPE_COLORS[card.type] }}
                onClick={() => removeFromDeck(card.id, shiny)}
                title="클릭하면 1장 제거"
              >
                <span className="deck-row-cost">{card.cost}</span>
                <span className="deck-row-emoji">
                  <Sprite cardId={card.id} shiny={shiny} emoji={card.emoji} size={22} />
                </span>
                <span className="deck-row-name">{shiny ? `✨ ${card.name}` : card.name}</span>
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
