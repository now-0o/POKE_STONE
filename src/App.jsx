import React, { useState, useRef } from 'react';
import MainMenu from './components/MainMenu.jsx';
import Battle from './components/Battle.jsx';
import PackShop from './components/PackShop.jsx';
import DeckEditor from './components/DeckEditor.jsx';
import { loadSave, addReward, recordWin, LOSE_REWARD, activateAdminMode } from './state/save.js';

const ADMIN_CODE = 'stonemaster'; // 숨겨진 관리자 모드 진입 코드 (아무 화면에서나 그냥 타이핑)

export default function App() {
  const saveRef = useRef(loadSave());
  const [screen, setScreen] = useState('menu'); // menu | battle | shop | deck
  const [trainer, setTrainer] = useState(null);
  const [, forceRender] = useState(0);
  const [adminToast, setAdminToast] = useState(false);
  const keyBuffer = useRef('');

  const rerender = () => forceRender((n) => n + 1);

  // 관리자 모드: 입력창 포커스 없이 아무 화면에서나 'stonemaster'를 타이핑하면 발동.
  // 버튼도, 힌트도, 메뉴 항목도 없음 - 아는 사람만 쓰는 용도.
  React.useEffect(() => {
    function onKeyDown(e) {
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
  }, []);

  function onSaveChange(reload = false) {
    if (reload) saveRef.current = loadSave();
    rerender();
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
  }

  const save = saveRef.current;

  return (
    <div className="app">
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
          onBattle={startBattle}
          onShop={() => setScreen('shop')}
          onDeck={() => setScreen('deck')}
          onSaveChange={onSaveChange}
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
    </div>
  );
}
