import React, { useMemo, useState } from "react";
import { HandCard } from "../../components/Card.jsx";
import "./opening-mulligan.css";

let mulliganUid = 1;

function nextMulliganUid() {
  return `mulligan-${Date.now()}-${mulliganUid++}`;
}

function shuffle(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function claimShiny(player, cardId) {
  if (!player?._shinyDeckRemaining) return false;
  const remaining = Number(player._shinyDeckRemaining[cardId]) || 0;
  if (remaining <= 0) return false;

  const next = remaining - 1;
  if (next > 0) player._shinyDeckRemaining[cardId] = next;
  else delete player._shinyDeckRemaining[cardId];
  return true;
}

function restoreShiny(player, cardId, shiny) {
  if (!shiny) return;
  player._shinyDeckRemaining = player._shinyDeckRemaining || {};
  player._shinyDeckRemaining[cardId] =
    (Number(player._shinyDeckRemaining[cardId]) || 0) + 1;
}

function replaceOpeningCards(game, selectedUids) {
  const player = game?.players?.player;
  if (!player || !selectedUids?.size) return 0;

  const originalHand = [...player.hand];
  const selectedEntries = originalHand.filter((entry) =>
    selectedUids.has(entry.uid),
  );
  if (!selectedEntries.length) return 0;

  // 하스스톤식 처리:
  // 1) 교체할 카드는 잠시 덱 밖에 둔다.
  // 2) 남은 덱에서 같은 수만큼 새 카드를 뽑는다.
  // 3) 처음 뺀 카드들을 다시 덱에 넣고 섞는다.
  // 따라서 선택한 바로 그 카드를 즉시 다시 뽑는 일은 없다.
  const replacements = [];
  for (let i = 0; i < selectedEntries.length; i += 1) {
    const cardId = player.deck.pop();
    if (!cardId) break;
    replacements.push({
      uid: nextMulliganUid(),
      cardId,
      shiny: claimShiny(player, cardId),
    });
  }

  let replacementIndex = 0;
  player.hand = originalHand.map((entry) => {
    if (!selectedUids.has(entry.uid)) return entry;
    const replacement = replacements[replacementIndex];
    replacementIndex += 1;
    return replacement || entry;
  });

  const actuallyReplaced = selectedEntries.slice(0, replacements.length);

  // 교체 카드의 이로치 소유권은 새 카드를 다 뽑은 뒤 덱으로 복구한다.
  // 그래야 방금 선택해 뺀 이로치 카드가 즉시 다른 복사본에 붙어 재등장하지 않는다.
  for (const entry of actuallyReplaced) {
    restoreShiny(player, entry.cardId, entry.shiny);
  }

  player.deck = shuffle([
    ...player.deck,
    ...actuallyReplaced.map((entry) => entry.cardId),
  ]);

  if (actuallyReplaced.length > 0) {
    game.log.push(`시작 손패 ${actuallyReplaced.length}장을 교체했다.`);
  }

  return actuallyReplaced.length;
}

export default function OpeningMulligan({ game, onComplete }) {
  const [selected, setSelected] = useState(() => new Set());
  const [phase, setPhase] = useState("choose");

  const hand = game?.players?.player?.hand || [];
  const first = game?.firstSide === "player";
  const selectedCount = selected.size;

  const subtitle = useMemo(
    () =>
      first
        ? "선공 · 시작 카드 3장"
        : "후공 · 시작 카드 4장",
    [first],
  );

  function toggle(uid) {
    if (phase !== "choose") return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function confirm() {
    if (phase !== "choose") return;

    if (selectedCount === 0) {
      onComplete?.();
      return;
    }

    replaceOpeningCards(game, selected);
    setSelected(new Set());
    setPhase("done");

    window.setTimeout(() => {
      onComplete?.();
    }, 700);
  }

  return (
    <div className="opening-mulligan" role="dialog" aria-modal="true">
      <div className="opening-mulligan-panel">
        <div className="opening-mulligan-heading">
          <span className="opening-mulligan-kicker">STARTING HAND</span>
          <h2>{phase === "done" ? "교체 완료!" : "시작 손패"}</h2>
          <p className="opening-mulligan-order">{subtitle}</p>
          <p className="opening-mulligan-help">
            {phase === "done"
              ? "새로운 손패로 배틀을 시작합니다."
              : "원하지 않는 카드를 선택하세요. 선택한 카드만 무작위로 교체됩니다."}
          </p>
        </div>

        <div
          className={`opening-mulligan-cards count-${hand.length} ${phase === "done" ? "is-done" : ""}`}
        >
          {hand.map((entry) => {
            const isSelected = selected.has(entry.uid);
            return (
              <div
                key={entry.uid}
                className={`opening-mulligan-card ${isSelected ? "is-selected" : ""}`}
                role={phase === "choose" ? "button" : undefined}
                tabIndex={phase === "choose" ? 0 : -1}
                aria-pressed={phase === "choose" ? isSelected : undefined}
                onClick={() => toggle(entry.uid)}
                onKeyDown={(event) => {
                  if (phase !== "choose") return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle(entry.uid);
                  }
                }}
              >
                <HandCard
                  cardId={entry.cardId}
                  handCard={entry}
                  playable={phase === "choose"}
                  shiny={entry.shiny}
                />
                {phase === "choose" && (
                  <div className="opening-mulligan-choice" aria-hidden="true">
                    <span>{isSelected ? "교체" : "유지"}</span>
                    {isSelected && <strong>↻</strong>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {phase === "choose" && (
          <div className="opening-mulligan-actions">
            <div className="opening-mulligan-selected-count">
              {selectedCount > 0
                ? `${selectedCount}장 교체 선택`
                : "카드를 눌러 교체할 카드를 선택"}
            </div>
            <button type="button" onClick={confirm}>
              {selectedCount > 0 ? `${selectedCount}장 교체` : "이대로 시작"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
