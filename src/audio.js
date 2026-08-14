// ============================================================
// 오디오 매니저: BGM(화면별 전환+루프+크로스페이드) + 효과음(중첩 재생 가능)
//
// 설계 메모: BGM은 화면 전환마다 새 Audio 객체를 만들지 않고, 트랙을
// 모듈 로드 시점에 한 번만 만들어서 재사용한다.
//
// 자동재생 복구는 'click' 이벤트 기준으로 한다 - 'pointerdown'은 브라우저가
// "진짜 사용자 동작 확정"으로 안 쳐주는 경우가 많아서(드래그/스크롤 시작일 수도
// 있으니) play()가 계속 막힘. 'click'과 'keydown'은 확실히 인정됨.
// 추가로 이미 클릭 시점마다 호출되는 playSfx() 안에서도 같이 재시도해서
// 이중으로 안전장치를 둔다.
// ============================================================

const BGM_FILES = {
  login: "/audio/bgm/login.mp3",
  main: "/audio/bgm/main.mp3",
  shop: "/audio/bgm/shop.mp3",

  // 배틀 BGM
  youngster: "/audio/bgm/youngster.mp3",
  kanto: "/audio/bgm/kanto.mp3",
  johto: "/audio/bgm/johto.mp3",
  hoenn: "/audio/bgm/hoenn.mp3",
  sinnoh: "/audio/bgm/sinnoh.mp3",
  red_lance: "/audio/bgm/red_lance.mp3",
  steven: "/audio/bgm/steven.mp3",

  // 신오 챔피언 난천 전용. 난천 트레이너 구현 전에는 선택되지 않는다.
  cynthia: "/audio/bgm/cynthia.mp3",
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
  if (raw === null) return true; // 첫 방문: 어차피 자동재생 안 될 걸 아니까 처음부터 음소거로 시작 (UI가 실제 상태와 안 어긋나게)
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

// 트랙별 Audio 엘리먼트를 미리 하나씩만 만들어서 재사용
const bgmElements =
  typeof Audio !== "undefined"
    ? Object.fromEntries(
        Object.entries(BGM_FILES).map(([key, src]) => {
          const a = new Audio(src);
          a.loop = true;
          a.volume = 0;
          return [key, a];
        }),
      )
    : {};

function effectiveBgmVolume() {
  return muted ? 0 : BGM_BASE * volume;
}

// requestAnimationFrame 기반 부드러운 볼륨 램프.
// 안전장치 포함: rAF 루프가 무슨 이유로든 끝까지 못 돌더라도(탭이 백그라운드로
// 가거나 스로틀링되는 등) duration 이후엔 setTimeout이 목표 볼륨을 무조건
// 강제로 맞춰버림 - "페이드 도중 0에 멈춰서 안 들리는" 상황 자체를 봉쇄.
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
  setTimeout(finish, duration + 150); // 안전망: rAF가 안 돌아도 결국엔 맞는 값으로 고정됨
}

// 현재 재생 중이어야 할 트랙이 멈춰있거나(자동재생 차단), 재생 중인데도
// 볼륨이 잘못된 값(0 근처)에 고정돼 있으면(페이드 애니메이션 실패 등) 바로잡음.
// 반드시 "진짜 사용자 동작"으로 인정되는 이벤트 핸들러 안에서 호출돼야 효과 있음.
function resumeBgmIfStuck() {
  const active = bgmElements[currentBgmKey];
  if (!active) return;
  if (active.paused && !muted) {
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
  if (key === currentBgmKey) return;
  const prevKey = currentBgmKey;
  currentBgmKey = key;

  const old = bgmElements[prevKey];
  if (old)
    fade(old, 0, FADE_MS, () => {
      old.pause();
      old.currentTime = 0; // 다음에 이 화면으로 돌아오면 처음부터 다시 시작하도록
    });

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
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
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
    localStorage.setItem(MUTE_KEY, "0");
  }
  const active = bgmElements[currentBgmKey];
  if (active) active.volume = effectiveBgmVolume();
  resumeBgmIfStuck();
}

export function getVolume() {
  return volume;
}
