import { getToken } from "./api.js";

const API_BASE = (() => {
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return "http://localhost:4000/api";
    }
  }
  return "/api";
})();

async function friendlyReq(path, opts = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // 응답 본문 없음
  }

  if (!res.ok) {
    const err = new Error(
      body?.message || body?.error || `요청 실패 (${res.status})`,
    );
    err.status = res.status;
    err.code = body?.error;
    err.body = body;
    throw err;
  }

  return body;
}

function deckBody(save, extra = {}) {
  return JSON.stringify({
    ...extra,
    deck: save?.deck || [],
    deckShiny: save?.deckShiny || {},
  });
}

export function createFriendlyRoom(save) {
  return friendlyReq("/friendly/create", {
    method: "POST",
    body: deckBody(save),
  });
}

export function joinFriendlyRoom(code, save) {
  return friendlyReq("/friendly/join", {
    method: "POST",
    body: deckBody(save, { code }),
  });
}

export function fetchFriendlyRoom() {
  return friendlyReq("/friendly/room", { method: "GET" });
}

export function setFriendlyReady(ready) {
  return friendlyReq("/friendly/ready", {
    method: "POST",
    body: JSON.stringify({ ready: !!ready }),
  });
}

export function startFriendlyMatch() {
  return friendlyReq("/friendly/start", {
    method: "POST",
    body: "{}",
  });
}

export function leaveFriendlyRoom() {
  return friendlyReq("/friendly/leave", {
    method: "POST",
    body: "{}",
  });
}
