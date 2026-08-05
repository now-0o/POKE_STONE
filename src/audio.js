// ============================================================
// 오디오 매니저: BGM(화면별 전환+루프+크로스페이드) + 효과음(중첩 재생 가능)
//
// 설계 메모: BGM은 화면 전환마다 새 Audio 객체를 만들지 않고, 4개 트랙을
// 모듈 로드 시점에 한 번만 만들어서 재사용한다.
//
// 자동재생 복구는 'click' 이벤트 기준으로 한다 - 'pointerdown'은 브라우저가
// "진짜 사용자 동작 확정"으로 안 쳐주는 경우가 많아서(드래그/스크롤 시작일 수도
// 있으니) play()가 계속 막힘. 'click'과 'keydown'은 확실히 인정됨.
// 추가로 이미 클릭 시점마다 호출되는 playSfx() 안에서도 같이 재시도해서
// 이중으로 안전장치를 둔다.
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
const DEFAULT_VOLUME = 0.5;

let muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
let volume = (() => {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(VOLUME_KEY) : null;
  const n = raw !== null ? parseFloat(raw) : DEFAULT_VOLUME;
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_VOLUME;
})();

let currentBgmKey = null;

// 트랙별 Audio 엘리먼트를 미리 하나씩만 만들어서 재사용
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

// 현재 재생 중이어야 할 트랙이 멈춰있으면(자동재생 차단 등) 재시도.
// 반드시 "진짜 사용자 동작"으로 인정되는 이벤트 핸들러 안에서 호출돼야 효과 있음.
function resumeBgmIfStuck() {
  const active = bgmElements[currentBgmKey];
  if (active && active.paused && !muted) active.play().catch(() => {});
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', resumeBgmIfStuck);
  window.addEventListener('keydown', resumeBgmIfStuck);
}

export function playBgm(key) {
  if (key === currentBgmKey) return;
  const prevKey = currentBgmKey;
  currentBgmKey = key;

  const old = bgmElements[prevKey];
  if (old) fade(old, 0, FADE_MS, () => old.pause());

  const next = bgmElements[key];
  if (!next) return;
  next.play().catch(() => {}); // 막히더라도 다음 클릭에서 resumeBgmIfStuck가 재시도함
  fade(next, effectiveBgmVolume(), FADE_MS);
}

export function playSfx(key) {
  resumeBgmIfStuck(); // 효과음이 나는 시점 = 확실한 사용자 클릭이므로 여기서도 같이 복구 시도
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
  if (!muted) resumeBgmIfStuck();
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
  resumeBgmIfStuck();
}

export function getVolume() {
  return volume;
}
