import React from 'react';
import ReactDOM from 'react-dom/client';

// 확장 데이터는 App 모듈보다 먼저 등록한다.
// 하나지방 카드도 같은 확장 레지스트리 순서로 로드한다.
import './data/cards/sinnoh.js';
import './data/cards/unova.js';
import './data/cards/unova-trainers.js';
import './data/trainers/unova.js';
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
import './features/tutorial/effects.css';
import './features/tutorial/menu.css';
import './features/region-carousel/styles.css';
import './styles/sinnoh/index.css';
import './styles/unova-battle.css';
import './features/mobile/styles.css';
import './features/mobile/battle-expanded.css';
// 모든 화면별/모바일 스타일 적용 뒤 비카드 UI 글자 가독성을 최종 보정한다.
import './styles/ui-readability.css';
// 모바일 덱 편집기는 공용 모바일 규칙보다 뒤에서 최종 보정한다.
import './styles/mobile-deck-editor-v2.css';
import './styles/mobile-deck-responsive-overrides.css';

import './features/battle/runtime.js';
import './features/battle/fixedFieldPlacement.js';
import './features/battle/cynthiaSpeech.js';
import './features/deck-editor/hoverPreview.jsx';
import './components/battle/SinnohBattleUi.jsx';
import './components/battle/UnovaBattleUi.jsx';
import './components/battle/WakeBattleUi.jsx';
import './components/battle/CynthiaBattleUi.jsx';
import './components/battle/CynthiaToxicSpikesUi.jsx';
import './features/region-carousel/index.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
