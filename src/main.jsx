import React from 'react';
import ReactDOM from 'react-dom/client';

// 확장 데이터는 App 모듈보다 먼저 등록한다.
import './data/cards/sinnoh.js';
import './data/trainers/sinnoh.js';
import './data/cards/cynthia.js';
import './data/trainers/cynthia.js';
import App from './App.jsx';

import './styles.css';
import './features/battle/styles.css';
import './features/navigation/transitions.css';
import './features/deck-editor/styles.css';
import './features/pack-shop/styles.css';
import './features/region-carousel/styles.css';
import './styles/sinnoh/index.css';

import './features/battle/runtime.js';
import './features/deck-editor/hoverPreview.jsx';
import './components/battle/SinnohBattleUi.jsx';
import './components/battle/CynthiaBattleUi.jsx';
import './features/region-carousel/index.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
