import "./weather-turn.css";

const WEATHER_VIEW = {
  rain: {
    icon: "🌧️",
    title: "비가 계속 내린다",
    particle: "│",
  },
  sun: {
    icon: "☀️",
    title: "강한 햇살이 비춘다",
    particle: "✦",
  },
  sand: {
    icon: "🏜️",
    title: "모래바람이 휘몰아친다",
    particle: "·",
  },
  hail: {
    icon: "🌨️",
    title: "싸라기눈이 쏟아진다",
    particle: "◆",
  },
};

let activeOverlay = null;
let removeTimer = null;

function getBattleGame() {
  return window.__pokeBattleGame || window.__pokeNState?.game || null;
}

function removeWeatherFx() {
  if (removeTimer !== null) {
    window.clearTimeout(removeTimer);
    removeTimer = null;
  }
  activeOverlay?.remove();
  activeOverlay = null;
}

function makeParticle(view, index) {
  const particle = document.createElement("span");
  particle.className = "weather-turn-particle";
  particle.textContent = view.particle;
  particle.style.setProperty("--weather-x", `${(index * 37 + 11) % 100}%`);
  particle.style.setProperty("--weather-delay", `${(index % 7) * 55}ms`);
  particle.style.setProperty("--weather-drift", `${((index % 5) - 2) * 22}px`);
  particle.style.setProperty("--weather-scale", `${0.72 + (index % 4) * 0.16}`);
  return particle;
}

function showWeatherFx(detail) {
  const weather = detail?.weather;
  const view = WEATHER_VIEW[weather];
  if (!view) return;

  removeWeatherFx();

  const overlay = document.createElement("div");
  overlay.className = `weather-turn-fx weather-turn-${weather}`;
  overlay.setAttribute("aria-hidden", "true");

  const atmosphere = document.createElement("div");
  atmosphere.className = "weather-turn-atmosphere";
  for (let i = 0; i < 24; i += 1) {
    atmosphere.appendChild(makeParticle(view, i));
  }
  overlay.appendChild(atmosphere);

  const banner = document.createElement("div");
  banner.className = "weather-turn-banner";

  const icon = document.createElement("span");
  icon.className = "weather-turn-icon";
  icon.textContent = view.icon;
  banner.appendChild(icon);

  const copy = document.createElement("div");
  copy.className = "weather-turn-copy";

  const title = document.createElement("strong");
  title.textContent = view.title;
  copy.appendChild(title);

  const remaining = document.createElement("span");
  remaining.textContent = `남은 날씨 ${Math.max(0, Number(detail.remaining) || 0)}턴`;
  copy.appendChild(remaining);

  banner.appendChild(copy);
  overlay.appendChild(banner);
  document.body.appendChild(overlay);
  activeOverlay = overlay;

  removeTimer = window.setTimeout(removeWeatherFx, 1450);
}

export function syncWeatherIndicator() {
  const board = document.querySelector(".battle.battle-board");
  const indicator = board?.querySelector(".weather-indicator");
  if (!indicator) return;

  indicator.querySelector(":scope > .weather-turn-count")?.remove();

  const game = getBattleGame();
  const remaining = Number(game?._weatherTurnsRemaining) || 0;
  if (!game?.weather || remaining <= 0) return;

  const badge = document.createElement("span");
  badge.className = "weather-turn-count";
  badge.textContent = `${remaining}턴`;
  badge.setAttribute("aria-label", `날씨 ${remaining}턴 남음`);
  indicator.appendChild(badge);
}

window.addEventListener("poke-weather-turn-start", (event) => {
  showWeatherFx(event.detail || {});
  window.requestAnimationFrame(syncWeatherIndicator);
});
