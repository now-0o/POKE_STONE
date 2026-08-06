import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CARD_MAP, UI_SPRITES } from '../data/cards.js';
import {
  createGame, playCard, attack, endTurn, canPlayCard, canAttack,
  validAttackTargets, spellNeedsTarget, WEATHER_NAME,
  resolveMoldbreaker, discardToDraw,
} from '../engine/engine.js';
import { aiStep } from '../engine/ai.js';
import { HandCard, FieldUnit, TrainerSprite } from './Card.jsx';
import { playSfx, playCry, isLegend } from '../audio.js';

const AI_DELAY = 1100;
const DRAG_THRESHOLD = 8;
const INSPECT_DELAY = 200;
const PLAYER_SPRITE = 'ethan'; // HGSS 주인공 (성도!)

export default function Battle({ trainer, deck, onFinish }) {
  const gameRef = useRef(null);
  const [, forceRender] = useState(0);
  const [selectedHand, setSelectedHand] = useState(null); // 탭 방식 기술 타겟팅 (폴백)
  const [dragIdx, setDragIdx] = useState(null); // 드래그 중인 손패 인덱스
  const [aimUid, setAimUid] = useState(null); // 조준 중인 공격자 uid
  const [enemyReveal, setEnemyReveal] = useState(null); // 상대 카드 공개 연출
  const [inspect, setInspect] = useState(null); // 꾹 눌러 카드 크게 보기
  const [unitFx, setUnitFx] = useState(null); // 진화/메가 이펙트
  const [legendFx, setLegendFx] = useState(null); // 레전드 소환 전용 이펙트
  const [atkFx, setAtkFx] = useState(null); // 공격 돌진/피격 연출
  const [intro, setIntro] = useState('vs'); // 'vs' -> 'coin' -> false
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const aiTimer = useRef(null);
  const logRef = useRef(null);
  const myFieldRef = useRef(null);
  const ghostRef = useRef(null);
  const markerRef = useRef(null);
  const aimLineRef = useRef(null);
  const aimStart = useRef(null);
  const dragInfo = useRef(null);
  const lastSeenSeq = useRef(0);
  const revealTimer = useRef(null);
  const inspectTimer = useRef(null);
  const suppressUntil = useRef(0);
  const fxTimer = useRef(null);
  const atkFxTimer = useRef(null);

  if (!gameRef.current) {
    gameRef.current = createGame(deck, trainer);
  }
  const game = gameRef.current;

  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  // ---- AI 턴 루프 (행동 1개씩) ----
  useEffect(() => {
    if (intro !== false || game.winner || game.turn !== 'enemy') return;
    aiTimer.current = setTimeout(() => {
      aiStep(game);
      rerender();
    }, AI_DELAY);
    return () => clearTimeout(aiTimer.current);
  });

  // ---- 상대 카드 공개 + 진화/메가 이펙트 ----
  useEffect(() => {
    const la = game.lastAction;
    if (!la || la.seq === lastSeenSeq.current) return;
    lastSeenSeq.current = la.seq;
    if (la.side === 'enemy' && la.kind === 'play') {
      setEnemyReveal({ cardId: la.cardId, key: la.seq });
      clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setEnemyReveal(null), 1150);
    }
    if (la.kind === 'play' && la.cardId && isLegend(la.cardId)) {
      playCry(la.cardId);
      setLegendFx({ cardId: la.cardId, side: la.side, key: la.seq });
      setTimeout(() => setLegendFx(null), 2000);
    }
    if (la.anim === 'evolve' || la.anim === 'mega') {
      setUnitFx({ uid: la.uid, kind: la.anim, key: la.seq });
      clearTimeout(fxTimer.current);
      fxTimer.current = setTimeout(() => setUnitFx(null), la.anim === 'mega' ? 1500 : 950);
    }
    if (la.kind === 'attack') {
      setAtkFx({ uid: la.uid, targetUid: la.targetUid, side: la.side, key: la.seq });
      clearTimeout(atkFxTimer.current);
      atkFxTimer.current = setTimeout(() => setAtkFx(null), 520);
    }
  });

  useEffect(() => () => {
    clearTimeout(revealTimer.current);
    clearTimeout(inspectTimer.current);
    clearTimeout(fxTimer.current);
    clearTimeout(atkFxTimer.current);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  });

  const me = game.players.player;
  const foe = game.players.enemy;
  const myTurn = game.turn === 'player' && !game.winner;

  // ============================================================
  // 꾹 눌러 카드 크게 보기 (움직이면 취소)
  // ============================================================
  function startInspect(payload, e) {
    const sx = e.clientX, sy = e.clientY;
    clearTimeout(inspectTimer.current);
    inspectTimer.current = setTimeout(() => {
      setInspect(payload);
      suppressUntil.current = Date.now() + 400;
    }, INSPECT_DELAY);
    const onMove = (ev) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) cancel();
    };
    const cancel = () => {
      clearTimeout(inspectTimer.current);
      setInspect(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', cancel);
      window.removeEventListener('pointercancel', cancel);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', cancel);
    window.addEventListener('pointercancel', cancel);
  }

  // ============================================================
  // 하스스톤식 조준 공격 (공격자 꾹 -> 화살표 -> 대상에서 놓기)
  // ============================================================
  function updateAimLine(x2, y2) {
    const line = aimLineRef.current;
    const s0 = aimStart.current;
    if (!line || !s0) return;
    line.setAttribute('x1', s0.x);
    line.setAttribute('y1', s0.y);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
  }

  function beginAim(unit, cx, cy, px, py) {
    aimStart.current = { x: cx, y: cy, px, py };
    setAimUid(unit.uid);
    setSelectedHand(null);

    const onMove = (ev) => {
      aimStart.current.px = ev.clientX;
      aimStart.current.py = ev.clientY;
      updateAimLine(ev.clientX, ev.clientY);
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      aimStart.current = null;
      setAimUid(null);
      suppressUntil.current = Date.now() + 250;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const drop = el ? el.closest('[data-drop]') : null;
      if (!drop) return;
      if (drop.dataset.drop === 'unit-enemy' && drop.dataset.uid) {
        attack(game, 'player', unit.uid, { uid: drop.dataset.uid });
        rerender();
      } else if (drop.dataset.drop === 'enemy-hero') {
        attack(game, 'player', unit.uid, { uid: 'hero' });
        rerender();
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  // 조준선 초기 표시 (svg가 렌더된 뒤)
  useEffect(() => {
    if (aimUid && aimStart.current) {
      updateAimLine(aimStart.current.px, aimStart.current.py);
    }
  }, [aimUid]);

  function onMyUnitPointerDown(unit, e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (selectedHand !== null) return; // 타겟팅 중엔 클릭 흐름에 맡긴다
    const canAct = myTurn && canAttack(game, 'player', unit.uid);
    if (!canAct) {
      startInspect({ cardId: unit.cardId, unit }, e); // 공격 불가: 꾹 눌러 보기만
      return;
    }
    // 공격 가능 유닛: 가만히 꾹 누르면 카드 보기, 움직이면 조준 시작
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const sx = e.clientX, sy = e.clientY;
    clearTimeout(inspectTimer.current);
    inspectTimer.current = setTimeout(() => {
      setInspect({ cardId: unit.cardId, unit });
      suppressUntil.current = Date.now() + 400;
    }, INSPECT_DELAY);
    const onMove = (ev) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) {
        clearTimeout(inspectTimer.current);
        setInspect(null);
        cleanup();
        beginAim(unit, cx, cy, ev.clientX, ev.clientY); // 움직임 감지 -> 조준으로 전환
      }
    };
    const onUp = () => {
      clearTimeout(inspectTimer.current);
      setInspect(null);
      cleanup();
    };
    function cleanup() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function onEnemyUnitPointerDown(unit, e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (selectedHand !== null) return; // 타겟팅 중엔 클릭 흐름에 맡긴다
    startInspect({ cardId: unit.cardId, unit }, e);
  }

  // ============================================================
  // 손패 드래그 (모든 카드 이동 가능, 사용은 낼 수 있을 때만)
  // ============================================================
  function calcInsertIndex(clientX) {
    if (!myFieldRef.current) return null;
    const units = [...myFieldRef.current.querySelectorAll('.field-unit')];
    for (let i = 0; i < units.length; i++) {
      const r = units[i].getBoundingClientRect();
      if (clientX < r.left + r.width / 2) return i;
    }
    return units.length;
  }

  function updateInsertMarker(clientX, clientY) {
    const marker = markerRef.current;
    const fieldEl = myFieldRef.current;
    if (!marker || !fieldEl) return;
    const info = dragInfo.current;
    if (!info || !info.playable) { marker.style.display = 'none'; return; }
    const card = CARD_MAP[me.hand[info.idx].cardId];
    const isBasicPokemon = card && card.kind === 'pokemon' && !card.evolvesFrom;
    const fr = fieldEl.getBoundingClientRect();
    const inside = clientX >= fr.left && clientX <= fr.right && clientY >= fr.top && clientY <= fr.bottom;
    if (!isBasicPokemon || !inside) { marker.style.display = 'none'; return; }

    const units = [...fieldEl.querySelectorAll('.field-unit')];
    let x;
    if (units.length === 0) {
      x = fr.width / 2;
    } else {
      const idx = calcInsertIndex(clientX);
      if (idx === 0) x = units[0].getBoundingClientRect().left - fr.left - 7;
      else x = units[idx - 1].getBoundingClientRect().right - fr.left + 4;
    }
    marker.style.display = 'block';
    marker.style.left = `${x}px`;
  }

  function onHandPointerDown(e, idx) {
    if (e.button !== undefined && e.button !== 0) return;
    const playable = myTurn && canPlayCard(game, 'player', idx);
    dragInfo.current = { idx, startX: e.clientX, startY: e.clientY, moved: false, playable };

    const onMove = (ev) => {
      const info = dragInfo.current;
      if (!info) return;
      const dx = ev.clientX - info.startX;
      const dy = ev.clientY - info.startY;
      if (!info.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        info.moved = true;
        setSelectedHand(null);
        setDragIdx(info.idx);
      }
      if (info.moved && ghostRef.current) {
        ghostRef.current.style.left = `${ev.clientX}px`;
        ghostRef.current.style.top = `${ev.clientY}px`;
        updateInsertMarker(ev.clientX, ev.clientY);
      }
    };

    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const info = dragInfo.current;
      dragInfo.current = null;
      if (markerRef.current) markerRef.current.style.display = 'none';
      if (!info || !info.moved) return; // 클릭으로 처리 (onClick이 이어받음)
      setDragIdx(null);
      if (info.playable) resolveDrop(info.idx, ev.clientX, ev.clientY);
      // 사용 불가 카드는 그냥 제자리로 (보기 전용)
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function resolveDrop(handIdx, x, y) {
    if (!myTurn) return;
    const h = me.hand[handIdx];
    if (!h) return;
    const card = CARD_MAP[h.cardId];
    const need = spellNeedsTarget(card);

    function attemptPlay(target, fieldIndex) {
      const ok = playCard(game, 'player', handIdx, target, fieldIndex);
      playSfx(ok ? 'click' : 'buzzer');
      rerender();
      return ok;
    }

    const el = document.elementFromPoint(x, y);
    const drop = el ? el.closest('[data-drop]') : null;
    if (!drop) return;
    const zone = drop.dataset.drop;
    const uid = drop.dataset.uid;

    if (card.kind === 'pokemon' && !card.evolvesFrom) {
      if (zone === 'my-field' || zone === 'unit-player') {
        attemptPlay(null, calcInsertIndex(x));
      }
      return;
    }
    if (card.kind === 'pokemon' && card.evolvesFrom) {
      if (zone === 'unit-player' && uid) {
        attemptPlay({ uid });
      }
      return;
    }
    if (card.kind === 'mega') {
      if (zone === 'unit-player' && uid) {
        attemptPlay({ uid });
      }
      return;
    }
    if (need === 'enemy') {
      if (zone === 'unit-enemy' && uid) attemptPlay({ uid });
      else if (zone === 'enemy-hero') attemptPlay({ uid: 'hero' });
      return;
    }
    if (need === 'friendly') {
      if (zone === 'unit-player' && uid) attemptPlay({ uid });
      return;
    }
    if (zone === 'my-field' || zone === 'enemy-field' || zone === 'board' || zone === 'unit-player' || zone === 'unit-enemy') {
      attemptPlay(null);
    }
  }

  // ============================================================
  // 클릭 방식 (기술 타겟팅 폴백)
  // ============================================================
  function onHandClick(idx) {
    if (Date.now() < suppressUntil.current) return;
    if (!myTurn) return;
    if (!canPlayCard(game, 'player', idx)) { playSfx('buzzer'); return; }
    const card = CARD_MAP[me.hand[idx].cardId];
    const need = spellNeedsTarget(card);
    if (!need) {
      playCard(game, 'player', idx, null);
      playSfx('click');
      setSelectedHand(null);
      rerender();
    } else {
      playSfx('click');
      setSelectedHand(selectedHand === idx ? null : idx);
    }
  }

  function onUnitClick(side, unit) {
    if (Date.now() < suppressUntil.current) return;
    if (game.pendingBattlecry && game.pendingBattlecry.side === 'player' && side === 'enemy'
      && game.pendingBattlecry.targets.includes(unit.uid)) {
      resolveMoldbreaker(game, 'player', unit.uid);
      rerender();
      return;
    }
    if (!myTurn || selectedHand === null) return;
    const card = CARD_MAP[me.hand[selectedHand].cardId];
    const need = spellNeedsTarget(card);
    if (need === 'enemy' && side === 'enemy') {
      playCard(game, 'player', selectedHand, { uid: unit.uid });
      setSelectedHand(null);
      rerender();
      return;
    }
    if ((need === 'friendly' || need === 'evolve' || need === 'mega') && side === 'player') {
      playCard(game, 'player', selectedHand, { uid: unit.uid });
      setSelectedHand(null);
      rerender();
      return;
    }
    setSelectedHand(null);
  }

  function onHeroClick() {
    if (Date.now() < suppressUntil.current) return;
    if (!myTurn || selectedHand === null) return;
    const card = CARD_MAP[me.hand[selectedHand].cardId];
    if (spellNeedsTarget(card) === 'enemy') {
      playCard(game, 'player', selectedHand, { uid: 'hero' });
      setSelectedHand(null);
      rerender();
    }
  }

  function onEndTurn() {
    if (!myTurn) return;
    playSfx('click');
    setSelectedHand(null);
    setAimUid(null);
    endTurn(game);
    rerender();
  }

  // ============================================================
  // 하이라이트 계산
  // ============================================================
  const { units: legalTargets, hero: heroTargetable } = validAttackTargets(game, 'player');
  const attackMode = aimUid !== null;

  const dragPlayable = dragIdx !== null && myTurn && me.hand[dragIdx] && canPlayCard(game, 'player', dragIdx);
  const activeHandIdx = dragPlayable ? dragIdx : selectedHand;
  const spellMode = activeHandIdx !== null;
  const activeCard = spellMode && me.hand[activeHandIdx] ? CARD_MAP[me.hand[activeHandIdx].cardId] : null;
  const spellNeed = activeCard ? spellNeedsTarget(activeCard) : null;
  const draggingBasicPokemon = dragPlayable && activeCard
    && activeCard.kind === 'pokemon' && !activeCard.evolvesFrom;

  function isEnemyTargetable(u) {
    if (game.pendingBattlecry && game.pendingBattlecry.side === 'player') {
      return game.pendingBattlecry.targets.includes(u.uid);
    }
    if (attackMode) return legalTargets.some((t) => t.uid === u.uid);
    if (spellMode && spellNeed === 'enemy') return true;
    return false;
  }
  function isFriendlyTargetable(u) {
    if (!spellMode || !activeCard) return false;
    if (spellNeed === 'friendly') return true;
    if (spellNeed === 'evolve') return u.cardId === activeCard.evolvesFrom;
    if (spellNeed === 'mega') return u.cardId === activeCard.megaFor && !u.mega;
    return false;
  }

  function ManaPips({ mana, maxMana }) {
    const pips = [];
    for (let i = 0; i < maxMana; i++) {
      pips.push(<span key={i} className={`mana-pip ${i < mana ? 'full' : 'empty'}`} />);
    }
    return (
      <div className="mana-display">
        {pips}
        <span className="mana-num">{mana}/{maxMana}</span>
      </div>
    );
  }

  // VS 화면 자동 진행: 1.4s → coin 애니, 2.8s → 배틀 시작
  // 의존성 배열을 빈 배열로 고정해서 마운트 1회만 실행 (매 렌더마다 타이머 리셋되는 버그 방지)
  useEffect(() => {
    const t1 = setTimeout(() => setIntro('coin'), 1400);
    const t2 = setTimeout(() => setIntro(false), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (intro !== false) {
    const isPlayer = game.firstSide === 'player';
    return (
      <div className={`battle-intro intro-phase-${intro}`}>
        {intro === 'vs' && (
          <>
            <div className="intro-vs">
              <div className="intro-side">
                <TrainerSprite spriteKey={PLAYER_SPRITE} emoji="🧢" size={110} />
                <span>나</span>
              </div>
              <div className="intro-vs-text">VS</div>
              <div className="intro-side">
                <TrainerSprite spriteKey={trainer.sprite} emoji={trainer.emoji} size={110} />
                <span>{trainer.name}</span>
              </div>
            </div>
            <p className="intro-line">
              "{trainer.introLines[Math.floor(Math.random() * trainer.introLines.length)]}"
            </p>
          </>
        )}
        {intro === 'coin' && (
          <div className="coin-toss-wrap">
            <div className={`coin-spin ${isPlayer ? 'heads' : 'tails'}`}>COIN</div>
            <p className={`coin-result ${isPlayer ? 'first' : 'second'}`}>
              {isPlayer ? '선공!' : '후공...'}
            </p>
            <p className="coin-sub">
              {isPlayer
                ? '코인 앞면! 내가 먼저 간다.'
                : `코인 뒷면! ${trainer.name} 선공 — 대신 카드 1장 더 받음`}
            </p>
          </div>
        )}
        <button className="btn-ghost small" style={{position:'absolute',bottom:16,right:16}} onClick={() => onFinish(null)}>돌아가기</button>
      </div>
    );
  }

  const resultOverlay = game.winner && (
    <div className="result-overlay">
      <div className="result-box">
        {game.winner === 'player' ? (
          <>
            <h2 className="result-title win">VICTORY!</h2>
            <p className="result-line">"{trainer.loseLines[0]}"</p>
            <p className="result-reward">
              <img className="res-icon" src={UI_SPRITES.coin} alt="" width={20} height={20} draggable={false} />
              {trainer.reward} 획득!
            </p>
          </>
        ) : (
          <>
            <h2 className="result-title lose">DEFEAT...</h2>
            <p className="result-line">"{trainer.winLines[0]}"</p>
            <p className="result-reward">
              <img className="res-icon" src={UI_SPRITES.coin} alt="" width={20} height={20} draggable={false} />
              위로금 30
            </p>
          </>
        )}
        <button className="btn-primary" onClick={() => onFinish(game.winner)}>확인</button>
      </div>
    </div>
  );

  return (
    <div className={`battle ${attackMode ? 'aiming' : ''}`} onContextMenu={(e) => e.preventDefault()}>
      {resultOverlay}

      {/* 꾹 눌러 카드 크게 보기 */}
      {inspect && (
        <div className="inspect-overlay">
          <HandCard cardId={inspect.cardId} unit={inspect.unit} playable ghost />
        </div>
      )}

      {/* 조준 화살표 */}
      {attackMode && (
        <svg className="aim-svg">
          <defs>
            <marker id="aimhead" markerWidth="7" markerHeight="7" refX="4.5" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill="#f5c542" />
            </marker>
          </defs>
          <line ref={aimLineRef} x1="0" y1="0" x2="0" y2="0"
            stroke="#f5c542" strokeWidth="3" strokeLinecap="round"
            strokeDasharray="7 6" markerEnd="url(#aimhead)" />
        </svg>
      )}

      {/* 상대가 낸 카드 공개 연출 */}
      {enemyReveal && (
        <div className="enemy-reveal" key={enemyReveal.key}>
          <div className="enemy-reveal-label">{foe.name}</div>
          <HandCard cardId={enemyReveal.cardId} playable ghost />
        </div>
      )}

      {/* 레전드 소환 전용 이펙트 */}
      {legendFx && (
        <div className={`legend-summon-fx legend-${legendFx.cardId} ${legendFx.side === 'player' ? 'from-bottom' : 'from-top'}`} key={legendFx.key}>
          <div className="legend-rings" />
          <img
            className="legend-sprite"
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${{kyogre:382,suicune:245,moltres:146,entei:244,hooh:250,zapdos:145,raikou:243,groudon:383,articuno:144,regice:378,celebi:251,mewtwo:150,mew:151,lugia:249,regirock:377,latias:380,rayquaza:384,registeel:379}[legendFx.cardId]}.png`}
            alt=""
          />
          <div className="legend-name">{({'kyogre':'가이오가','suicune':'스이쿤','moltres':'파이어','entei':'앤테이','hooh':'칠색조','zapdos':'썬더','raikou':'라이코','groudon':'그란돈','articuno':'프리져','regice':'레지아이스','celebi':'세레비','mewtwo':'뮤츠','mew':'뮤','lugia':'루기아','regirock':'레지락','latias':'라티아스','rayquaza':'레쿠쟈','registeel':'레지스틸'})[legendFx.cardId]}</div>
        </div>
      )}

      {/* 드래그 고스트 */}
      {dragIdx !== null && me.hand[dragIdx] && (
        <div className="drag-ghost" ref={ghostRef}>
          <HandCard cardId={me.hand[dragIdx].cardId} game={game} playable ghost />
          {!dragPlayable && <div className="ghost-note">지금은 낼 수 없다</div>}
        </div>
      )}

      {/* 상대 영역 */}
      <div
        className={`hero-bar enemy-bar ${(attackMode && heroTargetable) || (spellMode && spellNeed === 'enemy') ? 'targetable' : ''}`}
        onClick={onHeroClick}
        data-drop="enemy-hero"
      >
        <div
          className={`hero-portrait ${atkFx && atkFx.side === 'player' && atkFx.targetUid === 'hero' ? 'hit-flash' : ''}`}
        >
          <TrainerSprite spriteKey={trainer.sprite} emoji={trainer.emoji} size={44} />
          <span className="hero-hp">HP {foe.hp}</span>
        </div>
        <div className="hero-info">
          <div className="hero-name">{foe.name}</div>
          <div className="hero-sub">손패 {foe.hand.length}장 · 덱 {foe.deck.length}장</div>
        </div>
        <ManaPips mana={foe.mana} maxMana={foe.maxMana} />
      </div>

      <div className="field enemy-field" data-drop="enemy-field">
        {foe.field.map((u) => (
          <FieldUnit
            key={u.uid}
            unit={u}
            game={game}
            targetable={isEnemyTargetable(u)}
            onClick={() => onUnitClick('enemy', u)}
            onPointerDown={(e) => onEnemyUnitPointerDown(u, e)}
            dropZone="unit-enemy"
            fx={unitFx && unitFx.uid === u.uid ? unitFx.kind : null}
            fxKey={unitFx ? unitFx.key : 0}
            lunge={atkFx && atkFx.side === 'enemy' && atkFx.uid === u.uid ? 'down' : null}
            hit={atkFx && atkFx.side === 'player' && atkFx.targetUid === u.uid}
          />
        ))}
        {foe.field.length === 0 && <div className="field-empty">필드가 비어 있다</div>}
      </div>

      {/* 중앙: 날씨 + 로그 */}
      <div className="mid-bar" data-drop="board">
        <div className={`weather-indicator ${game.weather || 'none'}`}>
          <span className="weather-dot" />
          {game.weather ? WEATHER_NAME[game.weather] : '날씨 없음'}
        </div>
        <div className="battle-log" ref={logRef}>
          {game.log.slice(-8).map((line, i) => <div key={i}>{line}</div>)}
        </div>
        <button
          className={`btn-endturn ${myTurn ? '' : 'disabled'}`}
          onClick={onEndTurn}
          disabled={!myTurn}
        >
          {myTurn ? '턴 종료' : '상대 턴...'}
        </button>
        {!confirmSurrender ? (
          <button
            className="btn-surrender"
            onClick={() => { playSfx('click'); setConfirmSurrender(true); }}
          >
            항복
          </button>
        ) : (
          <div className="surrender-confirm">
            <span>정말 항복할까요?</span>
            <button
              className="btn-ghost small danger"
              onClick={() => { playSfx('click'); onFinish('enemy'); }}
            >
              예, 항복
            </button>
            <button
              className="btn-ghost small"
              onClick={() => { playSfx('click'); setConfirmSurrender(false); }}
            >
              아니오
            </button>
          </div>
        )}
      </div>

      {/* 내 필드 */}
      <div
        className={`field my-field ${draggingBasicPokemon ? 'drop-ready' : ''}`}
        data-drop="my-field"
        ref={myFieldRef}
      >
        <div className="insert-marker" ref={markerRef} />
        {me.field.map((u) => (
          <FieldUnit
            key={u.uid}
            unit={u}
            game={game}
            canAct={myTurn && canAttack(game, 'player', u.uid)}
            selected={aimUid === u.uid}
            targetable={isFriendlyTargetable(u)}
            onClick={() => onUnitClick('player', u)}
            onPointerDown={(e) => onMyUnitPointerDown(u, e)}
            dropZone="unit-player"
            fx={unitFx && unitFx.uid === u.uid ? unitFx.kind : null}
            fxKey={unitFx ? unitFx.key : 0}
            lunge={atkFx && atkFx.side === 'player' && atkFx.uid === u.uid ? 'up' : null}
            hit={atkFx && atkFx.side === 'enemy' && atkFx.targetUid === u.uid}
          />
        ))}
        {me.field.length === 0 && !draggingBasicPokemon && <div className="field-empty">포켓몬을 끌어다 놓자!</div>}
      </div>

      {/* 내 영역 */}
      <div className="hero-bar my-bar">
        <div className={`hero-portrait ${atkFx && atkFx.side === 'enemy' && atkFx.targetUid === 'hero' ? 'hit-flash' : ''}`}>
          <TrainerSprite spriteKey={PLAYER_SPRITE} emoji="🧢" size={44} />
          <span className="hero-hp">HP {me.hp}</span>
        </div>
        <div className="hero-info">
          <div className="hero-name">나</div>
          <div className="hero-sub">덱 {me.deck.length}장</div>
        </div>
        <ManaPips mana={me.mana} maxMana={me.maxMana} />
      </div>

      <div className="hand">
        {me.hand.map((h, idx) => {
          const c = CARD_MAP[h.cardId];
          const playableNow = myTurn && canPlayCard(game, 'player', idx);
          const stuckEvo = myTurn && c.kind === 'pokemon' && c.evolvesFrom && !playableNow && !me.discardUsedThisTurn;
          return (
            <div key={h.uid} className="hand-card-wrap">
              <HandCard
                cardId={h.cardId}
                game={game}
                playable={playableNow}
                selected={selectedHand === idx}
                dragOrigin={dragIdx === idx}
                onClick={() => onHandClick(idx)}
                onPointerDown={(e) => onHandPointerDown(e, idx)}
              />
              {stuckEvo && (
                <button
                  className="btn-discard-redraw"
                  onClick={(e) => { e.stopPropagation(); discardToDraw(game, 'player', idx); rerender(); }}
                  title="진화 대상이 없다 - 버리고 카드 1장 뽑기 (턴당 1회)"
                >
                  버리고 뽑기
                </button>
              )}
            </div>
          );
        })}
      </div>

      {game.pendingBattlecry && game.pendingBattlecry.side === 'player' && (
        <div className="target-hint">
          틀깨기! 도발을 없앨 상대 포켓몬을 선택하세요
        </div>
      )}
      {selectedHand !== null && spellNeed && dragIdx === null && (
        <div className="target-hint">
          {spellNeed === 'enemy' && '대상을 선택하세요 (적 포켓몬 또는 상대 트레이너)'}
          {spellNeed === 'friendly' && (CARD_MAP[me.hand[selectedHand].cardId].kind === 'item' ? '장착할 아군 포켓몬을 선택하세요' : '회복할 아군 포켓몬을 선택하세요')}
          {spellNeed === 'evolve' && '진화시킬 포켓몬을 선택하세요'}
          {spellNeed === 'mega' && '메가진화시킬 포켓몬을 선택하세요'}
          <button className="btn-ghost small" onClick={() => setSelectedHand(null)}>취소</button>
        </div>
      )}
    </div>
  );
}
