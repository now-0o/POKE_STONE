// ============================================================
// 서버 연동 (로그인 + 세이브 동기화)
// 로컬 개발 중엔 http://localhost:4000, 배포本엔 /api (Netlify 리다이렉트)
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

// 덱 편집처럼 짧은 시간에 여러 번 저장되는 경우 이전 PUT이 늦게 도착해
// 최신 세이브를 덮어쓰지 않도록 서버 저장 요청을 순서대로 처리한다.
let saveWriteQueue = Promise.resolve();

// 마지막으로 서버에서 확인한 세이브 revision.
// 같은 기기 안에서는 큐가 실행되는 시점의 최신 revision을 사용하고,
// 다른 기기와 충돌하면 epoch를 올려 이미 대기 중이던 오래된 요청을 폐기한다.
let saveRevision = 0;
let saveSyncEpoch = 0;

function setServerRevision(revision, invalidateQueuedWrites = false) {
  saveRevision = Number.isInteger(revision) && revision >= 0 ? revision : 0;
  if (invalidateQueuedWrites) saveSyncEpoch += 1;
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
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  setServerRevision(0, true);
}
function setAuth(token, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

async function req(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  // 큐에 들어간 저장 요청은 호출 당시 계정 토큰을 headers로 넘긴다.
  // 명시 토큰이 있을 때 현재 로그인 토큰으로 덮어쓰지 않는다.
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
  setAuth(data.token, data.username);
  setServerRevision(data.revision ?? 0, true);
  return data;
}

export async function login(username, password) {
  const data = await req('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  setAuth(data.token, data.username);
  setServerRevision(data.revision ?? 0, true);
  return data; // { token, username, save, revision }
}

export async function fetchSave() {
  const data = await req('/save', { method: 'GET' });
  setServerRevision(data.revision ?? 0, true);
  return data.save; // null이면 아직 서버에 저장된 게 없다는 뜻
}

export function pushSave(save) {
  // 호출 순간의 세이브와 계정을 함께 고정한다. 이후 같은 save 객체가 mutate되거나
  // 로그아웃/재로그인이 일어나도 이미 큐에 들어간 저장이 다른 계정으로 넘어가지 않는다.
  const dataSnapshot = JSON.stringify(save);
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const queuedEpoch = saveSyncEpoch;

  const write = saveWriteQueue
    .catch(() => undefined)
    .then(async () => {
      // 다른 기기와 충돌한 뒤에도 큐에 남아 있던 과거 로컬 세이브는 서버로 보내지 않는다.
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
