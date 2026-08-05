// ============================================================
// 오디오 매니저: BGM(화면별 전환+루프+크로스페이드) + 효과음(중첩 재생 가능)
//
// 설계 메모: BGM은 화면 전환마다 새 Audio 객체를 만들지 않고, 4개 트랙을
// 모듈 로드 시점에 한 번만 만들어서 재사용한다. 브라우저는 "한 번이라도
// 사용자 제스처와 함께 재생된 적 있는 미디어 엘리먼트"를 이후 재생할 때
// 자동재생 차단을 덜 엄격하게 적용하는 경향이 있어서, 매번 새 Audio를
// 만드는 것보다 훨씬 안정적으로 소리가 남.
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

// 트랙별 Audio 엘리먼트를 미리 하나씩만 만들어서 재사용 (브라우저별 위와 같음)
const bgmElements = typeof Audio !== 'undefined'
  ? Object.fromEntries(Object.entries(BGM_FILES).map(([key, src]) => {
      const a = new Audio(src);
      a.loop = true;
      a.volume = 0;
      return [key, a];
    }))
  : {};

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

// 상시 자동복구: 클릭/키입력이 있을 때마다 "재생 중이어야 하는데 멈춰있는" 트랙을 재시도.
// (1회성으로 리스너를 떼지 않음 - 어떤 화면 전환에서 play()가 조용히 막혀도
//  다음 상호작용에서 알아서 복구됨)
if (typeof window !== 'undefined') {
  const nudge = () => {
    const active = bgmElements[currentBgmKey];
    if (active && active.paused && !muted) active.play().catch(() => {});
  };
  window.addEventListener('pointerdown', nudge);
  window.addEventListener('keydown', nudge);
}

export function playBgm(key) {
  if (key === currentBgmKey) return;
  const prevKey = currentBgmKey;
  currentBgmKey = key;

  const old = bgmElements[prevKey];
  if (old) fade(old, 0, FADE_MS, () => old.pause());

  const next = bgmElements[key];
  if (!next) return;
  next.play().catch(() => {}); // 막히더라도 위 nudge()가 다음 상호작용에서 재시도함
  fade(next, effectiveBgmVolume(), FADE_MS);
}

export function playSfx(key) {
  if (muted) return;
  const src = SFX_FILES[key];
  if (!src) return;
  const a = new Audio(src); // 효과음은 짧고 겹쳐 재생돼야 하니 매번 새 인스턴스가 맞음
  a.volume = SFX_BASE * volume;
  a.play().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  const active = bgmElements[currentBgmKey];
  if (active) active.volume = effectiveBgmVolume();
  return muted;
}

export function isMuted() {
  return muted;
}

// v(0~1): 마스터 볼륨 슬라이더 값
export function setVolume(v) {
  volume = Math.min(1, Math.max(0, v));
  localStorage.setItem(VOLUME_KEY, String(volume));
  if (muted && volume > 0) {
    muted = false;
    localStorage.setItem(MUTE_KEY, '0');
  }
  const active = bgmElements[currentBgmKey];
  if (active) active.volume = effectiveBgmVolume();
}

export function getVolume() {
  return volume;
}
