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
import './styles/mobile-deck-landscape.css';
// 모바일 상점/공통 헤더 보정은 가장 마지막에 적용한다.
import './styles/mobile-shop-unified.css';
import './styles/mobile-shop-layout-v2.css';
// 팩 개봉 카드/완료 UI는 모든 모바일 상점 규칙 뒤에서 최종 고정한다.
import './styles/mobile-pack-open-v3.css';
// 세로 팩 개봉은 뷰포트 폭 기반 셀/앞뒤 공통 중심축으로 한 번 더 고정한다.
import './styles/mobile-pack-open-portrait-v4.css';
// 모바일 배틀은 레거시 가로/세로 배치보다 마지막에 모바일 전용으로 재구성한다.
import './styles/mobile-battle-v2.css';
import './styles/mobile-battle-v2-fixes.css';
// 팩 확대 카드와 트레이너 선택 스크롤은 모든 모바일 화면 규칙 뒤에서 최종 고정한다.
import './styles/mobile-pack-inspect-mainmenu-v1.css';
// 하스스톤형 모바일 배틀 HUD/손패는 기존 모바일 배틀 규칙을 최종 대체한다.
import './styles/mobile-battle-hearthstone-v3.css';
import './styles/mobile-battle-hearthstone-v3-fixes.css';

import './features/mobile/battle-hand-runtime.js';
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
