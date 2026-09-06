import "./header-polish-v6.css";

const COIN_SRC = "/sprites/items/amulet-coin.png";

function syncDexHeaderMoney() {
  const screen = document.querySelector(".card-dex-screen");
  if (!screen) return;

  const header = screen.querySelector(".card-dex-header");
  const source = screen.querySelector(".dex-direct-shop-money");
  if (!header || !source) return;

  let display = header.querySelector(".dex-header-money");
  if (!display) {
    display = document.createElement("div");
    display.className = "money-display dex-header-money";

    const icon = document.createElement("img");
    icon.className = "res-icon";
    icon.src = COIN_SRC;
    icon.alt = "돈";
    icon.width = 20;
    icon.height = 20;
    icon.draggable = false;

    const value = document.createElement("span");
    value.className = "dex-header-money-value";

    display.append(icon, value);
    header.appendChild(display);
  }

  const match = source.textContent?.match(/[\d,]+/);
  const next = match?.[0] || "0";
  const value = display.querySelector(".dex-header-money-value");
  if (value && value.textContent !== next) value.textContent = next;
}

if (typeof document !== "undefined") {
  const observer = new MutationObserver(syncDexHeaderMoney);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  syncDexHeaderMoney();
}
