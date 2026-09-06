import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CARDS, CARD_MAP, DEX, MAX_COPIES, UI_SPRITES } from "../data/cards.js";
import { HandCard, Sprite } from "./Card.jsx";
import { playSfx } from "../audio.js";
import {
  DEX_QUESTS,
  claimDexQuestReward,
  dexQuestState,
} from "../features/card-dex/state.js";
import {
  dexCardPurchasePrice,
  isDexPurchaseUnlocked,
  purchaseDexCard,
} from "../state/dexPurchase.js";
import "../features/card-dex/styles.css";
import "../features/card-dex/scale-v2.css";
import "../features/card-dex/virtual-scroll-v3.css";
import "../features/card-dex/purchase-v4.css";
import "../features/card-dex/quest-drawer-v7.css";
import "../features/card-dex/effects-v7.css";

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
  const [questsOpen, setQuestsOpen] = useState(false);
  const [rewardNotice, setRewardNotice] = useState(null);
  const [purchaseConfirmId, setPurchaseConfirmId] = useState(null);
  const [purchaseNotice, setPurchaseNotice] = useState(null);
  const [purchaseFx, setPurchaseFx] = useState(null);
  const [questFx, setQuestFx] = useState(null);

  const purchaseFxTimerRef = useRef(null);
  const questFxTimerRef = useRef(null);

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
  const questStates = DEX_QUESTS.map((quest) => ({
    quest,
    state: dexQuestState(save, quest),
  }));
  const claimedQuestCount = questStates.filter(({ state }) => state.claimed).length;
  const claimableQuestCount = questStates.filter(
    ({ state }) => state.complete && !state.claimed,
  ).length;

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

  useEffect(
    () => () => {
      clearTimeout(purchaseFxTimerRef.current);
      clearTimeout(questFxTimerRef.current);
    },
    [],
  );

  function scheduleMeasure() {
    requestAnimationFrame(() => requestAnimationFrame(measureVirtualGrid));
  }

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

  function toggleQuests() {
    playSfx("click");
    setQuestsOpen((open) => !open);
    scheduleMeasure();
  }

  function showPurchaseFx(card) {
    clearTimeout(purchaseFxTimerRef.current);
    setPurchaseFx({ cardId: card.id, nonce: Date.now() });
    purchaseFxTimerRef.current = setTimeout(() => setPurchaseFx(null), 1350);
  }

  function showQuestFx(quest, label, subtitle) {
    clearTimeout(questFxTimerRef.current);
    setQuestFx({
      questId: quest.id,
      title: quest.title,
      label,
      subtitle,
      nonce: Date.now(),
    });
    questFxTimerRef.current = setTimeout(() => setQuestFx(null), 1550);
  }

  function claimQuest(questId) {
    const quest = DEX_QUESTS.find((item) => item.id === questId);
    const result = claimDexQuestReward(save, questId);
    if (!result.ok) {
      playSfx("buzzer");
      return;
    }

    const label = rewardLabel(result.reward);
    playSfx("buy");
    setRewardNotice({ questId, text: label });
    if (quest) showQuestFx(quest, "보상 획득", label);
    onSaveChange?.();
  }

  function buyDexCard(card) {
    if (!purchaseUnlocked) {
      playSfx("buzzer");
      return;
    }

    if (purchaseConfirmId !== card.id) {
      playSfx("click");
      setPurchaseConfirmId(card.id);
      setPurchaseNotice(null);
      return;
    }

    const completeBefore = new Set(
      DEX_QUESTS.filter((quest) => dexQuestState(save, quest).complete).map(
        (quest) => quest.id,
      ),
    );

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
    showPurchaseFx(card);

    const newlyCompleted = DEX_QUESTS.find(
      (quest) =>
        !completeBefore.has(quest.id) && dexQuestState(save, quest).complete,
    );

    if (newlyCompleted) {
      setQuestsOpen(true);
      showQuestFx(newlyCompleted, "QUEST COMPLETE", "보상을 받을 수 있습니다.");
    }

    onSaveChange?.();
    scheduleMeasure();
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
    const purchaseAnimating = purchaseFx?.cardId === card.id;

    return (
      <article
        key={card.id}
        className={`dex-entry ${owned ? "is-owned" : "is-locked"} ${purchaseAnimating ? "is-purchase-fx" : ""}`}
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
          {canBuyMore ? (
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

  function renderQuestCard({ quest, state }) {
    const status = state.claimed
      ? "claimed"
      : state.complete
        ? "complete"
        : "progress";
    const animating = questFx?.questId === quest.id;
    const validRequired = (quest.requiredCardIds || []).filter((id) => CARD_MAP[id]);

    return (
      <article
        key={quest.id}
        className={`dexq-card is-${status} ${animating ? "is-quest-fx" : ""}`}
      >
        <div className="dexq-card-head">
          <span className="dexq-index">#{String(quest.order).padStart(2, "0")}</span>
          <strong className="dexq-title">{quest.title}</strong>
          <span className="dexq-status">
            {state.claimed ? "수령 완료" : state.complete ? "완료" : "진행 중"}
          </span>
        </div>

        <p className="dexq-desc">{quest.description}</p>

        <div className="dexq-required">
          {validRequired.map((id) => {
            const owned = (save.collection?.[id] || 0) > 0;
            return (
              <div
                key={id}
                className={`dexq-mon ${owned ? "found" : "missing"}`}
                title={CARD_MAP[id]?.name}
              >
                <Sprite
                  cardId={id}
                  emoji={CARD_MAP[id]?.emoji}
                  size={39}
                  shiny={false}
                />
                <span className="dexq-mon-mark">{owned ? "✓" : "?"}</span>
              </div>
            );
          })}
        </div>

        <div className="dexq-progress-row">
          <strong>{state.found.length}/{state.required.length}</strong>
          <div className="dexq-track" aria-hidden="true">
            <i
              style={{
                width: `${state.required.length ? (state.found.length / state.required.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="dexq-bottom">
          <div className="dexq-reward">
            보상
            <strong>{quest.rewardText}</strong>
          </div>
          {state.claimed ? (
            <button type="button" className="dexq-action claimed" disabled>
              완료
            </button>
          ) : (
            <button
              type="button"
              className={`dexq-action ${state.complete ? "can-claim" : ""}`}
              disabled={!state.complete}
              onClick={() => claimQuest(quest.id)}
            >
              {state.complete ? "보상 받기" : "진행 중"}
            </button>
          )}
        </div>

        {rewardNotice?.questId === quest.id && (
          <div className="dexq-notice">{rewardNotice.text} 획득!</div>
        )}
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
      {questFx ? (
        <div key={questFx.nonce} className="dex-celebration is-quest" aria-live="polite">
          <span className="dex-celebration-icon">★</span>
          <span className="dex-celebration-copy">
            <strong>{questFx.label} · {questFx.title}</strong>
            <span>{questFx.subtitle}</span>
          </span>
        </div>
      ) : purchaseFx ? (
        <div key={purchaseFx.nonce} className="dex-celebration" aria-live="polite">
          <span className="dex-celebration-icon">✦</span>
          <span className="dex-celebration-copy">
            <strong>{CARD_MAP[purchaseFx.cardId]?.name || "카드"} 획득!</strong>
            <span>컬렉션에 추가되었습니다.</span>
          </span>
        </div>
      ) : null}

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

        <div className="money-display dex-header-money">
          <img
            className="res-icon"
            src={UI_SPRITES.coin}
            alt="돈"
            width={20}
            height={20}
            draggable={false}
          />
          <span>{Math.max(0, Number(save.money) || 0).toLocaleString("ko-KR")}</span>
        </div>
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

        <section
          className={`dexq-drawer ${questsOpen ? "is-open" : ""} ${questFx ? "is-quest-fx" : ""}`}
          aria-label="도감 수집 퀘스트"
        >
          <button
            type="button"
            className="dexq-toggle"
            aria-expanded={questsOpen}
            onClick={toggleQuests}
          >
            <span className="dexq-toggle-title">🎯 수집 퀘스트</span>
            <span className="dexq-toggle-summary">
              {claimedQuestCount}/{DEX_QUESTS.length} 수령 완료
              {claimableQuestCount > 0 && (
                <> · <strong>보상 대기 {claimableQuestCount}</strong></>
              )}
            </span>
            <span className="dexq-toggle-arrow">⌄</span>
          </button>

          <div className="dexq-body" aria-hidden={!questsOpen}>
            <div className="dexq-body-inner">
              <div className="dexq-strip">
                {questStates.map(renderQuestCard)}
              </div>
            </div>
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
