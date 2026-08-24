// ============================================================
// 서버 연동 (로그인 + 세이브 동기화 + 온라인 매칭)
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

let saveWriteQueue = Promise.resolve();
let saveRevision = 0;
let saveSyncEpoch = 0;

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
  return req('/matchmaking/leave', { method: 'POST', body: '{}' });
}
