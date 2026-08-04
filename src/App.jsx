import React, { useState, useRef } from 'react';
import MainMenu from './components/MainMenu.jsx';
import Battle from './components/Battle.jsx';
import PackShop from './components/PackShop.jsx';
import DeckEditor from './components/DeckEditor.jsx';
import { loadSave, addReward, recordWin, LOSE_REWARD } from './state/save.js';

export default function App() {
  const saveRef = useRef(loadSave());
  const [screen, setScreen] = useState('menu'); // menu | battle | shop | deck
  const [trainer, setTrainer] = useState(null);
  const [, forceRender] = useState(0);

  const rerender = () => forceRender((n) => n + 1);

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
