import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createFriendlyRoom,
  fetchFriendlyRoom,
  fetchFriendlyRooms,
  joinFriendlyRoom,
  leaveFriendlyRoom,
  leaveFriendlyRoomKeepalive,
  setFriendlyReady,
  startFriendlyMatch,
  updateFriendlyDeck,
} from "../state/friendlyApi.js";
import { playSfx } from "../audio.js";
import "../styles/online-friendly-room.css";

const ROOM_POLL_MS = 1000;
const LIST_POLL_MS = 2000;

function usablePreset(preset) {
  return Array.isArray(preset?.deck) && preset.deck.length === 30;
}

export default function OnlineFriendlyRoom({
  save,
  onMatched,
  onActivityChange,
  onRegisterCancel,
}) {
  const presets = useMemo(
    () =>
      (save?.deckPresets || []).map((preset, index) => ({
        name: preset?.name?.trim() || `덱 ${index + 1}`,
        deck: Array.isArray(preset?.deck) ? [...preset.deck] : [],
        deckShiny: { ...(preset?.deckShiny || {}) },
      })),
    [save],
  );

  const fallbackPresetIndex = Math.max(
    0,
    presets.findIndex((preset) => usablePreset(preset)),
  );
  const activePresetIndex =
    Number.isInteger(save?.activeDeckPreset) && usablePreset(presets[save.activeDeckPreset])
      ? save.activeDeckPreset
      : fallbackPresetIndex;

  const [selectedPreset, setSelectedPreset] = useState(activePresetIndex);
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [privateRoom, setPrivateRoom] = useState(false);
  const [createPassword, setCreatePassword] = useState("");
  const [joinTarget, setJoinTarget] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [error, setError] = useState("");
  const matchedRef = useRef(false);
  const roomRef = useRef(null);

  roomRef.current = room;

  function selectedDeckSource(index = selectedPreset) {
    const preset = presets[index];
    if (usablePreset(preset)) return preset;
    return {
      name: "현재 덱",
      deck: save?.deck || [],
      deckShiny: save?.deckShiny || {},
    };
  }

  function syncPresetFromRoom(next) {
    const deckName = next?.me?.deckName;
    if (!deckName) return;
    const index = presets.findIndex(
      (preset) => usablePreset(preset) && preset.name === deckName,
    );
    if (index >= 0) setSelectedPreset(index);
  }

  function acceptRoom(next) {
    if (!next) return;
    if (next.matchId) {
      if (matchedRef.current) return;
      matchedRef.current = true;
      onActivityChange?.(false);
      onMatched?.({ matchId: next.matchId, friendly: true });
      return;
    }
    syncPresetFromRoom(next);
    setRoom(next);
    setError("");
  }

  async function refreshRooms({ silent = false } = {}) {
    if (listBusy && !silent) return;
    if (!silent) setListBusy(true);
    try {
      const data = await fetchFriendlyRooms();
      setRooms(Array.isArray(data?.rooms) ? data.rooms : []);
      if (!silent) setError("");
    } catch (err) {
      if (!silent) setError(err?.message || "친선전 방 목록을 불러오지 못했습니다.");
    } finally {
      if (!silent) setListBusy(false);
    }
  }

  async function leave({ silent = false } = {}) {
    if (!roomRef.current) return true;
    try {
      await leaveFriendlyRoom();
      setRoom(null);
      setError("");
      onActivityChange?.(false);
      matchedRef.current = false;
      if (!silent) playSfx("click");
      void refreshRooms({ silent: true });
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
    let cancelled = false;

    async function recover() {
      try {
        const current = await fetchFriendlyRoom();
        if (!cancelled) acceptRoom(current);
      } catch (err) {
        if (cancelled) return;
        if (err?.code !== "room_not_found") {
          setError(err?.message || "친선전 상태를 불러오지 못했습니다.");
        }
        await refreshRooms({ silent: true });
      }
    }

    recover();
    return () => {
      cancelled = true;
    };
  }, []);

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
            setError("방이 종료되었거나 방장이 나갔습니다.");
            onActivityChange?.(false);
            void refreshRooms({ silent: true });
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
  }, [room?.roomId]);

  useEffect(() => {
    if (room) return undefined;
    const timer = window.setInterval(
      () => void refreshRooms({ silent: true }),
      LIST_POLL_MS,
    );
    return () => window.clearInterval(timer);
  }, [room]);

  async function createRoom() {
    if (busy) return;
    if (privateRoom && createPassword.length < 4) {
      setError("비밀방 비밀번호는 4자 이상 입력해주세요.");
      playSfx("buzzer");
      return;
    }
    const source = selectedDeckSource();
    if (!usablePreset(source)) {
      setError("30장으로 완성된 덱 프리셋이 필요합니다.");
      playSfx("buzzer");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const next = await createFriendlyRoom(source, {
        name: roomName,
        isPrivate: privateRoom,
        password: createPassword,
      });
      setCreateOpen(false);
      setCreatePassword("");
      acceptRoom(next);
      playSfx("click");
    } catch (err) {
      setError(err?.message || "친선전 방을 만들지 못했습니다.");
      playSfx("buzzer");
    } finally {
      setBusy(false);
    }
  }

  async function enterRoom(target, password = "") {
    if (busy || !target || target.full) return;
    const source = selectedDeckSource();
    if (!usablePreset(source)) {
      setError("30장으로 완성된 덱 프리셋이 필요합니다.");
      playSfx("buzzer");
      return;
    }

    if (target.isPrivate && !password) {
      setJoinTarget(target);
      setJoinPassword("");
      setError("");
      playSfx("click");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const next = await joinFriendlyRoom(target.roomId, source, password);
      setJoinTarget(null);
      setJoinPassword("");
      acceptRoom(next);
      playSfx("click");
    } catch (err) {
      setError(err?.message || "친선전 방에 입장하지 못했습니다.");
      playSfx("buzzer");
    } finally {
      setBusy(false);
    }
  }

  async function changePreset(event) {
    const index = Number(event.target.value);
    setSelectedPreset(index);
    if (!room || room.status !== "waiting") return;
    const source = selectedDeckSource(index);
    if (!usablePreset(source)) return;

    setBusy(true);
    setError("");
    try {
      const next = await updateFriendlyDeck(source);
      acceptRoom(next);
      playSfx("click");
    } catch (err) {
      setError(err?.message || "덱 프리셋을 변경하지 못했습니다.");
      playSfx("buzzer");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReady() {
    if (busy || !room || room.status !== "waiting") return;
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

  if (!room) {
    return (
      <div className="friendly-room-shell friendly-room-browser">
        <div className="friendly-room-browser-head">
          <div className="friendly-room-intro">
            <span className="friendly-room-kicker">FRIENDLY MATCH</span>
            <h2>친선전 방 목록</h2>
            <p>열려 있는 방에 들어가거나 새 방을 만드세요.</p>
          </div>
          <div className="friendly-browser-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={listBusy}
              onClick={() => refreshRooms()}
            >
              {listBusy ? "새로고침 중" : "↻ 새로고침"}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setCreateOpen(true);
                setError("");
                playSfx("click");
              }}
            >
              + 방 만들기
            </button>
          </div>
        </div>

        {error && <div className="friendly-room-error">{error}</div>}

        <div className="friendly-room-list">
          {rooms.length === 0 ? (
            <div className="friendly-room-empty">
              <strong>현재 대기 중인 방이 없습니다.</strong>
              <span>새 방을 만들어 친구와 배틀해보세요.</span>
            </div>
          ) : (
            rooms.map((entry) => (
              <button
                type="button"
                key={entry.roomId}
                className={`friendly-room-list-item ${entry.full ? "is-full" : ""}`}
                disabled={busy || entry.full}
                onMouseEnter={() => !entry.full && playSfx("cursor")}
                onClick={() => enterRoom(entry)}
              >
                <span className="friendly-room-list-main">
                  <strong>
                    {entry.isPrivate && <span className="friendly-lock">🔒</span>}
                    {entry.name}
                  </strong>
                  <small>방장 {entry.host}</small>
                </span>
                <span className="friendly-room-list-meta">
                  <em>{entry.isPrivate ? "비밀방" : "공개방"}</em>
                  <b>{entry.players}/2</b>
                  <span>{entry.full ? "FULL" : "입장 ▶"}</span>
                </span>
              </button>
            ))
          )}
        </div>

        {createOpen && (
          <div className="friendly-modal-overlay" role="dialog" aria-modal="true">
            <div className="friendly-modal-box">
              <span className="friendly-room-kicker">CREATE ROOM</span>
              <h3>친선전 방 만들기</h3>
              <label>
                <span>방 이름</span>
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value.slice(0, 28))}
                  placeholder="내 친선전 방"
                  maxLength={28}
                />
              </label>

              <div className="friendly-privacy-toggle">
                <button
                  type="button"
                  className={!privateRoom ? "is-selected" : ""}
                  onClick={() => setPrivateRoom(false)}
                >
                  🌐 공개방
                  <small>누구나 바로 입장</small>
                </button>
                <button
                  type="button"
                  className={privateRoom ? "is-selected" : ""}
                  onClick={() => setPrivateRoom(true)}
                >
                  🔒 비밀방
                  <small>비밀번호로 입장</small>
                </button>
              </div>

              {privateRoom && (
                <label>
                  <span>비밀번호</span>
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(event) => setCreatePassword(event.target.value.slice(0, 32))}
                    placeholder="4~32자"
                    maxLength={32}
                  />
                </label>
              )}

              <div className="friendly-modal-deck">
                <span>시작 덱</span>
                <select value={selectedPreset} onChange={(event) => setSelectedPreset(Number(event.target.value))}>
                  {presets.map((preset, index) => (
                    <option key={index} value={index} disabled={!usablePreset(preset)}>
                      {preset.name}{usablePreset(preset) ? " · 30장" : " · 미완성"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="friendly-modal-actions">
                <button className="btn-primary" disabled={busy} onClick={createRoom}>
                  {busy ? "생성 중..." : "방 만들기"}
                </button>
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setCreateOpen(false);
                    setCreatePassword("");
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {joinTarget && (
          <div className="friendly-modal-overlay" role="dialog" aria-modal="true">
            <div className="friendly-modal-box friendly-password-box">
              <span className="friendly-room-kicker">PRIVATE ROOM</span>
              <h3>🔒 {joinTarget.name}</h3>
              <p>비밀방 비밀번호를 입력하세요.</p>
              <input
                type="password"
                autoFocus
                value={joinPassword}
                onChange={(event) => setJoinPassword(event.target.value.slice(0, 32))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") enterRoom(joinTarget, joinPassword);
                }}
                placeholder="비밀번호"
                maxLength={32}
              />
              <div className="friendly-modal-actions">
                <button
                  className="btn-primary"
                  disabled={busy || joinPassword.length < 4}
                  onClick={() => enterRoom(joinTarget, joinPassword)}
                >
                  입장
                </button>
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setJoinTarget(null);
                    setJoinPassword("");
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const waitingOpponent = !room.opponent;
  const bothReady = !!room.me?.ready && !!room.opponent?.ready;
  const waitingForReturn = room.status === "returning";

  return (
    <div className="friendly-room-shell friendly-room-lobby">
      <div className="friendly-room-lobby-head">
        <div>
          <span className="friendly-room-kicker">FRIENDLY LOBBY</span>
          <h2>{room.name}</h2>
          <p className="friendly-room-privacy-label">
            {room.isPrivate ? "🔒 비밀방" : "🌐 공개방"}
          </p>
        </div>
        <div className="friendly-room-lobby-badge">
          <span>{room.host ? "HOST" : "GUEST"}</span>
          <strong>{waitingForReturn ? "RESULT WAIT" : "LOBBY"}</strong>
        </div>
      </div>

      {error && <div className="friendly-room-error">{error}</div>}

      <div className="friendly-room-players">
        <div className={`friendly-player-card ${room.me?.ready ? "is-ready" : ""}`}>
          <span className="friendly-player-label">나 {room.host ? "· 방장" : ""}</span>
          <strong>{room.me?.username || "플레이어"}</strong>
          <small>{room.me?.deckName || "선택 덱"}</small>
          <em>
            {waitingForReturn
              ? "RETURNED"
              : room.me?.ready
                ? "READY"
                : "대기 중"}
          </em>
        </div>

        <div className="friendly-room-versus">VS</div>

        <div className={`friendly-player-card ${room.opponent?.ready ? "is-ready" : ""} ${waitingOpponent ? "is-empty" : ""}`}>
          <span className="friendly-player-label">상대 {room.host ? "" : "· 방장"}</span>
          <strong>{room.opponent?.username || "상대 입장 대기"}</strong>
          <small>{room.opponent?.deckName || (waitingOpponent ? "" : "선택 덱")}</small>
          <em>
            {waitingOpponent
              ? "WAITING"
              : waitingForReturn && !room.opponent?.returned
                ? "결과 확인 중"
                : room.opponent?.ready
                  ? "READY"
                  : "준비 중"}
          </em>
        </div>
      </div>

      <div className="friendly-deck-picker">
        <label htmlFor="friendly-deck-preset">내 덱 프리셋</label>
        <select
          id="friendly-deck-preset"
          value={selectedPreset}
          disabled={busy || room.status !== "waiting"}
          onChange={changePreset}
        >
          {presets.map((preset, index) => (
            <option key={index} value={index} disabled={!usablePreset(preset)}>
              {preset.name}{usablePreset(preset) ? " · 30장" : " · 미완성"}
            </option>
          ))}
        </select>
        <span>덱을 바꾸면 준비 상태가 자동으로 해제됩니다.</span>
      </div>

      <div className="friendly-room-status">
        {waitingForReturn
          ? "먼저 대기실로 돌아왔습니다. 상대가 배틀 결과 확인을 마치면 다음 게임을 준비할 수 있습니다."
          : waitingOpponent
            ? "방 목록에서 상대가 입장하기를 기다리는 중입니다."
            : bothReady
              ? room.host
                ? "두 플레이어 모두 준비되었습니다. 게임을 시작할 수 있습니다."
                : "준비 완료 · 방장이 게임을 시작하기를 기다리는 중입니다."
              : "덱 프리셋을 고른 뒤 두 플레이어가 모두 준비하면 시작할 수 있습니다."}
      </div>

      <div className="friendly-room-actions">
        <button
          type="button"
          className={room.me?.ready ? "btn-secondary" : "btn-primary"}
          disabled={busy || room.status !== "waiting"}
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
          disabled={busy || room.status === "playing"}
          onClick={() => leave()}
        >
          방 나가기
        </button>
      </div>
    </div>
  );
}
