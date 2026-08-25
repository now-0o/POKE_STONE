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

function deckPayload(source, extra = {}) {
  return JSON.stringify({
    ...extra,
    deck: source?.deck || [],
    deckShiny: source?.deckShiny || {},
    deckName: source?.name || extra.deckName || "선택 덱",
  });
}

export function fetchFriendlyRooms() {
  return friendlyReq("/friendly/rooms", { method: "GET" });
}

export function createFriendlyRoom(source, settings = {}) {
  return friendlyReq("/friendly/create", {
    method: "POST",
    body: deckPayload(source, {
      name: settings.name || "",
      isPrivate: !!settings.isPrivate,
      password: settings.password || "",
    }),
  });
}

export function joinFriendlyRoom(roomId, source, password = "") {
  return friendlyReq("/friendly/join", {
    method: "POST",
    body: deckPayload(source, { roomId, password }),
  });
}

export function fetchFriendlyRoom() {
  return friendlyReq("/friendly/room", { method: "GET" });
}

export function updateFriendlyDeck(source) {
  return friendlyReq("/friendly/deck", {
    method: "POST",
    body: deckPayload(source),
  });
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

export function returnFriendlyToRoom(matchId) {
  return friendlyReq("/friendly/return", {
    method: "POST",
    body: JSON.stringify({ matchId }),
  });
}

export function leaveFriendlyRoom() {
  return friendlyReq("/friendly/leave", {
    method: "POST",
    body: "{}",
  });
}

export function leaveFriendlyRoomKeepalive() {
  if (typeof window === "undefined") return;
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    void fetch(`${API_BASE}/friendly/leave`, {
      method: "POST",
      headers,
      body: "{}",
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // 페이지 종료 중 전송 실패는 서버의 stale room 정리로 보완한다.
  }
}
