// ============================================================
// 서버 연동 (로그인 + 세이브 동기화 + 온라인 매칭/배틀)
// 로컬 개발 중엔 http://localhost:4000, 배포본엔 /api (Netlify 리다이렉트)
// ============================================================

const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:4000/api';
  }
  return '/api';
})();

const TOKEN_KEY = 'pkm_stone_token';
const USERNAME_KEY = 'pkm_stone_username';
const ADMIN_KEY = 'pkm_stone_server_admin';
const ONLINE_IDLE_NETWORK_MS = 85;
const ONLINE_HIDDEN_NETWORK_MS = 450;
const ONLINE_FAST_NETWORK_MS = 30;
const ONLINE_FAST_WINDOW_MS = 700;

let saveWriteQueue = Promise.resolve();
let saveRevision = 0;
let saveSyncEpoch = 0;
const onlineStateCache = new Map();
const onlineRequestInFlight = new Map();
const onlineFastUntil = new Map();

function setServerRevision(revision, invalidateQueuedWrites = false) {
  saveRevision = Number.isInteger(revision) && revision >= 0 ? revision : 0;
  if (invalidateQueuedWrites) saveSyncEpoch += 1;
}

function setStoredAdmin(isAdmin) {
  localStorage.setItem(ADMIN_KEY, isAdmin ? '1' : '0');
}

function supersededSaveError() {
  const err = new Error('더 최신 서버 세이브가 적용되어 이전 저장 요청을 취소했습니다.');
  err.code = 'save_superseded';
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onlineStateSignature(data, host) {
  return [
    Number.isInteger(data?.revision) ? data.revision : -1,
    data?.phase || '',
    data?.lastCommand?.id ?? '',
    host ? (data?.pendingCommand?.id ?? '') : '',
    data?.mulligan?.me ? 1 : 0,
    data?.mulligan?.opponent ? 1 : 0,
  ].join(':');
}

function clearOnlineRuntimeCache() {
  onlineStateCache.clear();
  onlineRequestInFlight.clear();
  onlineFastUntil.clear();
}

function markOnlineFast(matchId, durationMs = ONLINE_FAST_WINDOW_MS) {
  if (!matchId) return;
  onlineFastUntil.set(matchId, Date.now() + durationMs);
}

function onlineNetworkInterval(matchId) {
  if (typeof document !== 'undefined' && document.hidden) {
    return ONLINE_HIDDEN_NETWORK_MS;
  }
  if ((onlineFastUntil.get(matchId) || 0) > Date.now()) {
    return ONLINE_FAST_NETWORK_MS;
  }
  return ONLINE_IDLE_NETWORK_MS;
}

async function fetchOnlineSnapshot(matchId, host = false) {
  const encodedId = encodeURIComponent(matchId);
  const cacheKey = `${host ? 'host' : 'client'}:${matchId}`;
  const previous = onlineStateCache.get(cacheKey) || null;
  const inFlight = onlineRequestInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const now = Date.now();
  if (
    previous?.data &&
    now - (previous.lastRequestAt || 0) < onlineNetworkInterval(matchId)
  ) {
    return previous.data;
  }

  const request = (async () => {
    const basePath = host
      ? `/online/match/${encodedId}/host`
      : `/online/match/${encodedId}/state`;
    const params = new URLSearchParams();

    if (Number.isInteger(previous?.data?.revision)) {
      params.set('revision', String(previous.data.revision));
      if (host) {
        params.set(
          'pending',
          previous.data.pendingCommand?.id == null
            ? ''
            : String(previous.data.pendingCommand.id),
        );
      }
    }

    const path = params.size ? `${basePath}?${params.toString()}` : basePath;
    const data = await req(path, { method: 'GET' });
    const receivedAt = Date.now();

    // 새 백엔드는 revision이 그대로면 전체 game JSON 대신 수십 바이트짜리
    // unchanged/delta 응답만 보낸다. 구형 백엔드의 전체 snapshot도 그대로 호환한다.
    if (data?.unchanged && previous?.data) {
      onlineStateCache.set(cacheKey, {
        ...previous,
        lastRequestAt: receivedAt,
      });
      return previous.data;
    }

    if (data?.delta && previous?.data) {
      const merged = {
        ...previous.data,
        revision: Number.isInteger(data.revision)
          ? data.revision
          : previous.data.revision,
        ...(host ? { pendingCommand: data.pendingCommand || null } : {}),
      };
      const signature = onlineStateSignature(merged, host);
      onlineStateCache.set(cacheKey, {
        signature,
        data: merged,
        lastRequestAt: receivedAt,
      });
      markOnlineFast(matchId, 350);
      return merged;
    }

    const signature = onlineStateSignature(data, host);
    if (previous?.data && signature === previous.signature) {
      onlineStateCache.set(cacheKey, {
        ...previous,
        lastRequestAt: receivedAt,
      });
      return previous.data;
    }

    onlineStateCache.set(cacheKey, {
      signature,
      data,
      lastRequestAt: receivedAt,
    });
    if (previous?.data) markOnlineFast(matchId, 350);
    return data;
  })();

  onlineRequestInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (onlineRequestInFlight.get(cacheKey) === request) {
      onlineRequestInFlight.delete(cacheKey);
    }
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

export function getStoredAdmin() {
  return localStorage.getItem(ADMIN_KEY) === '1';
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ADMIN_KEY);
  clearOnlineRuntimeCache();
  setServerRevision(0, true);
}

function setAuth(token, username, isAdmin = false) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  setStoredAdmin(!!isAdmin);
}

async function req(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  let body = null;
  try { body = await res.json(); } catch { /* 응답 본문 없음 */ }
  if (!res.ok) {
    const err = new Error(body?.message || body?.error || `요청 실패 (${res.status})`);
    err.status = res.status;
    err.code = body?.error;
    err.body = body;
    throw err;
  }
  return body;
}

export async function register(username, password) {
  const data = await req('/register', { method: 'POST', body: JSON.stringify({ username, password }) });
  setAuth(data.token, data.username, data.isAdmin);
  setServerRevision(data.revision ?? 0, true);
  return data;
}

export async function login(username, password) {
  const data = await req('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  setAuth(data.token, data.username, data.isAdmin);
  setServerRevision(data.revision ?? 0, true);
  return data;
}

export async function fetchSave() {
  const data = await req('/save', { method: 'GET' });
  setServerRevision(data.revision ?? 0, true);
  setStoredAdmin(!!data.isAdmin);
  return data.save;
}

export function pushSave(save) {
  const dataSnapshot = JSON.stringify(save);
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const queuedEpoch = saveSyncEpoch;

  const write = saveWriteQueue
    .catch(() => undefined)
    .then(async () => {
      if (queuedEpoch !== saveSyncEpoch) throw supersededSaveError();

      const body = `{"data":${dataSnapshot},"revision":${saveRevision}}`;

      try {
        const result = await req('/save', { method: 'PUT', body, headers });
        if (Number.isInteger(result?.revision)) {
          setServerRevision(result.revision);
        }
        return result;
      } catch (err) {
        if (err?.code === 'save_conflict') {
          const serverRevision = err.body?.revision;
          if (Number.isInteger(serverRevision)) {
            setServerRevision(serverRevision, true);
          } else {
            saveSyncEpoch += 1;
          }
          err.serverSave = err.body?.save ?? null;
          err.serverRevision = serverRevision;
        }
        throw err;
      }
    });

  saveWriteQueue = write;
  return write;
}

export async function unlockAdmin(code) {
  const data = await req('/admin/unlock', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  setStoredAdmin(!!data.isAdmin);
  return data;
}

export async function joinMatchmaking(save) {
  return req('/matchmaking/join', {
    method: 'POST',
    body: JSON.stringify({
      deck: save?.deck || [],
      deckShiny: save?.deckShiny || {},
    }),
  });
}

export async function fetchMatchmakingStatus() {
  return req('/matchmaking/status', { method: 'GET' });
}

export async function leaveMatchmaking() {
  clearOnlineRuntimeCache();
  return req('/matchmaking/leave', { method: 'POST', body: '{}' });
}

// 탭/브라우저 종료 시 async 흐름을 기다릴 수 없으므로 keepalive fetch로
// 현재 큐/매치를 즉시 정리한다. 기존 인증 헤더를 그대로 보내 서버의 leave를 사용한다.
export function leaveMatchmakingKeepalive() {
  clearOnlineRuntimeCache();
  if (typeof window === 'undefined') return;

  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    void fetch(`${API_BASE}/matchmaking/leave`, {
      method: 'POST',
      headers,
      body: '{}',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // 페이지 종료 중 전송 실패는 다음 접속의 stale-match 정리로 보완한다.
  }
}

export async function fetchOnlineBootstrap(matchId) {
  const data = await req(`/online/match/${encodeURIComponent(matchId)}/bootstrap`, { method: 'GET' });

  // 비호스트에게는 상대 덱 정보가 내려오지 않는 것이 정상이다.
  // 공용 Battle은 실제 온라인 상태를 bridge에서 받으므로 빈 덱 스냅샷만 보강해
  // bootstrap.playerDeck 접근 때문에 화면 전체가 죽지 않도록 한다.
  return {
    ...data,
    playerDeck: data.playerDeck || {
      username: data.me?.username || '',
      deck: [],
      deckShiny: {},
    },
    enemyDeck: data.enemyDeck || {
      username: data.opponent?.username || '상대',
      deck: [],
      deckShiny: {},
    },
  };
}

export async function initializeOnlineMatch(matchId, game) {
  const data = await req(`/online/match/${encodeURIComponent(matchId)}/initialize`, {
    method: 'POST',
    body: JSON.stringify({ game }),
  });
  clearOnlineRuntimeCache();
  return data;
}

export async function fetchOnlineState(matchId) {
  return fetchOnlineSnapshot(matchId, false);
}

export async function fetchOnlineHostState(matchId) {
  return fetchOnlineSnapshot(matchId, true);
}

export async function sendOnlineCommand(matchId, command) {
  markOnlineFast(matchId);
  const maxAttempts = command?.type === 'mulligan' ? 8 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await req(`/online/match/${encodeURIComponent(matchId)}/command`, {
        method: 'POST',
        body: JSON.stringify(command),
      });
    } catch (err) {
      const retryMulligan =
        command?.type === 'mulligan' &&
        err?.code === 'command_busy' &&
        attempt < maxAttempts - 1;

      if (!retryMulligan) throw err;

      // 양쪽이 멀리건 확정을 동시에 눌러도 단일 host command 슬롯 때문에
      // 사용자가 두 번 누르지 않도록 첫 요청을 자동 재시도한다.
      await sleep(60);
    }
  }

  throw new Error('온라인 행동 전송에 실패했습니다.');
}

export async function commitOnlineHostState(matchId, payload) {
  return req(`/online/match/${encodeURIComponent(matchId)}/host/commit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}