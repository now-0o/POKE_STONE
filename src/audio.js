// ============================================================
// 오디오 매니저: BGM(화면별 전환+루프+크로스페이드) + 효과음(중첩 재생 가능)
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
const VOLUME_KEY = 'pkm_stone_volume';
const BGM_BASE = 0.38; // 볼륨 1.0(=100%)일 때 기준 음량
const SFX_BASE = 0.55;
const FADE_MS = 650;

let muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
let volume = (() => {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(VOLUME_KEY) : null;
  const n = raw !== null ? parseFloat(raw) : 0.7;
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.7;
})();

let currentBgmKey = null;
let bgmAudio = null; // 현재(새로) 재생 중인 트랙
const fadeOuts = new Set(); // 페이드아웃 중인 이전 트랙들 (겹쳐서 여러 개 빠질 수 있음)

function effectiveBgmVolume() {
  return muted ? 0 : BGM_BASE * volume;
}

// requestAnimationFrame 기반 부드러운 볼륨 램프
function fade(audio, toVolume, duration, onDone) {
  const fromVolume = audio.volume;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    audio.volume = fromVolume + (toVolume - fromVolume) * t;
    if (t < 1) requestAnimationFrame(step);
    else onDone && onDone();
  }
  requestAnimationFrame(step);
}

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

  // 기존 트랙은 페이드아웃 후 정지 (여러 번 빠르게 전환해도 각자 독립적으로 꺼짐)
  if (bgmAudio) {
    const old = bgmAudio;
    fadeOuts.add(old);
    fade(old, 0, FADE_MS, () => {
      old.pause();
      fadeOuts.delete(old);
    });
  }

  const src = BGM_FILES[key];
  if (!src) {
    bgmAudio = null;
    return;
  }
  const next = new Audio(src);
  next.loop = true;
  next.volume = 0;
  next.play().catch(() => {}); // 첫 로드 시 차단되면 unlock에서 재시도됨
  fade(next, effectiveBgmVolume(), FADE_MS);
  bgmAudio = next;
}

export function playSfx(key) {
  if (muted) return;
  const src = SFX_FILES[key];
  if (!src) return;
  const a = new Audio(src); // 매번 새 인스턴스 - 같은 효과음 겹쳐 재생 가능
  a.volume = SFX_BASE * volume;
  a.play().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  if (bgmAudio) bgmAudio.volume = effectiveBgmVolume();
  return muted;
}

export function isMuted() {
  return muted;
}

// v(0~1): 마스터 볼륨 슬라이더 값
export function setVolume(v) {
  volume = Math.min(1, Math.max(0, v));
  localStorage.setItem(VOLUME_KEY, String(volume));
  if (bgmAudio) bgmAudio.volume = effectiveBgmVolume();
  // 0보다 크게 올리면 자동으로 음소거 해제 (직관적인 UX)
  if (muted && volume > 0) {
    muted = false;
    localStorage.setItem(MUTE_KEY, '0');
    if (bgmAudio) bgmAudio.volume = effectiveBgmVolume();
  }
}

export function getVolume() {
  return volume;
}
