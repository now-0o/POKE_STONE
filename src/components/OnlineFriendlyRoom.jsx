import React, { useEffect, useRef, useState } from "react";
import {
  createFriendlyRoom,
  fetchFriendlyRoom,
  joinFriendlyRoom,
  leaveFriendlyRoom,
  leaveFriendlyRoomKeepalive,
  setFriendlyReady,
  startFriendlyMatch,
} from "../state/friendlyApi.js";
import { playSfx } from "../audio.js";
import "../styles/online-friendly-room.css";

const ROOM_POLL_MS = 1000;

function cleanCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 6);
}

export default function OnlineFriendlyRoom({
  save,
  onMatched,
  onActivityChange,
  onRegisterCancel,
}) {
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const matchedRef = useRef(false);
  const roomRef = useRef(null);

  roomRef.current = room;

  function acceptRoom(next) {
    if (!next) return;
    if (next.status === "started" && next.matchId) {
      if (matchedRef.current) return;
      matchedRef.current = true;
      onActivityChange?.(false);
      onMatched?.({ matchId: next.matchId, friendly: true });
      return;
    }
    setRoom(next);
    setError("");
  }

  async function leave({ silent = false } = {}) {
    if (!roomRef.current) return true;
    try {
      await leaveFriendlyRoom();
      setRoom(null);
      setError("");
      onActivityChange?.(false);
      if (!silent) playSfx("click");
      return true;
    } catch (err) {
      if (!silent) {
        setError(err?.message || "친선전 방에서 나가지 못했습니다.");
        playSfx("buzzer");
      }
      return false;
    }
  }

  useEffect(() => {
    onRegisterCancel?.(leave);
    return () => onRegisterCancel?.(null);
  }, [onRegisterCancel]);

  useEffect(() => {
    onActivityChange?.(!!room);
  }, [room, onActivityChange]);

  useEffect(() => {
    const handlePageExit = () => {
      if (roomRef.current && !matchedRef.current) {
        leaveFriendlyRoomKeepalive();
      }
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);
    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
    };
  }, []);

  useEffect(() => {
    if (!room || matchedRef.current) return undefined;

    let stopped = false;
    let running = false;

    async function poll() {
      if (stopped || running) return;
      running = true;
      try {
        const next = await fetchFriendlyRoom();
        if (!stopped) acceptRoom(next);
      } catch (err) {
        if (!stopped) {
          if (err?.code === "room_not_found") {
            setRoom(null);
            setError("방이 종료되었거나 연결이 끊겼습니다.");
            onActivityChange?.(false);
          } else {
            setError(err?.message || "친선전 방 상태를 불러오지 못했습니다.");
          }
        }
      } finally {
        running = false;
      }
    }

    const timer = window.setInterval(poll, ROOM_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [room?.code]);

  async function createRoom() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await createFriendlyRoom(save);
      acceptRoom(next);
      playSfx("click");
    } catch (err) {
      setError(err?.message || "친선전 방을 만들지 못했습니다.");
      playSfx("buzzer");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      const next = await joinFriendlyRoom(code, save);
      acceptRoom(next);
      playSfx("click");
    } catch (err) {
      setError(err?.message || "친선전 방에 입장하지 못했습니다.");
      playSfx("buzzer");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReady() {
    if (busy || !room) return;
    setBusy(true);
    setError("");
    try {
      const next = await setFriendlyReady(!room.me?.ready);
      acceptRoom(next);
      playSfx("click");
    } catch (err) {
      setError(err?.message || "준비 상태를 변경하지 못했습니다.");
      playSfx("buzzer");
    } finally {
      setBusy(false);
    }
  }

  async function startMatch() {
    if (busy || !room?.host || !room?.canStart) return;
    setBusy(true);
    setError("");
    try {
      const next = await startFriendlyMatch();
      acceptRoom(next);
      playSfx("click");
    } catch (err) {
      setError(err?.message || "친선전을 시작하지 못했습니다.");
      playSfx("buzzer");
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!room?.code) return;
    try {
      await navigator.clipboard?.writeText(room.code);
      playSfx("click");
    } catch {
      // 클립보드를 지원하지 않는 환경에서는 코드가 화면에 그대로 보인다.
    }
  }

  if (!room) {
    return (
      <div className="friendly-room-shell">
        <div className="friendly-room-intro">
          <span className="friendly-room-kicker">FRIENDLY MATCH</span>
          <h2>친선전</h2>
          <p>방을 만들거나 친구에게 받은 6자리 코드를 입력하세요.</p>
        </div>

        {error && <div className="friendly-room-error">{error}</div>}

        <div className="friendly-room-entry-grid">
          <button
            type="button"
            className="friendly-room-entry-card"
            disabled={busy}
            onMouseEnter={() => !busy && playSfx("cursor")}
            onClick={createRoom}
          >
            <strong>방 만들기</strong>
            <span>새 친선전 대기실을 만듭니다.</span>
            <em>{busy ? "처리 중..." : "CREATE ROOM ▶"}</em>
          </button>

          <div className="friendly-room-entry-card friendly-room-join-card">
            <strong>코드로 입장</strong>
            <span>친구에게 받은 방 코드를 입력하세요.</span>
            <div className="friendly-room-code-form">
              <input
                value={code}
                onChange={(event) => setCode(cleanCode(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") joinRoom();
                }}
                placeholder="ABC234"
                maxLength={6}
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="친선전 방 코드"
              />
              <button
                type="button"
                className="btn-primary"
                disabled={busy || code.length !== 6}
                onClick={joinRoom}
              >
                입장
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const waitingOpponent = !room.opponent;
  const bothReady = !!room.me?.ready && !!room.opponent?.ready;

  return (
    <div className="friendly-room-shell friendly-room-lobby">
      <div className="friendly-room-lobby-head">
        <div>
          <span className="friendly-room-kicker">PRIVATE LOBBY</span>
          <h2>친선전 대기실</h2>
        </div>
        <button
          type="button"
          className="friendly-room-code"
          onClick={copyCode}
          title="방 코드 복사"
        >
          <span>ROOM CODE</span>
          <strong>{room.code}</strong>
          <small>눌러서 복사</small>
        </button>
      </div>

      {error && <div className="friendly-room-error">{error}</div>}

      <div className="friendly-room-players">
        <div className={`friendly-player-card ${room.me?.ready ? "is-ready" : ""}`}>
          <span className="friendly-player-label">나 {room.host ? "· 방장" : ""}</span>
          <strong>{room.me?.username || "플레이어"}</strong>
          <em>{room.me?.ready ? "READY" : "대기 중"}</em>
        </div>

        <div className="friendly-room-versus">VS</div>

        <div className={`friendly-player-card ${room.opponent?.ready ? "is-ready" : ""} ${waitingOpponent ? "is-empty" : ""}`}>
          <span className="friendly-player-label">상대 {room.host ? "" : "· 방장"}</span>
          <strong>{room.opponent?.username || "상대 입장 대기"}</strong>
          <em>
            {waitingOpponent
              ? "WAITING"
              : room.opponent?.ready
                ? "READY"
                : "준비 중"}
          </em>
        </div>
      </div>

      <div className="friendly-room-status">
        {waitingOpponent
          ? "방 코드를 친구에게 알려주세요."
          : bothReady
            ? room.host
              ? "두 플레이어 모두 준비되었습니다. 게임을 시작할 수 있습니다."
              : "준비 완료 · 방장이 게임을 시작하기를 기다리는 중입니다."
            : "두 플레이어가 모두 준비하면 게임을 시작할 수 있습니다."}
      </div>

      <div className="friendly-room-actions">
        <button
          type="button"
          className={room.me?.ready ? "btn-secondary" : "btn-primary"}
          disabled={busy}
          onClick={toggleReady}
        >
          {room.me?.ready ? "준비 취소" : "준비"}
        </button>

        {room.host && (
          <button
            type="button"
            className="btn-primary friendly-start-button"
            disabled={busy || !room.canStart}
            onClick={startMatch}
          >
            게임 시작 ▶
          </button>
        )}

        <button
          type="button"
          className="btn-ghost"
          disabled={busy}
          onClick={() => leave()}
        >
          방 나가기
        </button>
      </div>
    </div>
  );
}
