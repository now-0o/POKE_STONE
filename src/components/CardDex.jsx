import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CARDS, CARD_MAP, DEX, MAX_COPIES } from "../data/cards.js";
import { HandCard, Sprite } from "./Card.jsx";
import { playSfx } from "../audio.js";
import {
  DEX_QUESTS,
  claimDexQuestReward,
  dexQuestState,
} from "../features/card-dex/state.js";
import {
  DEX_FIRST_PURCHASE_PRICE,
  dexCardPurchasePrice,
  isDexPurchaseUnlocked,
  purchaseDexCard,
} from "../state/dexPurchase.js";
import "../features/card-dex/styles.css";
import "../features/card-dex/scale-v2.css";
import "../features/card-dex/virtual-scroll-v3.css";
import "../features/card-dex/purchase-v4.css";

const REGION_TABS = [
  { id: "all", name: "전체", min: 1, max: 649 },
  { id: "kanto", name: "관동", min: 1, max: 151 },
  { id: "johto", name: "성도", min: 152, max: 251 },
  { id: "hoenn", name: "호연", min: 252, max: 386 },
  { id: "sinnoh", name: "신오", min: 387, max: 493 },
  { id: "unova", name: "하나", min: 494, max: 649 },
];

const DEX_INITIAL_RENDER = 30;
const DEX_OVERSCAN_ROWS = 2;

function buildDexCards() {
  const byDex = new Map();

  for (const card of CARDS) {
    const dex = DEX[card?.id];
    if (card?.kind !== "pokemon") continue;
    if (!Number.isInteger(dex) || dex < 1 || dex > 649) continue;
    if (!byDex.has(dex)) byDex.set(dex, card);
  }

  return [...byDex.values()].sort((a, b) => DEX[a.id] - DEX[b.id]);
}

function rewardLabel(reward) {
  if (!reward) return "";
  if (reward.rewardType === "shiny") {
    return `✨ 이로치 ${CARD_MAP[reward.cardId]?.name || "포켓몬"}`;
  }
  if (reward.rewardType === "money") {
    return `💰 ${reward.amount || 150}원`;
  }
  return "보상 수령 완료";
}

function formatMoney(value) {
  return `${Math.max(0, Number(value) || 0).toLocaleString("ko-KR")}원`;
}

function purchaseFailureText(result) {
  switch (result?.reason) {
    case "locked":
      return "N에게 승리한 뒤 확정 구매가 해금됩니다.";
    case "not_enough_money":
      return `돈이 ${formatMoney(result.shortage)} 부족합니다.`;
    case "max_copies":
      return "이미 최대 보유 수량입니다.";
    default:
      return "지금은 이 카드를 구매할 수 없습니다.";
  }
}

function initialVirtualWindow(cardCount) {
  return {
    start: 0,
    end: Math.min(DEX_INITIAL_RENDER, cardCount),
    top: 0,
    totalHeight: 0,
  };
}

function sameVirtualWindow(a, b) {
  return (
    a.start === b.start &&
    a.end === b.end &&
    a.top === b.top &&
    a.totalHeight === b.totalHeight
  );
}

export default function CardDex({ save, onSaveChange, onBack }) {
  const [region, setRegion] = useState("all");
  const [rewardNotice, setRewardNotice] = useState(null);
  const [purchaseConfirmId, setPurchaseConfirmId] = useState(null);
  const [purchaseNotice, setPurchaseNotice] = useState(null);
  const allCards = useMemo(() => buildDexCards(), []);
  const activeTab = REGION_TABS.find((tab) => tab.id === region) || REGION_TABS[0];
  const visibleCards = useMemo(
    () =>
      allCards.filter((card) => {
        const dex = DEX[card.id];
        return dex >= activeTab.min && dex <= activeTab.max;
      }),
    [allCards, activeTab.min, activeTab.max],
  );

  const purchaseUnlocked = isDexPurchaseUnlocked(save);

  const scrollPaneRef = useRef(null);
  const virtualSpaceRef = useRef(null);
  const virtualGridRef = useRef(null);
  const virtualMetricsRef = useRef({ columns: 0, rowStep: 0 });
  const scrollRafRef = useRef(null);
  const resizeRafRef = useRef(null);
  const [virtualWindow, setVirtualWindow] = useState(() =>
    initialVirtualWindow(visibleCards.length),
  );

  const discoveredCount = visibleCards.filter(
    (card) => (save.collection?.[card.id] || 0) > 0,
  ).length;
  const allDiscoveredCount = allCards.filter(
    (card) => (save.collection?.[card.id] || 0) > 0,
  ).length;

  const calculateVirtualWindow = useCallback(
    (columns, rowStep) => {
      const pane = scrollPaneRef.current;
      const space = virtualSpaceRef.current;
      if (!pane || !space || columns <= 0 || rowStep <= 0) return;

      const rowCount = Math.ceil(visibleCards.length / columns);
      const totalHeight = Math.max(1, rowCount * rowStep);
      const paneRect = pane.getBoundingClientRect();
      const spaceRect = space.getBoundingClientRect();
      const spaceTop = pane.scrollTop + spaceRect.top - paneRect.top;
      const viewportTop = pane.scrollTop;
      const viewportBottom = viewportTop + pane.clientHeight;

      let firstVisibleRow = 0;
      let lastVisibleRow = 1;

      if (viewportBottom > spaceTop) {
        firstVisibleRow = Math.floor(
          Math.max(0, viewportTop - spaceTop) / rowStep,
        );
        lastVisibleRow = Math.ceil(
          Math.max(0, viewportBottom - spaceTop) / rowStep,
        );
      }

      firstVisibleRow = Math.min(Math.max(0, firstVisibleRow), rowCount - 1);
      lastVisibleRow = Math.min(
        rowCount,
        Math.max(firstVisibleRow + 1, lastVisibleRow),
      );

      const startRow = Math.max(0, firstVisibleRow - DEX_OVERSCAN_ROWS);
      const endRow = Math.min(rowCount, lastVisibleRow + DEX_OVERSCAN_ROWS);
      const next = {
        start: startRow * columns,
        end: Math.min(visibleCards.length, endRow * columns),
        top: startRow * rowStep,
        totalHeight,
      };

      setVirtualWindow((prev) => (sameVirtualWindow(prev, next) ? prev : next));
    },
    [visibleCards.length],
  );

  const measureVirtualGrid = useCallback(() => {
    const grid = virtualGridRef.current;
    if (!grid) return;

    const children = [...grid.children];
    if (!children.length) return;

    const firstTop = children[0].offsetTop;
    let columns = children.findIndex(
      (child) => Math.abs(child.offsetTop - firstTop) > 1,
    );

    if (columns <= 0) columns = Math.min(children.length, 5);

    let rowStep = 0;
    if (children.length > columns) {
      rowStep = children[columns].offsetTop - firstTop;
    }

    if (rowStep <= 0) {
      const style = window.getComputedStyle(grid);
      const gap = parseFloat(style.rowGap || style.gap || "0") || 0;
      rowStep = children[0].offsetHeight + gap;
    }

    if (columns <= 0 || rowStep <= 0) return;

    virtualMetricsRef.current = { columns, rowStep };
    calculateVirtualWindow(columns, rowStep);
  }, [calculateVirtualWindow]);

  useLayoutEffect(() => {
    virtualMetricsRef.current = { columns: 0, rowStep: 0 };
    setVirtualWindow(initialVirtualWindow(visibleCards.length));
    scrollPaneRef.current?.scrollTo({ top: 0, behavior: "auto" });

    const frame1 = requestAnimationFrame(() => {
      requestAnimationFrame(measureVirtualGrid);
    });

    return () => cancelAnimationFrame(frame1);
  }, [region, visibleCards.length, measureVirtualGrid]);

  useEffect(() => {
    const onResize = () => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }

      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null;
        virtualMetricsRef.current = { columns: 0, rowStep: 0 };
        setVirtualWindow(initialVirtualWindow(visibleCards.length));
        requestAnimationFrame(measureVirtualGrid);
      });
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);

      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
      if (resizeRafRef.current !== null) cancelAnimationFrame(resizeRafRef.current);
    };
  }, [visibleCards.length, measureVirtualGrid]);

  function handleDexScroll() {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const { columns, rowStep } = virtualMetricsRef.current;
      calculateVirtualWindow(columns, rowStep);
    });
  }

  function selectRegion(nextRegion) {
    playSfx("click");
    setPurchaseConfirmId(null);
    setPurchaseNotice(null);
    setRegion(nextRegion);
  }

  function claimQuest(questId) {
    const result = claimDexQuestReward(save, questId);
    if (!result.ok) {
      playSfx("buzzer");
      return;
    }

    playSfx("buy");
    setRewardNotice({ questId, text: rewardLabel(result.reward) });
    onSaveChange?.();
  }

  function buyDexCard(card) {
    if (!purchaseUnlocked) {
      playSfx("buzzer");
      setPurchaseNotice({
        cardId: card.id,
        tone: "error",
        text: "N에게 승리한 뒤 확정 구매가 해금됩니다.",
      });
      return;
    }

    if (purchaseConfirmId !== card.id) {
      playSfx("click");
      setPurchaseConfirmId(card.id);
      setPurchaseNotice(null);
      return;
    }

    const result = purchaseDexCard(save, card.id);
    setPurchaseConfirmId(null);

    if (!result.ok) {
      playSfx("buzzer");
      setPurchaseNotice({
        cardId: card.id,
        tone: "error",
        text: purchaseFailureText(result),
      });
      return;
    }

    playSfx("buy");
    setPurchaseNotice({
      cardId: card.id,
      tone: "success",
      text: `${card.name} ${result.firstDiscovery ? "첫 획득" : "추가 획득"} · ${formatMoney(result.price)}`,
    });
    onSaveChange?.();
    requestAnimationFrame(measureVirtualGrid);
  }

  function renderDexCard(card) {
    const dex = DEX[card.id];
    const ownedCount = Math.max(0, Number(save.collection?.[card.id]) || 0);
    const owned = ownedCount > 0;
    const shinyOwned = (save.shinyCollection?.[card.id] || 0) > 0;
    const maxCopies = MAX_COPIES[card.rarity] ?? 2;
    const price = dexCardPurchasePrice(save, card);
    const canBuyMore = price !== null && ownedCount < maxCopies;
    const confirming = purchaseConfirmId === card.id;
    const cannotAfford = canBuyMore && (save.money || 0) < price;
    const notice = purchaseNotice?.cardId === card.id ? purchaseNotice : null;

    return (
      <article
        key={card.id}
        className={`dex-entry ${owned ? "is-owned" : "is-locked"}`}
      >
        <div className="dex-entry-topline">
          <span>#{String(dex).padStart(3, "0")}</span>
          <span>{owned ? "발견" : "미발견"}</span>
        </div>

        <div className="dex-card-shell">
          <HandCard cardId={card.id} playable shiny={false} />
        </div>

        <div className="dex-entry-footer">
          {owned ? (
            <>
              <span>보유 {Math.min(ownedCount, maxCopies)} / {maxCopies}</span>
              {shinyOwned && <span className="dex-shiny-owned">이로치 보유</span>}
            </>
          ) : (
            <span>미발견 카드 · 능력 정보는 획득 후 공개됩니다.</span>
          )}
        </div>

        <div className="dex-purchase-area">
          {!purchaseUnlocked ? (
            <span className="dex-purchase-note">N 승리 후 확정 구매 해금</span>
          ) : canBuyMore ? (
            <>
              <button
                className={`dex-purchase-btn ${confirming ? "is-confirm" : ""}`}
                disabled={cannotAfford}
                onClick={() => buyDexCard(card)}
              >
                {confirming
                  ? `구매 확정 · ${formatMoney(price)}`
                  : `${owned ? "추가 구매" : "첫 획득"} · ${formatMoney(price)}`}
              </button>
              {cannotAfford && (
                <span className="dex-purchase-note is-error">
                  {formatMoney(price - (save.money || 0))} 부족
                </span>
              )}
            </>
          ) : (
            <span className="dex-purchase-maxed">최대 보유</span>
          )}

          {notice && (
            <span className={`dex-purchase-note is-${notice.tone}`}>{notice.text}</span>
          )}
        </div>
      </article>
    );
  }

  const virtualized = virtualWindow.totalHeight > 0;
  const renderedCards = visibleCards.slice(
    virtualWindow.start,
    Math.max(virtualWindow.start, virtualWindow.end),
  );

  return (
    <div className="card-dex-screen">
      <div
        className="screen-header card-dex-header"
        style={{
          position: "static",
          zIndex: "auto",
          width: "min(1080px, 100%)",
          margin: "0 auto 16px",
          padding: 0,
          background: "none",
          borderBottom: "none",
          backdropFilter: "none",
        }}
      >
        <button
          className="btn-ghost"
          onClick={() => {
            playSfx("click");
            onBack?.();
          }}
        >
          ← 돌아가기
        </button>

        <h2>카드 도감</h2>

        <div className="dex-region-progress">발견 {allDiscoveredCount}/{allCards.length}</div>
      </div>

      <div
        ref={scrollPaneRef}
        className="dex-scroll-pane"
        onScroll={handleDexScroll}
      >
        <div className="dex-toolbar">
          <div className="dex-tabs" role="tablist" aria-label="지방별 도감">
            {REGION_TABS.map((tab) => (
              <button
                key={tab.id}
                className={region === tab.id ? "active" : ""}
                onClick={() => selectRegion(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </div>
          <div className="dex-region-progress">
            {activeTab.name} 도감 · {discoveredCount}/{visibleCards.length}
          </div>
        </div>

        <section className={`dex-direct-shop ${purchaseUnlocked ? "is-unlocked" : "is-locked"}`}>
          <div className="dex-direct-shop-copy">
            <span className="dex-direct-shop-kicker">DIRECT ACQUISITION</span>
            <strong>{purchaseUnlocked ? "도감 확정 구매" : "도감 확정 구매 · 잠김"}</strong>
            <p>
              {purchaseUnlocked
                ? "원하는 포켓몬을 확정 획득합니다. 첫 획득은 비싸고, 추가 복사본은 첫 가격의 절반입니다."
                : "하나지방 N에게 최초 승리하면 원하는 포켓몬을 돈으로 확정 구매할 수 있습니다."}
            </p>
          </div>
          <div className="dex-direct-shop-side">
            <strong className="dex-direct-shop-money">💰 {formatMoney(save.money)}</strong>
            {purchaseUnlocked && (
              <span className="dex-direct-shop-prices">
                첫 획득 C {DEX_FIRST_PURCHASE_PRICE.C.toLocaleString()} · R {DEX_FIRST_PURCHASE_PRICE.R.toLocaleString()} · E {DEX_FIRST_PURCHASE_PRICE.E.toLocaleString()} · L {DEX_FIRST_PURCHASE_PRICE.L.toLocaleString()}
              </span>
            )}
          </div>
        </section>

        <section className="dex-quest-board" aria-label="도감 수집 퀘스트">
          <div className="dex-quest-heading">
            <div>
              <span className="dex-quest-kicker">COLLECTION QUESTS</span>
              <h3>수집 퀘스트</h3>
            </div>
            <p>퀘스트는 순서와 관계없이 조건을 채우는 즉시 보상을 받을 수 있습니다.</p>
          </div>

          <div className="dex-quest-list">
            {DEX_QUESTS.map((quest) => {
              const state = dexQuestState(save, quest);
              const status = state.claimed
                ? "claimed"
                : state.complete
                  ? "complete"
                  : "progress";

              return (
                <article key={quest.id} className={`dex-quest-item is-${status}`}>
                  <div className="dex-quest-index">#{String(quest.order).padStart(2, "0")}</div>

                  <div className="dex-quest-copy">
                    <span>{quest.category}</span>
                    <h4>{quest.title}</h4>
                    <p>{quest.description}</p>

                    <div className="dex-quest-required">
                      {quest.requiredCardIds.map((id) => {
                        const owned = (save.collection?.[id] || 0) > 0;
                        return (
                          <div
                            key={id}
                            className={`dex-quest-pokemon ${owned ? "found" : "missing"}`}
                            title={CARD_MAP[id]?.name}
                          >
                            <Sprite
                              cardId={id}
                              emoji={CARD_MAP[id]?.emoji}
                              size={38}
                              shiny={false}
                            />
                            <span>{CARD_MAP[id]?.name}</span>
                            <b>{owned ? "✓" : "?"}</b>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="dex-quest-progress-box">
                    <strong>{state.found.length} / {state.required.length}</strong>
                    <span>발견</span>
                    <div className="dex-quest-progress-track" aria-hidden="true">
                      <i
                        style={{
                          width: `${state.required.length ? (state.found.length / state.required.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="dex-quest-reward">
                    <span className="dex-quest-reward-label">보상</span>
                    <strong>{quest.rewardText}</strong>
                    <small>{quest.rewardSubtext}</small>
                  </div>

                  <div className="dex-quest-action">
                    {state.claimed ? (
                      <div className="dex-reward-claimed">
                        <span>수령 완료</span>
                        <strong>{rewardLabel(state.reward)}</strong>
                      </div>
                    ) : (
                      <button
                        className={state.complete ? "btn-primary" : "btn-secondary"}
                        disabled={!state.complete}
                        onClick={() => claimQuest(quest.id)}
                      >
                        {state.complete ? "보상 받기" : "진행 중"}
                      </button>
                    )}

                    {rewardNotice?.questId === quest.id && (
                      <div className="dex-reward-toast">{rewardNotice.text} 획득!</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div
          ref={virtualSpaceRef}
          className="dex-virtual-space"
          style={virtualized ? { height: `${virtualWindow.totalHeight}px` } : undefined}
        >
          <div
            ref={virtualGridRef}
            className={`dex-grid ${virtualized ? "is-virtualized" : ""}`}
            style={
              virtualized
                ? { transform: `translateY(${virtualWindow.top}px)` }
                : undefined
            }
          >
            {renderedCards.map(renderDexCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
