import React, { useEffect, useMemo, useRef, useState } from "react";
import { HandCard } from "../../components/Card.jsx";
import { getOnlineBattleBridge } from "../../engine/onlineBattleBridge.js";
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
  if (!player || !selectedUids?.size) {
    return { count: 0, replacementUids: [] };
  }

  const originalHand = [...player.hand];
  const selectedEntries = originalHand.filter((entry) =>
    selectedUids.has(entry.uid),
  );
  if (!selectedEntries.length) {
    return { count: 0, replacementUids: [] };
  }

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

  return {
    count: actuallyReplaced.length,
    replacementUids: replacements
      .slice(0, actuallyReplaced.length)
      .map((entry) => entry.uid),
  };
}

export default function OpeningMulligan({ game, onComplete }) {
  const [selected, setSelected] = useState(() => new Set());
  const [phase, setPhase] = useState("choose");
  const [error, setError] = useState("");
  const completeRef = useRef(false);

  const hand = game?.players?.player?.hand || [];
  const first = game?.firstSide === "player";
  const selectedCount = selected.size;
  const choosing = phase === "choose";
  const online = !!game?._onlineMatch?.id;

  const subtitle = useMemo(
    () => (first ? "선공 · 시작 카드 3장" : "후공 · 시작 카드 4장"),
    [first],
  );

  function finish() {
    if (completeRef.current) return;
    completeRef.current = true;
    onComplete?.();
  }

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    document.body.dataset.openingMulligan = "1";
    window.dispatchEvent(
      new CustomEvent("poke-opening-mulligan-change", { detail: { open: true } }),
    );

    return () => {
      delete document.body.dataset.openingMulligan;
      window.dispatchEvent(
        new CustomEvent("poke-opening-mulligan-change", { detail: { open: false } }),
      );
    };
  }, []);

  useEffect(() => {
    if (!online || phase !== "waiting") return undefined;

    let stopped = false;
    const checkReady = () => {
      if (stopped) return;
      const bridge = getOnlineBattleBridge(game);
      if (bridge?.canAct?.()) finish();
    };

    checkReady();
    const timer = window.setInterval(checkReady, 80);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [game, online, phase]);

  function toggle(uid) {
    if (!choosing) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function confirmOnline() {
    const bridge = getOnlineBattleBridge(game);
    if (!bridge?.dispatch) {
      setError("온라인 배틀 연결을 확인하지 못했습니다.");
      return;
    }

    const cardUids = [...selected];
    setError("");
    setPhase(selectedCount > 0 ? "outgoing" : "waiting");

    if (selectedCount > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      setPhase("waiting");
    }

    try {
      const ok = await bridge.dispatch({ type: "mulligan", cardUids });
      if (!ok) {
        setPhase("choose");
        setError("시작 손패 확정에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      setPhase("choose");
      setError(err?.message || "시작 손패 확정에 실패했습니다.");
    }
  }

  function confirmOffline() {
    if (selectedCount === 0) {
      finish();
      return;
    }

    const selectedSnapshot = new Set(selected);
    setPhase("outgoing");

    window.setTimeout(() => {
      const result = replaceOpeningCards(game, selectedSnapshot);
      setSelected(new Set(result.replacementUids));
      setPhase("incoming");

      window.setTimeout(() => {
        finish();
      }, 480);
    }, 260);
  }

  function confirm() {
    if (!choosing) return;
    if (online) {
      confirmOnline();
      return;
    }
    confirmOffline();
  }

  return (
    <div
      className="opening-mulligan"
      role="dialog"
      aria-modal="true"
      aria-busy={!choosing}
    >
      <div className="opening-mulligan-panel">
        <div className="opening-mulligan-heading">
          <span className="opening-mulligan-kicker">STARTING HAND</span>
          <h2>시작 손패</h2>
          <p className="opening-mulligan-order">{subtitle}</p>
          <p className="opening-mulligan-help">
            {phase === "waiting"
              ? "내 선택 완료 · 상대의 시작 손패 선택을 기다리는 중입니다."
              : "원하지 않는 카드를 선택하세요. 선택한 카드만 무작위로 교체됩니다."}
          </p>
          {error && <p className="online-error">{error}</p>}
        </div>

        <div className={`opening-mulligan-cards count-${hand.length}`}>
          {hand.map((entry) => {
            const marked = selected.has(entry.uid);
            const isSelected = choosing && marked;
            const isOutgoing = phase === "outgoing" && marked;
            const isIncoming = phase === "incoming" && marked;

            return (
              <div
                key={entry.uid}
                className={[
                  "opening-mulligan-card",
                  isSelected ? "is-selected" : "",
                  isOutgoing ? "is-swapping-out" : "",
                  isIncoming ? "is-swapping-in" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role={choosing ? "button" : undefined}
                tabIndex={choosing ? 0 : -1}
                aria-pressed={choosing ? isSelected : undefined}
                onClick={() => toggle(entry.uid)}
                onKeyDown={(event) => {
                  if (!choosing) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle(entry.uid);
                  }
                }}
              >
                <HandCard
                  cardId={entry.cardId}
                  handCard={entry}
                  playable={choosing}
                  shiny={entry.shiny}
                />
                {choosing && (
                  <div className="opening-mulligan-choice" aria-hidden="true">
                    <span>{isSelected ? "교체" : "유지"}</span>
                    {isSelected && <strong>↻</strong>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="opening-mulligan-actions">
          <div className="opening-mulligan-selected-count" aria-live="polite">
            {phase === "outgoing"
              ? "선택한 카드를 확정하는 중..."
              : phase === "incoming"
                ? "새 카드가 들어왔습니다."
                : phase === "waiting"
                  ? "상대 선택 대기 중..."
                  : selectedCount > 0
                    ? `${selectedCount}장 교체 선택`
                    : "카드를 눌러 교체할 카드를 선택"}
          </div>
          <button type="button" onClick={confirm} disabled={!choosing}>
            {!choosing
              ? phase === "waiting"
                ? "상대 기다리는 중..."
                : "교체 중..."
              : selectedCount > 0
                ? `${selectedCount}장 교체`
                : "이대로 시작"}
          </button>
        </div>
      </div>
    </div>
  );
}
