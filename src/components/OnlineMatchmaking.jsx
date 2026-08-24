import React, { useEffect, useRef, useState } from "react";
import { deckIsValid } from "../state/save.js";
import {
  joinMatchmaking,
  fetchMatchmakingStatus,
  leaveMatchmaking,
} from "../state/api.js";
import { playSfx } from "../audio.js";
import "../styles/online-matchmaking.css";

const POLL_MS = 1500;

export default function OnlineMatchmaking({ save, isAdmin, onBack, onMatched }) {
  const [status, setStatus] = useState({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const statusRef = useRef(status);
  const handoffRef = useRef(false);
  const matchedRef = useRef(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  function acceptStatus(next) {
    setStatus(next);
    setError("");
    if (next.status !== "matched" || matchedRef.current === next.matchId) return;
    matchedRef.current = next.matchId;
    handoffRef.current = true;
    playSfx("click");
    onMatched?.(next);
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

  useEffect(
    () => () => {
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

  async function startSearch() {
    if (busy) return;
    if (!isAdmin) {
      playSfx("buzzer");
      setError("온라인 배틀은 현재 관리자 계정만 이용할 수 있습니다.");
      return;
    }
    if (!deckReady) {
      playSfx("buzzer");
      setError("온라인 배틀에는 완성된 30장 덱이 필요합니다.");
      return;
    }

    setBusy(true);
    setError("");
    playSfx("click");
    try {
      const next = await joinMatchmaking(save);
      acceptStatus(next);
    } catch (err) {
      setError(err.message || "랜덤 매칭에 참가하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSearch() {
    if (busy) return;
    setBusy(true);
    try {
      await leaveMatchmaking();
      matchedRef.current = null;
      handoffRef.current = false;
      setStatus({ status: "idle" });
      setError("");
      playSfx("click");
    } catch (err) {
      setError(err.message || "매칭을 취소하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function backToMenu() {
    if (["searching", "matched"].includes(status.status)) {
      try {
        await leaveMatchmaking();
      } catch {
        // 화면 이동은 막지 않는다. 서버 큐는 유휴 타임아웃으로도 정리된다.
      }
      setStatus({ status: "idle" });
    }
    playSfx("click");
    onBack();
  }

  return (
    <div className="online-matchmaking-screen">
      <div className="online-matchmaking-topbar">
        <button className="btn-ghost small" onClick={backToMenu}>
          ◀ 메인 메뉴
        </button>
        <div className="online-test-badge">ADMIN TEST</div>
      </div>

      <div className="online-matchmaking-card">
        <div className="online-orb" aria-hidden="true">
          <span />
        </div>
        <h2>온라인 배틀</h2>
        <p className="online-matchmaking-subtitle">
          같은 테스트 서버에 접속한 상대와 랜덤으로 매칭합니다.
        </p>

        {!isAdmin && (
          <div className="online-access-warning">
            <strong>안정성 테스트 중</strong>
            <span>현재 stonemaster 관리자 계정만 입장할 수 있습니다.</span>
          </div>
        )}

        {isAdmin && !deckReady && (
          <div className="online-access-warning">
            <strong>덱 준비 필요</strong>
            <span>컬렉션 · 덱에서 사용할 30장 덱을 완성해주세요.</span>
          </div>
        )}

        {isAdmin && deckReady && status.status === "idle" && (
          <div className="online-idle-panel">
            <span className="online-state-label">RANDOM MATCH</span>
            <strong>현재 덱으로 상대를 찾습니다.</strong>
            <span>30장 덱 스냅샷은 매칭 참가 시 서버에 고정됩니다.</span>
            <button className="btn-primary" disabled={busy} onClick={startSearch}>
              {busy ? "참가 중..." : "랜덤 매칭 시작"}
            </button>
          </div>
        )}

        {status.status === "searching" && (
          <div className="online-searching-panel">
            <div className="online-search-pulse" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span className="online-state-label">SEARCHING</span>
            <strong>상대를 찾는 중...</strong>
            <span>
              대기 순서 {status.queuePosition || 1} · 서버 연결 유지 중
            </span>
            <button className="btn-secondary" disabled={busy} onClick={cancelSearch}>
              매칭 취소
            </button>
          </div>
        )}

        {status.status === "matched" && (
          <div className="online-matched-panel">
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
            <p>전투방으로 연결하고 있습니다.</p>
          </div>
        )}

        {error && <div className="online-error">{error}</div>}
      </div>
    </div>
  );
}
