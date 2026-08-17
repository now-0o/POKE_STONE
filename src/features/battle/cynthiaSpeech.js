import { CARD_MAP } from "../../data/cards.js";

const RECALL_MESSAGE_MS = 620;
const SEND_MESSAGE_MS = 1150;

let pendingRecall = null;
let sendTimer = null;
let clearTimer = null;

function pokemonName(cardId) {
  const name = CARD_MAP[cardId]?.name || "포켓몬";
  return name.replace(/^난천의\s*/, "");
}

function speechHost() {
  return document.querySelector(
    '.battle.battle-board[data-trainer="sinnoh_cynthia"] .enemy-hero-cluster',
  );
}

function ensureBubble() {
  const host = speechHost();
  if (!host) return null;

  let bubble = host.querySelector(":scope > .cynthia-switch-speech");
  if (bubble) return bubble;

  bubble = document.createElement("div");
  bubble.className = "cynthia-switch-speech";
  bubble.setAttribute("role", "status");
  bubble.setAttribute("aria-live", "polite");
  host.appendChild(bubble);
  return bubble;
}

function showSpeech(text, phase) {
  const bubble = ensureBubble();
  if (!bubble) return;

  bubble.textContent = text;
  bubble.dataset.phase = phase;
  bubble.classList.remove("is-visible");
  void bubble.offsetWidth;
  bubble.classList.add("is-visible");
}

function clearSpeech() {
  if (sendTimer) {
    window.clearTimeout(sendTimer);
    sendTimer = null;
  }

  if (clearTimer) {
    window.clearTimeout(clearTimer);
    clearTimer = null;
  }

  const bubble = speechHost()?.querySelector(
    ":scope > .cynthia-switch-speech",
  );

  if (bubble) {
    bubble.classList.remove("is-visible");
    bubble.removeAttribute("data-phase");
  }
}

function resetRecall() {
  pendingRecall = null;
  clearSpeech();
}

function onRecallStart(event) {
  resetRecall();

  const outgoingCardId = event.detail?.outgoingCardId || null;
  if (!outgoingCardId) return;

  pendingRecall = {
    outgoingCardId,
    incomingCardId: null,
  };

  showSpeech(`돌아와! ${pokemonName(outgoingCardId)}`, "recall");
}

function onPartyChange(event) {
  if (!pendingRecall || !event.detail) return;

  const incomingCardId = event.detail.activeCardId || null;
  if (
    !incomingCardId ||
    incomingCardId === pendingRecall.outgoingCardId ||
    incomingCardId === pendingRecall.incomingCardId
  ) {
    return;
  }

  pendingRecall.incomingCardId = incomingCardId;

  if (sendTimer) window.clearTimeout(sendTimer);
  sendTimer = window.setTimeout(() => {
    sendTimer = null;

    if (!pendingRecall?.incomingCardId) return;

    showSpeech(
      `가라! ${pokemonName(pendingRecall.incomingCardId)}`,
      "send",
    );

    if (clearTimer) window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      clearTimer = null;
      pendingRecall = null;

      const bubble = speechHost()?.querySelector(
        ":scope > .cynthia-switch-speech",
      );
      bubble?.classList.remove("is-visible");
    }, SEND_MESSAGE_MS);
  }, RECALL_MESSAGE_MS);
}

function onRecallCancel() {
  resetRecall();
}

if (typeof window !== "undefined") {
  window.addEventListener("cynthia-recall-start", onRecallStart);
  window.addEventListener("cynthia-party-change", onPartyChange);
  window.addEventListener("cynthia-recall-cancel", onRecallCancel);
}
