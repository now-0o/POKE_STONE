import React, { useMemo, useState } from "react";
import { CARDS, CARD_MAP, DEX, MAX_COPIES } from "../data/cards.js";
import { HandCard, Sprite } from "./Card.jsx";
import { playSfx } from "../audio.js";
import {
  KANTO_STARTER_IDS,
  claimKantoStarterDexReward,
  kantoStarterRewardState,
} from "../features/card-dex/state.js";
import "../features/card-dex/styles.css";

const REGION_TABS = [
  { id: "all", name: "전체", min: 1, max: 649 },
  { id: "kanto", name: "관동", min: 1, max: 151 },
  { id: "johto", name: "성도", min: 152, max: 251 },
  { id: "hoenn", name: "호연", min: 252, max: 386 },
  { id: "sinnoh", name: "신오", min: 387, max: 493 },
  { id: "unova", name: "하나", min: 494, max: 649 },
];

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

export default function CardDex({ save, onSaveChange, onBack, onShop }) {
  const [region, setRegion] = useState("all");
  const [rewardNotice, setRewardNotice] = useState("");
  const allCards = useMemo(() => buildDexCards(), []);
  const activeTab = REGION_TABS.find((tab) => tab.id === region) || REGION_TABS[0];
  const visibleCards = allCards.filter((card) => {
    const dex = DEX[card.id];
    return dex >= activeTab.min && dex <= activeTab.max;
  });

  const discoveredCount = visibleCards.filter(
    (card) => (save.collection?.[card.id] || 0) > 0,
  ).length;
  const allDiscoveredCount = allCards.filter(
    (card) => (save.collection?.[card.id] || 0) > 0,
  ).length;
  const starterState = kantoStarterRewardState(save);

  function claimStarterReward() {
    const result = claimKantoStarterDexReward(save);
    if (!result.ok) {
      playSfx("buzzer");
      return;
    }

    playSfx("buy");
    setRewardNotice(rewardLabel(result.reward));
    onSaveChange?.();
  }

  return (
    <div className="card-dex-screen">
      <div className="screen-header card-dex-header">
        <button
          className="btn-ghost"
          onClick={() => {
            playSfx("click");
            onBack?.();
          }}
        >
          ← 돌아가기
        </button>
        <div className="card-dex-title-block">
          <h2>카드 도감</h2>
          <span>
            발견 {allDiscoveredCount} / {allCards.length}
          </span>
        </div>
        <button
          className="btn-secondary card-dex-shop-btn"
          onClick={() => {
            playSfx("slide");
            onShop?.();
          }}
        >
          카드팩 상점
        </button>
      </div>

      <section className="dex-set-panel" aria-label="관동 스타팅 세트">
        <div className="dex-set-copy">
          <span className="dex-set-kicker">COLLECTION SET 001</span>
          <h3>관동 스타팅</h3>
          <p>이상해씨 · 파이리 · 꼬부기를 모두 발견하세요.</p>
          <div className="dex-set-progress">
            {starterState.found.length} / {KANTO_STARTER_IDS.length} 발견
          </div>
          <div className="dex-set-reward-copy">
            보상: 아직 보유하지 않은 관동 스타팅 이로치 1장
            <small>세 이로치를 이미 모두 보유했다면 150원으로 대체됩니다.</small>
          </div>
        </div>

        <div className="dex-starter-row">
          {KANTO_STARTER_IDS.map((id) => {
            const owned = (save.collection?.[id] || 0) > 0;
            return (
              <div key={id} className={`dex-starter-chip ${owned ? "found" : "missing"}`}>
                <div className="dex-starter-sprite">
                  <Sprite
                    cardId={id}
                    emoji={CARD_MAP[id]?.emoji}
                    size={48}
                    shiny={false}
                  />
                </div>
                <strong>{CARD_MAP[id]?.name}</strong>
                <span>{owned ? "발견" : "미발견"}</span>
              </div>
            );
          })}
        </div>

        <div className="dex-set-action">
          {starterState.claimed ? (
            <div className="dex-reward-claimed">
              <span>보상 수령 완료</span>
              <strong>{rewardLabel(starterState.reward)}</strong>
            </div>
          ) : (
            <button
              className="btn-primary"
              disabled={!starterState.complete}
              onClick={claimStarterReward}
            >
              {starterState.complete ? "세트 보상 받기" : "3종을 모두 발견하세요"}
            </button>
          )}
          {rewardNotice && <div className="dex-reward-toast">{rewardNotice} 획득!</div>}
        </div>
      </section>

      <div className="dex-toolbar">
        <div className="dex-tabs" role="tablist" aria-label="지방별 도감">
          {REGION_TABS.map((tab) => (
            <button
              key={tab.id}
              className={region === tab.id ? "active" : ""}
              onClick={() => {
                playSfx("click");
                setRegion(tab.id);
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <div className="dex-region-progress">
          {activeTab.name} 도감 · {discoveredCount}/{visibleCards.length}
        </div>
      </div>

      <div className="dex-grid">
        {visibleCards.map((card) => {
          const dex = DEX[card.id];
          const owned = (save.collection?.[card.id] || 0) > 0;
          const shinyOwned = (save.shinyCollection?.[card.id] || 0) > 0;
          const maxCopies = MAX_COPIES[card.rarity] ?? 2;

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
                    <span>
                      보유 {Math.min(save.collection?.[card.id] || 0, maxCopies)} / {maxCopies}
                    </span>
                    {shinyOwned && <span className="dex-shiny-owned">✨ 이로치 보유</span>}
                  </>
                ) : (
                  <span>카드팩에서 획득하면 정보가 공개됩니다.</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
