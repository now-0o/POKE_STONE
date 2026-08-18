import React from 'react';
import ReactDOM from 'react-dom/client';

// 확장 데이터는 App 모듈보다 먼저 등록한다.
import './data/cards/sinnoh.js';
import './data/trainers/sinnoh.js';
import './data/cards/cynthia.js';
import './data/trainers/cynthia.js';
import './data/trainers/balance-overrides.js';
import './data/cards/labels.js';
import App from './App.jsx';

import './styles.css';
import './features/battle/styles.css';
import './features/battle/wave-effects.css';
import './features/navigation/transitions.css';
import './features/deck-editor/styles.css';
import './features/deck-editor/card-scale.css';
import './features/deck-editor/mobile-performance.css';
import './features/pack-shop/styles.css';
import './features/tutorial/styles.css';
import './features/tutorial/menu.css';
import './features/region-carousel/styles.css';
import './styles/sinnoh/index.css';
import './features/mobile/styles.css';
import './features/mobile/battle-expanded.css';

import './features/battle/runtime.js';
import './features/battle/fixedFieldPlacement.js';
import './features/battle/cynthiaSpeech.js';
import './features/deck-editor/hoverPreview.jsx';
import './components/battle/SinnohBattleUi.jsx';
import './components/battle/WakeBattleUi.jsx';
import './components/battle/CynthiaBattleUi.jsx';
import './components/battle/CynthiaToxicSpikesUi.jsx';
import './features/region-carousel/index.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);