import { addReward, loadSave } from "../../state/save.js";
import { getToken, pushSave } from "../../state/api.js";

const MONEY_CODE = "givemoney";
const NOTICE_KEY = "pkm_stone_givemoney_notice";
let buffer = "";
let applying = false;

function showNotice() {
  const toast = document.createElement("div");
  toast.textContent = "재화 +1,000원";
  Object.assign(toast.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    zIndex: "2147483600",
    padding: "9px 14px",
    border: "1px solid #56c987",
    borderRadius: "8px",
    background: "#10271c",
    color: "#d9ffe8",
    fontSize: "13px",
    boxShadow: "0 4px 14px rgba(0,0,0,.5)",
    pointerEvents: "none",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

async function grantMoney() {
  if (applying) return;
  applying = true;

  const save = loadSave();
  addReward(save, 1000);

  try {
    if (getToken()) await pushSave(save);
    sessionStorage.setItem(NOTICE_KEY, "1");
  } catch (error) {
    console.warn("[givemoney] 세이브 동기화 실패:", error?.message || error);
  } finally {
    // App이 보유한 save 객체도 새 값으로 다시 로드되도록 한 번 새로고침한다.
    window.location.reload();
  }
}

function onKeyDown(event) {
  if (event.target && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
  if (event.key.length !== 1) return;

  buffer = (buffer + event.key.toLowerCase()).slice(-MONEY_CODE.length);
  if (!buffer.endsWith(MONEY_CODE)) return;

  buffer = "";
  void grantMoney();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("keydown", onKeyDown);

  if (sessionStorage.getItem(NOTICE_KEY) === "1") {
    sessionStorage.removeItem(NOTICE_KEY);
    requestAnimationFrame(showNotice);
  }
}
