import React, { useMemo, useState } from "react";
import { CARDS, CARD_MAP, DEX, MAX_COPIES } from "../data/cards.js";
import { HandCard, Sprite } from "./Card.jsx";
import { playSfx } from "../audio.js";
import {
  DEX_QUESTS,
  claimDexQuestReward,
  dexQuestState,
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

export default function CardDex({ save, onSaveChange, onBack }) {
  const [region, setRegion] = useState("all");
  const [rewardNotice, setRewardNotice] = useState(null);
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

        <div className="dex-region-progress">
          발견 {allDiscoveredCount}/{allCards.length}
        </div>
      </div>

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
                  <strong>
                    {state.found.length} / {state.required.length}
                  </strong>
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
