// ============================================================
// 오디오 매니저: BGM(화면별 전환+루프) + 효과음(중첩 재생 가능)
// 브라우저 자동재생 정책 때문에, 사용자가 첫 상호작용(클릭/키입력)을 하기 전엔
// 소리가 안 날 수 있음 - 정상 동작이고, 첫 클릭/키입력 시 자동으로 재개됨.
// ============================================================

const BGM_FILES = {
  login: '/audio/bgm/login.mp3',
  main: '/audio/bgm/main.mp3',
  battle: '/audio/bgm/battle.mp3',
  shop: '/audio/bgm/shop.mp3',
};

const SFX_FILES = {
  buy: '/audio/sfx/buy.ogg',
  buzzer: '/audio/sfx/buzzer.ogg',
  click: '/audio/sfx/click.ogg',
  cursor: '/audio/sfx/cursor.ogg',
  pc: '/audio/sfx/pc.ogg',
  slide: '/audio/sfx/slide.ogg',
  pickup: '/audio/sfx/pickup.ogg',
  putdown: '/audio/sfx/putdown.ogg',
};

const MUTE_KEY = 'pkm_stone_muted';
const BGM_VOLUME = 0.38;
const SFX_VOLUME = 0.55;

let muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
let currentBgmKey = null;
let bgmAudio = null;

function tryResumeBgm() {
  if (bgmAudio && !muted) bgmAudio.play().catch(() => {});
}

// 자동재생 차단 대응: 첫 클릭/키입력에서 현재 BGM 재개 시도
if (typeof window !== 'undefined') {
  const unlock = () => {
    tryResumeBgm();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function playBgm(key) {
  if (key === currentBgmKey) return;
  currentBgmKey = key;
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
  const src = BGM_FILES[key];
  if (!src) return;
  bgmAudio = new Audio(src);
  bgmAudio.loop = true;
  bgmAudio.volume = muted ? 0 : BGM_VOLUME;
  bgmAudio.play().catch(() => {}); // 첫 로드 시 차단되면 unlock에서 재시도됨
}

export function playSfx(key) {
  if (muted) return;
  const src = SFX_FILES[key];
  if (!src) return;
  const a = new Audio(src); // 매번 새 인스턴스 - 같은 효과음 겹쳐 재생 가능
  a.volume = SFX_VOLUME;
  a.play().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  if (bgmAudio) bgmAudio.volume = muted ? 0 : BGM_VOLUME;
  return muted;
}

export function isMuted() {
  return muted;
}
