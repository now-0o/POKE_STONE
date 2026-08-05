import React, { useState } from 'react';
import { login, register } from '../state/api.js';
import { playSfx } from '../audio.js';

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    playSfx('click');
    setBusy(true);
    setError('');
    try {
      const data = mode === 'login' ? await login(username, password) : await register(username, password);
      onAuthed(data.save ?? null);
    } catch (err) {
      setError(err.message || '문제가 생겼어요. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="main-menu">
      <div className="title-block">
        <h1 className="game-title">POKE STONE</h1>
        <p className="game-subtitle">FAN-MADE CARD BATTLE</p>
      </div>

      <form onSubmit={submit} style={{ maxWidth: 320, margin: '32px auto 0', display: 'grid', gap: 12 }}>
        <div className="editor-topbar" style={{ position: 'static', margin: 0, padding: 6, borderRadius: 10, display: 'flex' }}>
          <button
            type="button"
            className={`filter-btn ${mode === 'login' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => { playSfx('click'); setMode('login'); setError(''); }}
          >
            로그인
          </button>
          <button
            type="button"
            className={`filter-btn ${mode === 'register' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => { playSfx('click'); setMode('register'); setError(''); }}
          >
            회원가입
          </button>
        </div>

        <input
          className="input-plain"
          placeholder="아이디 (영문/숫자/밑줄 3~20자)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className="input-plain"
          placeholder="비밀번호 (4자 이상)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && <p style={{ color: '#ff8a8a', fontSize: 13, margin: 0 }}>{error}</p>}

        <button className="btn-primary" type="submit" disabled={busy || !username || !password}>
          {busy ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입하고 시작'}
        </button>
      </form>
    </div>
  );
}
