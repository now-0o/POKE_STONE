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

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUsername() {
  return localStorage.getItem(USERNAME_KEY);
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
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
    throw err;
  }
  return body;
}

export async function register(username, password) {
  const data = await req('/register', { method: 'POST', body: JSON.stringify({ username, password }) });
  setAuth(data.token, data.username);
  return data;
}

export async function login(username, password) {
  const data = await req('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  setAuth(data.token, data.username);
  return data; // { token, username, save }
}

export async function fetchSave() {
  const data = await req('/save', { method: 'GET' });
  return data.save; // null이면 아직 서버에 저장된 게 없다는 뜻
}

export function pushSave(save) {
  // 호출 순간의 세이브와 계정을 함께 고정한다. 이후 같은 save 객체가 mutate되거나
  // 로그아웃/재로그인이 일어나도 이미 큐에 들어간 저장이 다른 계정으로 넘어가지 않는다.
  const body = JSON.stringify({ data: save });
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const write = saveWriteQueue
    .catch(() => undefined)
    .then(() => req('/save', { method: 'PUT', body, headers }));

  saveWriteQueue = write;
  return write;
}
