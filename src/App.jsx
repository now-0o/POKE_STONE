import React, { useState, useRef, useEffect } from "react";
import MainMenu from "./components/MainMenu.jsx";
import Battle from "./components/Battle.jsx";
import PackShop from "./components/PackShop.jsx";
import DeckEditor from "./components/ResponsiveDeckEditor.jsx";
import CardDex from "./components/CardDex.jsx";
import Tutorial from "./components/Tutorial.jsx";
import Auth from "./components/Auth.jsx";
import PatchNotes from "./components/PatchNotes.jsx";
import {
  loadSave,
  newSave,
  persist,
  addReward,
  recordWin,
  LOSE_REWARD,
  activateAdminMode,
  ensureDeckPresets,
} from "./state/save.js";
import {
  getToken,
  getStoredUsername,
  clearAuth,
  fetchSave,
  pushSave,
} from "./state/api.js";
import { playBgm, toggleMute, isMuted, setVolume, getVolume } from "./audio.js";

const ADMIN_CODE = "stonemaster"; // 숨겨진 관리자 모드 진입 코드 (아무 화면에서나 그냥 타이핑)

export default function App() {
  const saveRef = useRef(null);
  const [screen, setScreen] = useState("menu"); // menu | battle | shop | deck | dex | tutorial
  const [trainer, setTrainer] = useState(null);
  const [, forceRender] = useState(0);
  const [adminToast, setAdminToast] = useState(false);
  const [syncToast, setSyncToast] = useState("");
  const syncToastTimer = useRef(null);
  const keyBuffer = useRef("");

  // ── 인증 상태 ──
  // checking: 저장된 토큰이 있는지 서버에 확인 중 (앱 첫 로딩)
  // authed: 로그인 완료, 게임 화면 렌더 가능
  const [authStatus, setAuthStatus] = useState("checking"); // checking | authed | anon | error
  const [username, setUsername] = useState(getStoredUsername());

  const rerender = () => forceRender((n) => n + 1);

  const [muted, setMuted] = useState(isMuted());
  const [volume, setVolumeState] = useState(getVolume());

  function showSyncToast(message) {
    setSyncToast(message);
    clearTimeout(syncToastTimer.current);
    syncToastTimer.current = setTimeout(() => setSyncToast(""), 3200);
  }

  // 화면에 맞는 BGM 전환: 로그인 / 메인·덱편집·도감·튜토리얼 / 상점 / 배틀
  // 배틀은 지역/트레이너 구분 없이 battle.mp3 한 곡만 사용한다.
  useEffect(() => {
    if (authStatus === "anon" || authStatus === "checking") {
      playBgm("login");
    } else if (screen === "shop") {
      playBgm("shop");
    } else if (screen === "battle") {
      playBgm("battle");
    } else {
      playBgm("main");
    }
  }, [authStatus, screen]);

  useEffect(
    () => () => {
      clearTimeout(syncToastTimer.current);
    },
    [],
  );

  // 앱 첫 로딩: 저장된 토큰이 있으면 유효한지 서버에 확인하고 세이브를 받아온다
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthStatus("anon");
      return;
    }
    fetchSave()
      .then((serverSave) => {
        applyServerSave(serverSave);
        setAuthStatus("authed");
      })
      .catch(() => {
        clearAuth();
        setAuthStatus("anon");
      });
  }, []);

  // 서버에서 받은(혹은 새로 만든) 세이브를 로컬 캐시에 덮어쓰고 메모리에 반영.
  // 다른 계정으로 로그인했을 때 이전 계정의 로컬 캐시가 남아있는 문제를 막기 위해
  // 항상 서버 응답으로 완전히 덮어씀.
  function applyServerSave(serverSave) {
    const save = ensureDeckPresets(serverSave || newSave());
    persist(save);
    saveRef.current = save;
    if (!serverSave) pushSave(save).catch(handleSaveSyncError); // 신규 유저면 서버에도 첫 세이브 반영
  }

  function handleSaveSyncError(e) {
    // 다른 기기의 저장과 충돌한 순간 서버가 돌려준 최신 세이브를 즉시 적용한다.
    // 충돌 전에 같은 기기 큐에 대기 중이던 요청은 api.js에서 save_superseded로 폐기된다.
    if (e?.code === "save_conflict") {
      const latest = ensureDeckPresets(e.serverSave || newSave());
      persist(latest);
      saveRef.current = latest;
      setSelectedBattleStateAfterSync();
      rerender();
      showSyncToast("다른 기기의 최신 세이브를 불러왔습니다.");
      return;
    }

    if (e?.code === "save_superseded") return;

    console.warn("세이브 서버 동기화 실패:", e?.message || e);
  }

  function setSelectedBattleStateAfterSync() {
    // 배틀 중 충돌이 나면 이미 시작한 배틀은 옛 세이브를 기반으로 하고 있으므로
    // 최신 서버 세이브와 섞지 않고 안전하게 메인으로 돌린다.
    if (screen === "battle") {
      setTrainer(null);
      setScreen("menu");
    }
  }

  function onAuthed(serverSave) {
    setUsername(getStoredUsername());
    applyServerSave(serverSave);
    setAuthStatus("authed");
  }

  function onLogout() {
    clearAuth();
    saveRef.current = null;
    setUsername(null);
    setScreen("menu");
    setTrainer(null);
    setAuthStatus("anon");
  }

  // 관리자 모드: 입력창 포커스 없이 아무 화면에서나 'stonemaster'를 타이핑하면 발동.
  // 버튼도, 힌트도, 메뉴 항목도 없음 - 아는 사람만 쓰는 용도.
  useEffect(() => {
    function onKeyDown(e) {
      if (authStatus !== "authed") return;
      if (e.target && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key.length !== 1) return;
      keyBuffer.current = (keyBuffer.current + e.key.toLowerCase()).slice(
        -ADMIN_CODE.length,
      );
      if (keyBuffer.current === ADMIN_CODE) {
        activateAdminMode(saveRef.current);
        onSaveChange(true);
        setAdminToast(true);
        setTimeout(() => setAdminToast(false), 1800);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authStatus]);

  function onSaveChange(reload = false) {
    if (reload) saveRef.current = loadSave();
    rerender();
    // 로그인 상태에서 변경된 세이브는 서버로도 반영.
    // revision 충돌이면 오래된 로컬 세이브를 저장하지 않고 최신 서버 세이브로 복구한다.
    if (saveRef.current) pushSave(saveRef.current).catch(handleSaveSyncError);
  }

  const battleKeyRef = useRef(0);
  function startBattle(t) {
    battleKeyRef.current += 1; // 배틀 시작할 때만 갱신 - 리렌더마다 안 바뀌게
    setTrainer(t);
    setScreen("battle");
  }

  function finishBattle(winner) {
    const save = saveRef.current;
    if (winner === "player") {
      addReward(save, trainer.reward);
      recordWin(save, trainer.id);
    } else if (winner === "enemy") {
      addReward(save, LOSE_REWARD);
    }
    setTrainer(null);
    setScreen("menu");
    onSaveChange();
  }

  let body;
  if (authStatus === "checking") {
    body = (
      <div className="main-menu">
        <p style={{ marginTop: 60, opacity: 0.6 }}>불러오는 중...</p>
      </div>
    );
  } else if (authStatus === "anon") {
    body = <Auth onAuthed={onAuthed} />;
  } else {
    const save = saveRef.current;
    body = (
      <>
        {adminToast && (
          <div
            style={{
              position: "fixed",
              top: 12,
              right: 12,
              zIndex: 9999,
              background: "#1a1030",
              border: "1px solid #a04ae0",
              color: "#e8d4ff",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
            }}
          >
            관리자 모드 활성화 — 자금·전 카드 해금됨
          </div>
        )}
        {syncToast && (
          <div
            style={{
              position: "fixed",
              top: adminToast ? 58 : 12,
              right: 12,
              zIndex: 9999,
              background: "#10271c",
              border: "1px solid #56c987",
              color: "#d9ffe8",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
            }}
          >
            {syncToast}
          </div>
        )}
        {screen === "menu" && (
          <MainMenu
            save={save}
            username={username}
            onBattle={startBattle}
            onShop={() => setScreen("shop")}
            onDeck={() => setScreen("deck")}
            onDex={() => setScreen("dex")}
            onTutorial={() => setScreen("tutorial")}
            onSaveChange={onSaveChange}
            onLogout={onLogout}
          />
        )}
        {screen === "battle" && trainer && (
          <Battle
            key={trainer.id + "-" + battleKeyRef.current}
            trainer={trainer}
            deck={save.deck}
            deckShiny={save.deckShiny || {}}
            onFinish={finishBattle}
          />
        )}
        {screen === "shop" && (
          <PackShop
            save={save}
            onSaveChange={onSaveChange}
            onBack={() => setScreen("menu")}
          />
        )}
        {screen === "deck" && (
          <DeckEditor
            save={save}
            onSaveChange={onSaveChange}
            onBack={() => setScreen("menu")}
          />
        )}
        {screen === "dex" && (
          <CardDex
            save={save}
            onSaveChange={onSaveChange}
            onBack={() => setScreen("menu")}
            onShop={() => setScreen("shop")}
          />
        )}
        {screen === "tutorial" && (
          <Tutorial onBack={() => setScreen("menu")} />
        )}
      </>
    );
  }

  return (
    <div className="app">
      <div className="rotate-prompt">
        <div className="rotate-prompt-icon">📱</div>
        <p>포스스톤은 가로 화면에서 즐겨주세요!</p>
        <p className="rotate-prompt-sub">기기를 옆으로 돌려주세요</p>
      </div>
      <div className="audio-controls">
        <button
          className="btn-mute"
          onClick={() => setMuted(toggleMute())}
          title={muted ? "음소거 해제" : "음소거"}
        >
          {muted || volume === 0 ? "🔇" : "🔊"}
        </button>
        <input
          className="volume-slider"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            setVolumeState(v);
            setVolume(v);
            setMuted(isMuted()); // 슬라이더로 볼륨 올리면 자동 음소거 해제되므로 상태 동기화
          }}
          title="음량"
        />
      </div>
      <PatchNotes />
      {body}
    </div>
  );
}
