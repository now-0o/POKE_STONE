import React, { useState, useRef, useEffect } from "react";
import MainMenu from "./components/MainMenu.jsx";
import Battle from "./components/Battle.jsx";
import PackShop from "./components/PackShop.jsx";
import DeckEditor from "./components/ResponsiveDeckEditor.jsx";
import CardDex from "./components/CardDex.jsx";
import Tutorial from "./components/Tutorial.jsx";
import Auth from "./components/Auth.jsx";
import PatchNotes from "./components/PatchNotes.jsx";
import OnlineMatchmaking from "./components/OnlineMatchmaking.jsx";
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
  getStoredAdmin,
  clearAuth,
  fetchSave,
  pushSave,
  unlockAdmin,
} from "./state/api.js";
import { playBgm, toggleMute, isMuted, setVolume, getVolume } from "./audio.js";

const ADMIN_CODE = "stonemaster";

export default function App() {
  const saveRef = useRef(null);
  const [screen, setScreen] = useState("menu"); // menu | battle | online | shop | deck | dex | tutorial
  const [trainer, setTrainer] = useState(null);
  const [, forceRender] = useState(0);
  const [adminToast, setAdminToast] = useState(false);
  const [syncToast, setSyncToast] = useState("");
  const syncToastTimer = useRef(null);
  const keyBuffer = useRef("");

  const [authStatus, setAuthStatus] = useState("checking");
  const [username, setUsername] = useState(getStoredUsername());
  const [isAdmin, setIsAdmin] = useState(getStoredAdmin());

  const rerender = () => forceRender((n) => n + 1);

  const [muted, setMuted] = useState(isMuted());
  const [volume, setVolumeState] = useState(getVolume());

  function showSyncToast(message) {
    setSyncToast(message);
    clearTimeout(syncToastTimer.current);
    syncToastTimer.current = setTimeout(() => setSyncToast(""), 3200);
  }

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

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthStatus("anon");
      return;
    }
    fetchSave()
      .then((serverSave) => {
        applyServerSave(serverSave);
        setIsAdmin(getStoredAdmin());
        setAuthStatus("authed");
      })
      .catch(() => {
        clearAuth();
        setIsAdmin(false);
        setAuthStatus("anon");
      });
  }, []);

  function applyServerSave(serverSave) {
    const save = ensureDeckPresets(serverSave || newSave());
    persist(save);
    saveRef.current = save;
    if (!serverSave) pushSave(save).catch(handleSaveSyncError);
  }

  function handleSaveSyncError(e) {
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
    if (screen === "battle" || screen === "online") {
      setTrainer(null);
      setScreen("menu");
    }
  }

  function onAuthed(serverSave) {
    setUsername(getStoredUsername());
    setIsAdmin(getStoredAdmin());
    applyServerSave(serverSave);
    setAuthStatus("authed");
  }

  function onLogout() {
    clearAuth();
    saveRef.current = null;
    setUsername(null);
    setIsAdmin(false);
    setScreen("menu");
    setTrainer(null);
    setAuthStatus("anon");
  }

  // 관리자 모드: stonemaster 입력 시 기존 로컬 치트와 서버 관리자 권한을 함께 활성화한다.
  useEffect(() => {
    function onKeyDown(e) {
      if (authStatus !== "authed") return;
      if (e.target && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key.length !== 1) return;
      keyBuffer.current = (keyBuffer.current + e.key.toLowerCase()).slice(
        -ADMIN_CODE.length,
      );
      if (keyBuffer.current !== ADMIN_CODE) return;

      keyBuffer.current = "";
      activateAdminMode(saveRef.current);
      onSaveChange(true);

      unlockAdmin(ADMIN_CODE)
        .then(() => {
          setIsAdmin(true);
          setAdminToast(true);
          setTimeout(() => setAdminToast(false), 1800);
        })
        .catch((err) => {
          setIsAdmin(false);
          showSyncToast(
            `로컬 관리자 모드는 켜졌지만 서버 권한 등록에 실패했습니다: ${err?.message || "연결 오류"}`,
          );
        });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authStatus]);

  function onSaveChange(reload = false) {
    if (reload) saveRef.current = loadSave();
    rerender();
    if (saveRef.current) pushSave(saveRef.current).catch(handleSaveSyncError);
  }

  const battleKeyRef = useRef(0);
  function startBattle(t) {
    battleKeyRef.current += 1;
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
            관리자 모드 활성화 — 온라인 테스트 권한 포함
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
            onlineAdmin={isAdmin}
            onOnline={() => setScreen("online")}
            onBattle={startBattle}
            onShop={() => setScreen("shop")}
            onDeck={() => setScreen("deck")}
            onDex={() => setScreen("dex")}
            onTutorial={() => setScreen("tutorial")}
            onSaveChange={onSaveChange}
            onLogout={onLogout}
          />
        )}
        {screen === "online" && (
          <OnlineMatchmaking
            save={save}
            isAdmin={isAdmin}
            onBack={() => setScreen("menu")}
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
            setMuted(isMuted());
          }}
          title="음량"
        />
      </div>
      <PatchNotes />
      {body}
    </div>
  );
}
