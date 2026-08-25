import React, { useEffect, useRef, useState } from "react";
import { deckIsValid } from "../state/save.js";
import {
  LEGENDARY_POKEMON_IDS,
  MAX_LEGENDARY_POKEMON,
} from "../data/cards.js";
import {
  joinMatchmaking,
  fetchMatchmakingStatus,
  leaveMatchmaking,
  leaveMatchmakingKeepalive,
} from "../state/api.js";
import { playSfx } from "../audio.js";
import "../styles/online-matchmaking.css";
import "../styles/online-matchmaking-state-card.css";

const POLL_MS = 700;
const MATCH_FOUND_DELAY_MS = 2000;

function countLegendaryPokemon(deck = []) {
  return deck.reduce(
    (count, cardId) => count + (LEGENDARY_POKEMON_IDS.has(cardId) ? 1 : 0),
    0,
  );
}

export default function OnlineMatchmaking({
  save,
  onBack,
  onMatched,
  embedded = false,
  onActivityChange,
  onRegisterCancel,
}) {
  const [status, setStatus] = useState({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const statusRef = useRef(status);
  const handoffRef = useRef(false);
  const matchedRef = useRef(null);
  const matchedTimerRef = useRef(null);

  useEffect(() => {
    statusRef.current = status;
    onActivityChange?.(["searching", "matched"].includes(status.status));
  }, [status, onActivityChange]);

  function clearMatchedTimer() {
    if (matchedTimerRef.current !== null) {
      window.clearTimeout(matchedTimerRef.current);
      matchedTimerRef.current = null;
    }
  }

  function acceptStatus(next) {
    statusRef.current = next;
    setStatus(next);
    setError("");
    if (next.status !== "matched" || matchedRef.current === next.matchId) return;

    matchedRef.current = next.matchId;
    handoffRef.current = true;
    playSfx("click");
    clearMatchedTimer();
    matchedTimerRef.current = window.setTimeout(() => {
      matchedTimerRef.current = null;
      onMatched?.(next);
    }, MATCH_FOUND_DELAY_MS);
  }

  useEffect(() => {
    if (status.status !== "searching") return undefined;

    const timer = window.setInterval(async () => {
      try {
        const next = await fetchMatchmakingStatus();
        acceptStatus(next);
      } catch (err) {
        setError(err.message || "매칭 상태를 확인하지 못했습니다.");
      }
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [status.status, onMatched]);

  useEffect(() => {
    const handlePageExit = () => {
      if (["searching", "matched"].includes(statusRef.current?.status)) {
        leaveMatchmakingKeepalive();
      }
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);
    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
    };
  }, []);

  useEffect(
    () => () => {
      clearMatchedTimer();
      onActivityChange?.(false);
      onRegisterCancel?.(null);
      if (
        !handoffRef.current &&
        ["searching", "matched"].includes(statusRef.current?.status)
      ) {
        leaveMatchmaking().catch(() => undefined);
      }
    },
    [],
  );

  const deckReady = deckIsValid(save);
  const legendaryCount = countLegendaryPokemon(save?.deck || []);
  const legendaryReady = legendaryCount <= MAX_LEGENDARY_POKEMON;
  const onlineDeckReady = deckReady && legendaryReady;

  async function startSearch() {
    if (busy) return false;
    if (!deckReady) {
      playSfx("buzzer");
      setError("온라인 배틀에는 완성된 30장 덱이 필요합니다.");
      return false;
    }
    if (!legendaryReady) {
      playSfx("buzzer");
      setError(
        `온라인 배틀 덱에는 전설 포켓몬을 최대 ${MAX_LEGENDARY_POKEMON}장까지만 넣을 수 있습니다. 현재 ${legendaryCount}장입니다.`,
      );
      return false;
    }

    setBusy(true);
    setError("");
    playSfx("click");
    try {
      try {
        await leaveMatchmaking();
      } catch {
        // 정리할 세션이 없거나 이미 만료된 경우 새 검색은 계속한다.
      }

      matchedRef.current = null;
      handoffRef.current = false;
      const next = await joinMatchmaking(save);
      acceptStatus(next);
      return true;
    } catch (err) {
      setError(err.message || "랜덤 매칭에 참가하지 못했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function cancelSearch({ silent = false } = {}) {
    if (busy) return false;
    setBusy(true);
    clearMatchedTimer();
    try {
      await leaveMatchmaking();
      matchedRef.current = null;
      handoffRef.current = false;
      const idle = { status: "idle" };
      statusRef.current = idle;
      setStatus(idle);
      setError("");
      if (!silent) playSfx("click");
      return true;
    } catch (err) {
      setError(err.message || "매칭을 취소하지 못했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    onRegisterCancel?.(cancelSearch);
    return () => onRegisterCancel?.(null);
  }, [onRegisterCancel, busy, status.status]);

  async function backToMenu() {
    clearMatchedTimer();
    handoffRef.current = false;
    if (["searching", "matched"].includes(status.status)) {
      try {
        await leaveMatchmaking();
      } catch {
        // 화면 이동은 막지 않는다. 서버 큐는 유휴 타임아웃으로도 정리된다.
      }
      const idle = { status: "idle" };
      statusRef.current = idle;
      setStatus(idle);
    }
    playSfx("click");
    onBack?.();
  }

  let stateContent = null;

  if (!deckReady) {
    stateContent = (
      <div key="deck-warning" className="online-matchmaking-state online-warning-state">
        <div className="online-orb" aria-hidden="true">
          <span />
        </div>
        <h2>온라인 배틀</h2>
        <div className="online-access-warning">
          <strong>덱 준비 필요</strong>
          <span>컬렉션 · 덱에서 사용할 30장 덱을 완성해주세요.</span>
        </div>
      </div>
    );
  } else if (!legendaryReady) {
    stateContent = (
      <div key="legend-warning" className="online-matchmaking-state online-warning-state">
        <div className="online-orb" aria-hidden="true">
          <span />
        </div>
        <h2>온라인 배틀</h2>
        <div className="online-access-warning">
          <strong>전설 포켓몬 제한 초과</strong>
          <span>
            온라인 덱은 전설 포켓몬 최대 {MAX_LEGENDARY_POKEMON}장까지 가능합니다. 현재 {legendaryCount}장입니다.
          </span>
        </div>
      </div>
    );
  } else if (onlineDeckReady && status.status === "idle") {
    stateContent = (
      <div key="idle" className="online-matchmaking-state online-ready-state">
        <div className="online-orb" aria-hidden="true">
          <span />
        </div>
        <h2>온라인 배틀</h2>
        <p className="online-matchmaking-subtitle">
          같은 서버에 접속한 상대와 랜덤으로 매칭합니다.
        </p>
        <button className="btn-primary" disabled={busy} onClick={startSearch}>
          {busy ? "참가 중..." : "랜덤 매칭 시작"}
        </button>
      </div>
    );
  } else if (status.status === "searching") {
    stateContent = (
      <div key="searching" className="online-matchmaking-state online-searching-state">
        <div className="online-search-pulse" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="online-state-label">SEARCHING</span>
        <strong className="online-state-title">상대를 찾는 중...</strong>
        <span className="online-state-detail">
          대기 순서 {status.queuePosition || 1} · 서버 연결 유지 중
        </span>
        <button className="btn-secondary" disabled={busy} onClick={() => cancelSearch()}>
          {busy ? "취소 중..." : "매칭 취소"}
        </button>
      </div>
    );
  } else if (status.status === "matched") {
    stateContent = (
      <div key="matched" className="online-matchmaking-state online-matched-state">
        <span className="online-state-label">MATCH FOUND</span>
        <div className="online-versus-row">
          <div>
            <small>YOU</small>
            <strong>나</strong>
          </div>
          <b>VS</b>
          <div>
            <small>OPPONENT</small>
            <strong>{status.opponent?.username || "상대"}</strong>
          </div>
        </div>
        <div className="online-match-meta">
          <span>{status.goesFirst ? "선공" : "후공"}</span>
          <span>SEAT {status.seat || "-"}</span>
          <span>#{String(status.matchId || "").slice(0, 8)}</span>
        </div>
        <p>매칭 완료! 잠시 후 배틀을 시작합니다.</p>
      </div>
    );
  }

  return (
    <div className={`online-matchmaking-screen ${embedded ? "embedded" : ""}`}>
      {!embedded && (
        <div className="online-matchmaking-topbar">
          <button className="btn-ghost small" onClick={backToMenu}>
            ◀ 메인 메뉴
          </button>
          <div className="online-test-badge">ONLINE</div>
        </div>
      )}

      <div className={`online-matchmaking-card state-${status.status}`}>
        {stateContent}
        {error && <div className="online-error online-state-error">{error}</div>}
      </div>
    </div>
  );
}
