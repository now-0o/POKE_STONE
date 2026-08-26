import React from 'react';
import ReactDOM from 'react-dom/client';

// 확장 데이터는 App 모듈보다 먼저 등록한다.
// 하나지방 카드도 같은 확장 레지스트리 순서로 로드한다.
import './data/cards/sinnoh.js';
import './data/cards/unova.js';
import './data/cards/unova-pack.js';
import './data/cards/unova-legendary-overrides.js';
import './data/cards/unova-trainers.js';
import './data/cards/weather-v34.js';
// 일반 카드 확장이 모두 등록된 뒤 v3.3 밸런스 수치를 최종 적용한다.
import './data/cards/balance-v33.js';
import './data/trainers/unova.js';
import './data/trainers/unova-reward-overrides.js';
import './data/trainers/unova-n.js';
import './data/trainers/sinnoh.js';
import './data/cards/cynthia.js';
import './data/trainers/cynthia.js';
import './data/trainers/balance-overrides.js';
import './data/cards/labels.js';
import App from './App.jsx';

import './styles.css';
import './features/battle/styles.css';
import './features/battle/wave-effects.css';
import './features/battle/cost-colors.css';
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
import './styles/unova-drayden-hud-fix.css';
import './features/battle/drayden-fear.css';
import './features/mobile/styles.css';
import './features/mobile/battle-expanded.css';
// 모든 화면별/모바일 스타일 적용 뒤 비카드 UI 글자 가독성을 최종 보정한다.
import './styles/ui-readability.css';
import './styles/shiny.css';
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
// 팩 확대 카드와 트레이너 선택 스크롤은 모든 모바일 상점 규칙 뒤에서 최종 고정한다.
import './styles/mobile-pack-inspect-mainmenu-v1.css';
// 하스스톤형 모바일 배틀 HUD/손패는 기존 모바일 배틀 규칙을 최종 대체한다.
import './styles/mobile-battle-hearthstone-v3.css';
import './styles/mobile-battle-hearthstone-v3-fixes.css';
// V4는 손패 이동 애니메이션/프로필/필드 중앙정렬/코인토스를 최종 보정한다.
import './styles/mobile-battle-hearthstone-v4.css';
// 진화체 버리고 뽑기 등 모바일 배틀 컨트롤 위치를 V4 뒤에서 최종 보정한다.
import './styles/mobile-battle-controls-fix.css';
// V5는 가로 대상 선택 시 필드 시야를 확보하고, 세로 확대 손패를 일자 스크롤로 바꾼다.
import './styles/mobile-battle-targeting-v5.css';
// V6는 실제 카드 드래그 중 손패를 숨겨 필드 판독성을 최종 확보한다.
import './styles/mobile-battle-drag-visibility-v6.css';
// N 친밀도 숫자/사슬 전향 연출은 모바일 배틀 최종 레이아웃 위에 표시한다.
import './features/battle/n-bond.css';
// 풍란 공중날기는 카드 그림이 아니라 필드 카드 전체가 떠오르도록 최종 덮어쓴다.
import './features/battle/skyla-airborne-card.css';

import './features/mobile/battle-hand-runtime.js';
// 세로 확대 손패의 좌우 스크롤과 모바일 VisualViewport 보정을 담당한다.
import './features/mobile/mobileBattleUxRuntime.js';
// 대상 선택이 없는 기술은 클릭/터치 즉발을 막고 드롭으로만 사용한다.
import './features/battle/dragOnlyTechniqueRuntime.js';
import './features/battle/runtime.js';
// 기존 전투 기록 레일에 진화/메가진화 이벤트를 스프라이트 로그로 보강한다.
import './features/battle/battleHistoryEvolutionRuntime.js';
import './features/battle/costColorRuntime.js';
import './features/battle/fixedFieldPlacement.js';
import './features/battle/cynthiaSpeech.js';
import './features/deck-editor/hoverPreview.jsx';
// 덱 목록의 이로치 표시는 저장된 deckShiny 값을 최종 기준으로 동기화한다.
import './features/deck-editor/shinyDeckVisualRuntime.js';
import './components/battle/SinnohBattleUi.jsx';
import './components/battle/UnovaBattleUi.jsx';
// 사간의 용의 위압이 상승할 때 필드로 퍼지는 드래곤 피어 연출을 재생한다.
import './features/battle/draydenFearRuntime.js';
// N의 친밀도 표시와 전향/복귀 사슬, 페이즈 전설 등장 연출을 재생한다.
import './features/battle/nBondRuntime.js';
import './features/battle/unovaLegendaryRuntime.js';
// 탈출버튼/레드카드로 필드에서 손으로 돌아갈 때 퇴장 연출을 추가한다.
import './features/battle/returnItemAnimationRuntime.js';
// 아티 고치 카운트/우화 연출은 하나지방 DOM 효과가 등록된 뒤 적용한다.
import './features/battle/burghCocoonRuntime.js';
// 카밀레는 매 턴 선택 결과를 받은 뒤 무대를 훑고 대상에 고정되는 연출을 재생한다.
import './features/battle/elesaSpotlightRuntime.js';
import './components/battle/WakeBattleUi.jsx';
import './components/battle/CynthiaBattleUi.jsx';
import './components/battle/CynthiaToxicSpikesUi.jsx';
import './features/region-carousel/index.js';
// 카드 외형 통일 규칙은 모든 화면/런타임 모듈보다 마지막에 로드해 최종 우선순위를 가진다.
import './styles/battle-card-canonical.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
