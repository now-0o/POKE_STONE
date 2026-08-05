import React, { useState, useRef, useEffect } from 'react';
import MainMenu from './components/MainMenu.jsx';
import Battle from './components/Battle.jsx';
import PackShop from './components/PackShop.jsx';
import DeckEditor from './components/DeckEditor.jsx';
import Auth from './components/Auth.jsx';
import { loadSave, newSave, persist, addReward, recordWin, LOSE_REWARD, activateAdminMode } from './state/save.js';
import { getToken, getStoredUsername, clearAuth, fetchSave, pushSave } from './state/api.js';

const ADMIN_CODE = 'stonemaster'; // 숨겨진 관리자 모드 진입 코드 (아무 화면에서나 그냥 타이핑)

export default function App() {
  const saveRef = useRef(null);
  const [screen, setScreen] = useState('menu'); // menu | battle | shop | deck
  const [trainer, setTrainer] = useState(null);
  const [, forceRender] = useState(0);
  const [adminToast, setAdminToast] = useState(false);
  const keyBuffer = useRef('');

  // ── 인증 상태 ──
  // checking: 저장된 토큰이 있는지 서버에 확인 중 (앱 첫 로딩)
  // authed: 로그인 완료, 게임 화면 렌더 가능
  const [authStatus, setAuthStatus] = useState('checking'); // checking | authed | anon | error
  const [username, setUsername] = useState(getStoredUsername());

  const rerender = () => forceRender((n) => n + 1);

  // 앱 첫 로딩: 저장된 토큰이 있으면 유효한지 서버에 확인하고 세이브를 받아온다
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthStatus('anon');
      return;
    }
    fetchSave()
      .then((serverSave) => {
        applyServerSave(serverSave);
        setAuthStatus('authed');
      })
      .catch(() => {
        clearAuth();
        setAuthStatus('anon');
      });
  }, []);

  // 서버에서 받은(혹은 새로 만든) 세이브를 로컬 캐시에 덮어쓰고 메모리에 반영.
  // 다른 계정으로 로그인했을 때 이전 계정의 로컬 캐시가 남아있는 문제를 막기 위해
  // 항상 서버 응답으로 완전히 덮어씀.
  function applyServerSave(serverSave) {
    const save = serverSave || newSave();
    persist(save);
    saveRef.current = save;
    if (!serverSave) pushSave(save).catch(() => {}); // 신규 유저면 서버에도 첫 세이브 반영
  }

  function onAuthed(serverSave) {
    setUsername(getStoredUsername());
    applyServerSave(serverSave);
    setAuthStatus('authed');
  }

  function onLogout() {
    clearAuth();
    saveRef.current = null;
    setUsername(null);
    setScreen('menu');
    setTrainer(null);
    setAuthStatus('anon');
  }

  // 관리자 모드: 입력창 포커스 없이 아무 화면에서나 'stonemaster'를 타이핑하면 발동.
  // 버튼도, 힌트도, 메뉴 항목도 없음 - 아는 사람만 쓰는 용도.
  useEffect(() => {
    function onKeyDown(e) {
      if (authStatus !== 'authed') return;
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key.length !== 1) return;
      keyBuffer.current = (keyBuffer.current + e.key.toLowerCase()).slice(-ADMIN_CODE.length);
      if (keyBuffer.current === ADMIN_CODE) {
        activateAdminMode(saveRef.current);
        onSaveChange(true);
        setAdminToast(true);
        setTimeout(() => setAdminToast(false), 1800);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authStatus]);

  function onSaveChange(reload = false) {
    if (reload) saveRef.current = loadSave();
    rerender();
    // 로그인 상태에서 변경된 세이브는 서버로도 반영 (실패해도 로컬은 이미 반영돼있어 게임은 계속 가능)
    if (saveRef.current) pushSave(saveRef.current).catch((e) => console.warn('세이브 서버 동기화 실패:', e.message));
  }

  function startBattle(t) {
    setTrainer(t);
    setScreen('battle');
  }

  function finishBattle(winner) {
    const save = saveRef.current;
    if (winner === 'player') {
      addReward(save, trainer.reward);
      recordWin(save, trainer.id);
    } else if (winner === 'enemy') {
      addReward(save, LOSE_REWARD);
    }
    setTrainer(null);
    setScreen('menu');
    onSaveChange();
  }

  let body;
  if (authStatus === 'checking') {
    body = <div className="main-menu"><p style={{ marginTop: 60, opacity: 0.6 }}>불러오는 중...</p></div>;
  } else if (authStatus === 'anon') {
    body = <Auth onAuthed={onAuthed} />;
  } else {
    const save = saveRef.current;
    body = (
      <>
        {adminToast && (
          <div style={{
            position: 'fixed', top: 12, right: 12, zIndex: 9999,
            background: '#1a1030', border: '1px solid #a04ae0', color: '#e8d4ff',
            padding: '8px 14px', borderRadius: 8, fontSize: 13, boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          }}>
            관리자 모드 활성화 — 자금·전 카드 해금됨
          </div>
        )}
        {screen === 'menu' && (
          <MainMenu
            save={save}
            username={username}
            onBattle={startBattle}
            onShop={() => setScreen('shop')}
            onDeck={() => setScreen('deck')}
            onSaveChange={onSaveChange}
            onLogout={onLogout}
          />
        )}
      {screen === 'battle' && trainer && (
        <Battle
          key={trainer.id + Date.now()}
          trainer={trainer}
          deck={save.deck}
          onFinish={finishBattle}
        />
      )}
      {screen === 'shop' && (
        <PackShop save={save} onSaveChange={onSaveChange} onBack={() => setScreen('menu')} />
      )}
      {screen === 'deck' && (
        <DeckEditor save={save} onSaveChange={onSaveChange} onBack={() => setScreen('menu')} />
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
      {body}
    </div>
  );
}
