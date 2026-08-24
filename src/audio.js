// ============================================================
// 오디오 매니저: BGM(화면별 전환+루프+크로스페이드) + 효과음(중첩 재생 가능)
//
// BGM은 실제로 소리가 필요한 순간에만 Audio 객체를 만든다.
// 첫 방문 기본 음소거 상태에서는 음원 파일을 요청하지 않고,
// 음소거 해제 후 해당 화면의 BGM만 lazy-load해서 Netlify 트래픽을 줄인다.
// ============================================================

const BGM_FILES = {
  login: "/audio/bgm/login.mp3",
  main: "/audio/bgm/main.mp3",
  shop: "/audio/bgm/shop.mp3",
  battle: "/audio/bgm/battle.mp3",
};

const SFX_FILES = {
  buy: "/audio/sfx/buy.ogg",
  buzzer: "/audio/sfx/buzzer.ogg",
  click: "/audio/sfx/click.ogg",
  cursor: "/audio/sfx/cursor.ogg",
  pc: "/audio/sfx/pc.ogg",
  slide: "/audio/sfx/slide.ogg",
  pickup: "/audio/sfx/pickup.ogg",
  putdown: "/audio/sfx/putdown.ogg",
};

const MUTE_KEY = "pkm_stone_muted";
const VOLUME_KEY = "pkm_stone_volume";
const BGM_BASE = 0.38; // 볼륨 1.0(=100%)일 때 기준 음량
const SFX_BASE = 0.55;
const FADE_MS = 650;
const DEFAULT_VOLUME = 0.5;

let muted = (() => {
  if (typeof localStorage === "undefined") return true;
  const raw = localStorage.getItem(MUTE_KEY);
  if (raw === null) return true; // 첫 방문: 처음부터 음소거로 시작
  return raw === "1";
})();
let volume = (() => {
  const raw =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(VOLUME_KEY)
      : null;
  const n = raw !== null ? parseFloat(raw) : DEFAULT_VOLUME;
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_VOLUME;
})();

let currentBgmKey = null;

// 사용된 BGM만 여기에 생긴다. 모듈 로드 시점에는 Audio 객체가 0개다.
const bgmElements = {};

function getBgmElement(key) {
  if (typeof Audio === "undefined") return null;
  const src = BGM_FILES[key];
  if (!src) return null;

  if (!bgmElements[key]) {
    const a = new Audio();
    a.preload = "none";
    a.loop = true;
    a.volume = 0;
    a.src = src;
    bgmElements[key] = a;
  }

  return bgmElements[key];
}

function effectiveBgmVolume() {
  return muted ? 0 : BGM_BASE * volume;
}

// requestAnimationFrame 기반 부드러운 볼륨 램프.
// 탭이 백그라운드로 가는 등 rAF가 멈춰도 timeout으로 목표 볼륨을 맞춘다.
function fade(audio, toVolume, duration, onDone) {
  const fromVolume = audio.volume;
  const start = performance.now();
  let done = false;

  function finish() {
    if (done) return;
    done = true;
    audio.volume = toVolume;
    onDone && onDone();
  }

  function step(now) {
    if (done) return;
    const t = Math.min(1, (now - start) / duration);
    audio.volume = fromVolume + (toVolume - fromVolume) * t;
    if (t < 1) requestAnimationFrame(step);
    else finish();
  }

  requestAnimationFrame(step);
  setTimeout(finish, duration + 150);
}

// 사용자 동작 시 자동재생 차단/페이드 실패를 복구한다.
// muted 상태에서는 getBgmElement()조차 호출하지 않아 음원을 요청하지 않는다.
function resumeBgmIfStuck() {
  if (muted || !currentBgmKey) return;

  const active = getBgmElement(currentBgmKey);
  if (!active) return;

  if (active.paused) {
    active.play().catch(() => {});
  }

  const target = effectiveBgmVolume();
  if (!active.paused && Math.abs(active.volume - target) > 0.02) {
    active.volume = target;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("click", resumeBgmIfStuck);
  window.addEventListener("keydown", resumeBgmIfStuck);
}

// ============================================================
// 울음소리
// 레전드 + 트레이너 시그니처 포켓몬
// ============================================================

// 레전드 포켓몬
// isLegend() 판정에도 이 목록만 사용한다.
const LEGEND_CRY_IDS = new Set([
  "articuno",
  "celebi",
  "entei",
  "groudon",
  "hooh",
  "kyogre",
  "latias",
  "lugia",
  "mew",
  "mewtwo",
  "moltres",
  "raikou",
  "rayquaza",
  "regice",
  "regirock",
  "registeel",
  "suicune",
  "zapdos",

  // 5세대 / 하나지방
  "victini",
  "cobalion",
  "terrakion",
  "virizion",
  "tornadus",
  "thundurus",
  "landorus",
  "reshiram",
  "zekrom",
  "kyurem",
]);

// 트레이너 전용 시그니처 카드 ID -> 실제 포켓몬 울음소리 파일명
const SIGNATURE_CRY_FILE = {
  // =========================
  // 관동
  // =========================
  surge_raichu: "raichu",
  sabrina_gallade: "gallade",
  erika_bellossom: "bellossom",
  janine_venomoth: "venomoth",
  misty_starmie: "starmie",
  brock_onix: "onix",
  blaine_camerupt: "camerupt",
  blue_pidgeot: "pidgeot",
  red_pikachu: "pikachu",

  // =========================
  // 성도
  // =========================
  johto_falkner_pidgeotto: "pidgeotto",
  johto_bugsy_scyther: "scyther",
  johto_whitney_miltank: "miltank",
  johto_morty_gengar: "gengar",
  johto_chuck_poliwrath: "poliwrath",
  johto_jasmine_steelix: "steelix",
  johto_pryce_mamoswine: "mamoswine",
  johto_clair_kingdra: "kingdra",

  // 목호 - 세 카드 모두 같은 망나뇽 울음소리
  johto_lance_dragonite_thunder: "dragonite",
  johto_lance_dragonite_extremespeed: "dragonite",
  johto_lance_dragonite_outrage: "dragonite",
};

// 파일명이 카드 ID와 다른 경우만 매핑
const CRY_FILE = {
  hooh: "hooh",
  ...SIGNATURE_CRY_FILE,
};

export function playCry(pokemonId) {
  if (muted || typeof Audio === "undefined") return;

  const isLegendCry = LEGEND_CRY_IDS.has(pokemonId);
  const isSignatureCry = !!SIGNATURE_CRY_FILE[pokemonId];

  // 레전드도 시그니처도 아니면 울음소리 재생 안 함
  if (!isLegendCry && !isSignatureCry) return;

  const file = CRY_FILE[pokemonId] || pokemonId;
  const a = new Audio(`/audio/cry/${file}.ogg`);
  a.volume = 0.85 * getVolume();
  a.play().catch(() => {});
}

// 중요:
// 시그니처 포켓몬은 L 등급처럼 만들어놨어도
// "레전드 소환 연출" 대상으로 판정하면 안 됨.
export function isLegend(pokemonId) {
  return LEGEND_CRY_IDS.has(pokemonId);
}

export function playBgm(key) {
  if (key === currentBgmKey) {
    if (!muted) resumeBgmIfStuck();
    return;
  }

  const prevKey = currentBgmKey;
  currentBgmKey = key;

  const old = bgmElements[prevKey];

  // 음소거 중에는 이전 트랙도 멈추고 새 음원은 생성조차 하지 않는다.
  if (muted) {
    if (old) {
      old.pause();
      old.currentTime = 0;
      old.volume = 0;
    }
    return;
  }

  if (old) {
    fade(old, 0, FADE_MS, () => {
      old.pause();
      old.currentTime = 0;
    });
  }

  const next = getBgmElement(key);
  if (!next) return;
  next.play().catch(() => {});
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
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");

  const active = bgmElements[currentBgmKey];
  if (muted) {
    // 음소거 시 다운로드/재생을 가능한 한 빨리 멈춘다.
    if (active) {
      active.pause();
      active.currentTime = 0;
      active.volume = 0;
    }
  } else {
    resumeBgmIfStuck();
  }

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
    localStorage.setItem(MUTE_KEY, "0");
  }

  const active = bgmElements[currentBgmKey];
  if (active) active.volume = effectiveBgmVolume();
  resumeBgmIfStuck();
}

export function getVolume() {
  return volume;
}
