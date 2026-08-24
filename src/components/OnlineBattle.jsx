import React, { useEffect, useMemo, useRef, useState } from "react";
import { CARD_MAP } from "../data/cards.js";
import {
  attack,
  canAttack,
  canPlayCard,
  createGame,
  drawCard,
  endTurn,
  playCard,
  resolveDeoxysForm,
  resolveHyperball,
  resolveMagmaStorm,
  resolveManaphyBraveCharge,
  resolveMew,
  resolveMoldbreaker,
  resolvePhioneBraveCharge,
  resolveShayminForm,
  resolveSpacialRend,
  resolveUxie,
  resolveWishmaker,
  spellNeedsTarget,
  validAttackTargets,
} from "../engine/engine.js";
import { FieldUnit, HandCard, TrainerSprite } from "./Card.jsx";
import {
  commitOnlineHostState,
  fetchOnlineBootstrap,
  fetchOnlineHostState,
  fetchOnlineState,
  initializeOnlineMatch,
  leaveMatchmaking,
  sendOnlineCommand,
} from "../state/api.js";
import { playSfx } from "../audio.js";
import "../styles/online-battle.css";

const POLL_MS = 500;
const ONLINE_TRAINER_SPRITE = "ethan";

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function remapSide(side) {
  if (side === "player") return "enemy";
  if (side === "enemy") return "player";
  return side;
}

function normalizePlayerSide(player, side) {
  if (!player) return player;
  player.side = side;
  if (Array.isArray(player.field)) {
    player.field.forEach((unit) => {
      if (unit) unit.side = side;
    });
  }
  if (player._shadowForceExile?.unit) {
    player._shadowForceExile.unit.side = side;
  }
  return player;
}

function localViewGame(game, mySide) {
  if (!game) return null;
  const view = cloneJson(game);
  if (mySide !== "enemy") return view;

  const canonicalPlayer = view.players.player;
  const canonicalEnemy = view.players.enemy;
  view.players.player = normalizePlayerSide(canonicalEnemy, "player");
  view.players.enemy = normalizePlayerSide(canonicalPlayer, "enemy");
  view.turn = remapSide(view.turn);
  view.firstSide = remapSide(view.firstSide);
  view.winner = remapSide(view.winner);

  const sideKeys = [
    "pendingBattlecry",
    "pendingChoose",
    "pendingWishmaker",
    "pendingDeoxysForm",
    "pendingShayminForm",
  ];
  sideKeys.forEach((key) => {
    if (view[key]?.side) view[key].side = remapSide(view[key].side);
    if (view[key]?.targetSide) view[key].targetSide = remapSide(view[key].targetSide);
  });

  if (view.lastAction?.side) view.lastAction.side = remapSide(view.lastAction.side);
  if (Array.isArray(view.lastAction?.impacts)) {
    view.lastAction.impacts.forEach((impact) => {
      if (impact?.side) impact.side = remapSide(impact.side);
    });
  }
  return view;
}

function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < String(text).length; i += 1) {
    hash ^= String(text).charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed(values, seedText) {
  const next = [...values];
  const random = mulberry32(hashSeed(seedText));
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function withInitialRandom(seed, firstSide, callback) {
  const original = Math.random;
  const random = mulberry32(hashSeed(seed));
  let firstCall = true;
  Math.random = () => {
    if (firstCall) {
      firstCall = false;
      return firstSide === "player" ? 0.1 : 0.9;
    }
    return random();
  };
  try {
    return callback();
  } finally {
    Math.random = original;
  }
}

function applyEnemyShinyState(game, deckShiny = {}) {
  const remaining = { ...(deckShiny || {}) };
  for (const handCard of game.players.enemy.hand || []) {
    const count = remaining[handCard.cardId] || 0;
    if (count <= 0) continue;
    handCard.shiny = true;
    remaining[handCard.cardId] = count - 1;
    if (remaining[handCard.cardId] <= 0) delete remaining[handCard.cardId];
  }
  game.players.enemy._shinyDeckRemaining = remaining;
}

function createInitialOnlineGame(bootstrap) {
  const trainer = {
    id: `online-${bootstrap.matchId}`,
    name: bootstrap.enemyDeck.username,
    sprite: ONLINE_TRAINER_SPRITE,
    hp: 40,
    reward: 0,
    deck: [...bootstrap.enemyDeck.deck],
    onlineBattle: true,
  };

  const game = withInitialRandom(bootstrap.seed, bootstrap.firstSide, () =>
    createGame(
      bootstrap.playerDeck.deck,
      trainer,
      bootstrap.playerDeck.deckShiny || {},
    ),
  );
  game.players.player.name = bootstrap.playerDeck.username;
  game.players.enemy.name = bootstrap.enemyDeck.username;
  applyEnemyShinyState(game, bootstrap.enemyDeck.deckShiny || {});
  game._onlineMatch = {
    id: bootstrap.matchId,
    seed: bootstrap.seed,
  };
  return game;
}

function restoreShinyToDeck(player, card) {
  if (!card?.shiny) return;
  player._shinyDeckRemaining = player._shinyDeckRemaining || {};
  player._shinyDeckRemaining[card.cardId] =
    (player._shinyDeckRemaining[card.cardId] || 0) + 1;
}

function applyMulligan(game, side, cardUids, seedText) {
  const player = game.players?.[side];
  if (!player) return false;
  const chosen = new Set(cardUids || []);
  const kept = [];
  const returned = [];

  for (const handCard of player.hand || []) {
    if (chosen.has(handCard.uid)) returned.push(handCard);
    else kept.push(handCard);
  }

  player.hand = kept;
  player.deck = shuffleWithSeed(player.deck || [], `${seedText}:replace`);
  for (let i = 0; i < returned.length; i += 1) {
    drawCard(game, side, true);
  }

  for (const handCard of returned) {
    player.deck.push(handCard.cardId);
    restoreShinyToDeck(player, handCard);
  }
  player.deck = shuffleWithSeed(player.deck || [], `${seedText}:return`);
  return true;
}

function resolvePendingTarget(game, side, targetUid) {
  const ability = game.pendingBattlecry?.ability;
  if (!ability) return false;
  if (ability === "metronome") return resolveMew(game, side, targetUid);
  if (ability === "spacialrend") return resolveSpacialRend(game, side, targetUid);
  if (ability === "magmastorm") return resolveMagmaStorm(game, side, targetUid);
  if (ability === "bravecharge_phione") {
    return resolvePhioneBraveCharge(game, side, targetUid);
  }
  if (ability === "bravecharge_manaphy") {
    return resolveManaphyBraveCharge(game, side, targetUid);
  }
  return resolveMoldbreaker(game, side, targetUid);
}

function resolvePendingChoice(game, side, value) {
  if (game.pendingChoose?.side === side) {
    if (game.pendingChoose.effect === "hyperball") {
      return resolveHyperball(game, side, value);
    }
    if (game.pendingChoose.effect === "uxie") {
      return resolveUxie(game, side, value);
    }
  }
  if (game.pendingWishmaker?.side === side) {
    return resolveWishmaker(game, side, value);
  }
  if (game.pendingDeoxysForm?.side === side) {
    return resolveDeoxysForm(game, side, value);
  }
  if (game.pendingShayminForm?.side === side) {
    return resolveShayminForm(game, side, value);
  }
  return false;
}

function applyHostCommand(game, command, seed) {
  const side = command.side;
  const payload = command.payload || {};
  try {
    if (payload.type === "mulligan") {
      return {
        ok: applyMulligan(
          game,
          side,
          payload.cardUids || [],
          `${seed}:${command.id}:${side}`,
        ),
      };
    }

    if (payload.type === "play") {
      const handIdx = game.players[side].hand.findIndex(
        (entry) => entry.uid === payload.handUid,
      );
      if (handIdx < 0) return { ok: false, error: "hand_card_not_found" };
      const target = payload.targetUid ? { uid: payload.targetUid } : null;
      const ok = playCard(game, side, handIdx, target, payload.fieldIndex ?? null);
      return { ok, error: ok ? null : "card_play_rejected" };
    }

    if (payload.type === "attack") {
      const ok = attack(game, side, payload.attackerUid, { uid: payload.targetUid });
      return { ok, error: ok ? null : "attack_rejected" };
    }

    if (payload.type === "resolve_pending") {
      const ok = resolvePendingTarget(game, side, payload.targetUid);
      return { ok, error: ok ? null : "target_resolution_rejected" };
    }

    if (payload.type === "resolve_choose") {
      const ok = resolvePendingChoice(game, side, payload.value);
      return { ok, error: ok ? null : "choice_rejected" };
    }

    if (payload.type === "end_turn") {
      endTurn(game);
      return { ok: true };
    }

    if (payload.type === "surrender") {
      game.winner = side === "player" ? "enemy" : "player";
      game.log.push(`${game.players[side].name}이(가) 항복했다.`);
      return { ok: true };
    }
  } catch (error) {
    return { ok: false, error: error?.message || "engine_error" };
  }
  return { ok: false, error: "unknown_command" };
}

function HeroPanel({ player, label, targetable, onClick }) {
  return (
    <button
      type="button"
      className={`online-battle-hero ${targetable ? "targetable" : ""}`}
      onClick={onClick}
      disabled={!targetable}
    >
      <TrainerSprite spriteKey={ONLINE_TRAINER_SPRITE} size={58} />
      <span className="online-battle-hero-copy">
        <small>{label}</small>
        <strong>{player.name}</strong>
        <span>HP {player.hp} / {player.maxHp || 40}</span>
      </span>
      <span className="online-battle-resource">
        {player.mana} / {player.maxMana} ENERGY
      </span>
    </button>
  );
}

function PendingChoiceOverlay({ game, onChoose, busy }) {
  const choose = game.pendingChoose?.side === "player" ? game.pendingChoose : null;
  if (choose) {
    return (
      <div className="online-choice-overlay">
        <div className="online-choice-box">
          <h2>{choose.effect === "uxie" ? "유크시" : "하이퍼볼"}</h2>
          <p>가져올 카드를 선택하세요.</p>
          <div className="online-choice-cards">
            {(choose.picks || []).map((pick) => (
              <HandCard
                key={pick.uid}
                cardId={pick.cardId}
                playable={!busy}
                onClick={() => !busy && onChoose(pick.uid)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (game.pendingWishmaker?.side === "player") {
    return (
      <div className="online-choice-overlay">
        <div className="online-choice-box compact">
          <h2>지라치의 소원</h2>
          <button disabled={busy} onClick={() => onChoose("heal")}>치유의 소원 · 아군 전체 체력 +3</button>
          <button disabled={busy} onClick={() => onChoose("draw")}>지식의 소원 · 카드 2장 드로우</button>
          <button disabled={busy} onClick={() => onChoose("boost")}>힘의 소원 · 아군 전체 +1/+1</button>
        </div>
      </div>
    );
  }

  if (game.pendingDeoxysForm?.side === "player") {
    return (
      <div className="online-choice-overlay">
        <div className="online-choice-box compact">
          <h2>테오키스 폼 선택</h2>
          {["attack", "defense", "speed"].map((form) => (
            <button key={form} disabled={busy} onClick={() => onChoose(form)}>
              {form === "attack" ? "어택폼" : form === "defense" ? "디펜스폼" : "스피드폼"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (game.pendingShayminForm?.side === "player") {
    return (
      <div className="online-choice-overlay">
        <div className="online-choice-box compact">
          <h2>쉐이미 폼 선택</h2>
          <button disabled={busy} onClick={() => onChoose("land")}>랜드폼</button>
          <button disabled={busy} onClick={() => onChoose("sky")}>스카이폼</button>
        </div>
      </div>
    );
  }

  return null;
}

export default function OnlineBattle({ match, onBack }) {
  const matchId = match?.matchId;
  const [bootstrap, setBootstrap] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingCommandId, setPendingCommandId] = useState(null);
  const [selectedHandUid, setSelectedHandUid] = useState(null);
  const [aimUid, setAimUid] = useState(null);
  const [mulliganSelected, setMulliganSelected] = useState([]);
  const initializedRef = useRef(false);
  const processingCommandRef = useRef(null);
  const mountedRef = useRef(true);

  const displayGame = useMemo(
    () => localViewGame(room?.game, room?.mySide),
    [room?.game, room?.mySide],
  );

  const my = displayGame?.players?.player || null;
  const enemy = displayGame?.players?.enemy || null;
  const myTurn = room?.phase === "battle" && displayGame?.turn === "player";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!matchId) return undefined;
    let cancelled = false;

    async function boot() {
      try {
        const data = await fetchOnlineBootstrap(matchId);
        if (cancelled) return;
        setBootstrap(data);

        if (data.host && data.stateRevision === 0 && !initializedRef.current) {
          initializedRef.current = true;
          const game = createInitialOnlineGame(data);
          const initialized = await initializeOnlineMatch(matchId, game);
          if (!cancelled) setRoom(initialized);
        } else {
          const state = data.host
            ? await fetchOnlineHostState(matchId)
            : await fetchOnlineState(matchId);
          if (!cancelled) setRoom(state);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "온라인 전투방에 입장하지 못했습니다.");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  async function processHostCommand(snapshot, seed) {
    const command = snapshot?.pendingCommand;
    if (!command || !snapshot.game) return;
    if (processingCommandRef.current === command.id) return;
    processingCommandRef.current = command.id;

    const game = cloneJson(snapshot.game);
    const result = applyHostCommand(game, command, seed);
    try {
      await commitOnlineHostState(matchId, {
        commandId: command.id,
        baseRevision: snapshot.revision,
        game,
        ok: result.ok,
        error: result.error || null,
      });
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || "전투 행동 동기화에 실패했습니다.");
      }
    } finally {
      processingCommandRef.current = null;
    }
  }

  useEffect(() => {
    if (!matchId || !bootstrap) return undefined;
    let stopped = false;
    let running = false;

    async function tick() {
      if (stopped || running) return;
      running = true;
      try {
        const next = bootstrap.host
          ? await fetchOnlineHostState(matchId)
          : await fetchOnlineState(matchId);
        if (stopped) return;
        setRoom(next);
        setError("");
        if (bootstrap.host && next.pendingCommand) {
          await processHostCommand(next, bootstrap.seed);
        }
      } catch (err) {
        if (!stopped) {
          if (err?.code === "match_not_found") {
            setError("상대가 전투방을 나갔거나 세션이 종료되었습니다.");
          } else {
            setError(err.message || "온라인 전투 상태를 동기화하지 못했습니다.");
          }
        }
      } finally {
        running = false;
      }
    }

    tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [matchId, bootstrap]);

  useEffect(() => {
    if (!pendingCommandId || room?.lastCommand?.id !== pendingCommandId) return;
    setBusy(false);
    if (!room.lastCommand.ok) {
      setError(`행동이 처리되지 않았습니다: ${room.lastCommand.error || "invalid_action"}`);
    }
    setPendingCommandId(null);
  }, [room?.lastCommand, pendingCommandId]);

  useEffect(() => {
    setSelectedHandUid(null);
    setAimUid(null);
  }, [room?.revision]);

  async function issue(command) {
    if (busy || !matchId) return false;
    setBusy(true);
    setError("");
    try {
      const result = await sendOnlineCommand(matchId, command);
      setPendingCommandId(result.commandId);
      return true;
    } catch (err) {
      setBusy(false);
      setError(err.message || "행동을 서버로 보내지 못했습니다.");
      playSfx("buzzer");
      return false;
    }
  }

  async function submitMulligan() {
    const ok = await issue({ type: "mulligan", cardUids: mulliganSelected });
    if (ok) playSfx("click");
  }

  function toggleMulligan(uid) {
    if (room?.mulligan?.me || busy) return;
    setMulliganSelected((current) =>
      current.includes(uid)
        ? current.filter((value) => value !== uid)
        : [...current, uid],
    );
  }

  async function playSelected(targetUid = null) {
    if (!selectedHandUid) return;
    const command = { type: "play", handUid: selectedHandUid };
    if (targetUid) command.targetUid = targetUid;
    const ok = await issue(command);
    if (ok) {
      setSelectedHandUid(null);
      playSfx("click");
    }
  }

  async function onHandClick(handCard, index) {
    if (!myTurn || busy || !handCard?.cardId) return;
    if (!canPlayCard(displayGame, "player", index)) {
      playSfx("buzzer");
      return;
    }
    const card = CARD_MAP[handCard.cardId];
    const need = spellNeedsTarget(card);
    if (!need) {
      const ok = await issue({ type: "play", handUid: handCard.uid });
      if (ok) playSfx("click");
      return;
    }
    setAimUid(null);
    setSelectedHandUid(handCard.uid);
    playSfx("click");
  }

  async function onMyUnit(unit) {
    if (busy || !myTurn) return;
    const pending = displayGame.pendingBattlecry;
    if (
      pending?.side === "player" &&
      (pending.targetSide || "enemy") === "player" &&
      pending.targets?.includes(unit.uid)
    ) {
      await issue({ type: "resolve_pending", targetUid: unit.uid });
      return;
    }

    if (selectedHandUid) {
      const selected = my.hand.find((entry) => entry.uid === selectedHandUid);
      const card = CARD_MAP[selected?.cardId];
      const need = card ? spellNeedsTarget(card) : null;
      if (["friendly-or-hero", "friendly", "evolve", "mega"].includes(need)) {
        await playSelected(unit.uid);
        return;
      }
    }

    if (canAttack(displayGame, "player", unit.uid)) {
      setSelectedHandUid(null);
      setAimUid((current) => (current === unit.uid ? null : unit.uid));
      playSfx("click");
    }
  }

  async function onEnemyUnit(unit) {
    if (busy || !myTurn) return;
    const pending = displayGame.pendingBattlecry;
    if (
      pending?.side === "player" &&
      (pending.targetSide || "enemy") === "enemy" &&
      pending.targets?.includes(unit.uid)
    ) {
      await issue({ type: "resolve_pending", targetUid: unit.uid });
      return;
    }

    if (aimUid) {
      const legal = validAttackTargets(displayGame, "player", aimUid);
      if (legal.units.some((target) => target.uid === unit.uid)) {
        await issue({ type: "attack", attackerUid: aimUid, targetUid: unit.uid });
        return;
      }
    }

    if (selectedHandUid) {
      const selected = my.hand.find((entry) => entry.uid === selectedHandUid);
      const card = CARD_MAP[selected?.cardId];
      if (card && spellNeedsTarget(card) === "enemy") {
        await playSelected(unit.uid);
      }
    }
  }

  async function onEnemyHero() {
    if (busy || !myTurn) return;
    if (aimUid) {
      const legal = validAttackTargets(displayGame, "player", aimUid);
      if (legal.hero) {
        await issue({ type: "attack", attackerUid: aimUid, targetUid: "hero" });
        return;
      }
    }

    if (selectedHandUid) {
      const selected = my.hand.find((entry) => entry.uid === selectedHandUid);
      const card = CARD_MAP[selected?.cardId];
      if (
        card &&
        spellNeedsTarget(card) === "enemy" &&
        card.spell?.target !== "enemy-pokemon"
      ) {
        await playSelected("hero");
      }
    }
  }

  async function onMyHero() {
    if (busy || !myTurn || !selectedHandUid) return;
    const selected = my.hand.find((entry) => entry.uid === selectedHandUid);
    const card = CARD_MAP[selected?.cardId];
    if (card && spellNeedsTarget(card) === "friendly-or-hero") {
      await playSelected("hero");
    }
  }

  async function choosePending(value) {
    const ok = await issue({ type: "resolve_choose", value });
    if (ok) playSfx("click");
  }

  async function leaveRoom() {
    try {
      await leaveMatchmaking();
    } catch {
      // 이미 종료된 세션이면 메인 이동은 계속한다.
    }
    onBack();
  }

  if (!bootstrap || !room || !displayGame || !my || !enemy) {
    return (
      <div className="online-battle-loading">
        <strong>온라인 배틀 동기화 중</strong>
        <span>{error || "전투 상태를 준비하고 있습니다."}</span>
        <button className="btn-secondary" onClick={leaveRoom}>메인 메뉴</button>
      </div>
    );
  }

  const selectedHand = my.hand.find((entry) => entry.uid === selectedHandUid);
  const selectedCard = CARD_MAP[selectedHand?.cardId];
  const selectedNeed = selectedCard ? spellNeedsTarget(selectedCard) : null;
  const attackTargets = aimUid
    ? validAttackTargets(displayGame, "player", aimUid)
    : { units: [], hero: false };
  const pending = displayGame.pendingBattlecry?.side === "player"
    ? displayGame.pendingBattlecry
    : null;

  const enemyTargetable = (unit) => {
    if (pending && (pending.targetSide || "enemy") === "enemy") {
      return pending.targets?.includes(unit.uid);
    }
    if (aimUid) return attackTargets.units.some((target) => target.uid === unit.uid);
    return !!selectedHandUid && selectedNeed === "enemy";
  };

  const myTargetable = (unit) => {
    if (pending && (pending.targetSide || "enemy") === "player") {
      return pending.targets?.includes(unit.uid);
    }
    return !!selectedHandUid && ["friendly-or-hero", "friendly", "evolve", "mega"].includes(selectedNeed);
  };

  const hasPendingChoice = !!(
    displayGame.pendingBattlecry ||
    displayGame.pendingChoose ||
    displayGame.pendingWishmaker ||
    displayGame.pendingDeoxysForm ||
    displayGame.pendingShayminForm
  );

  return (
    <div className="online-battle-screen">
      <div className="online-battle-topbar">
        <div>
          <strong>ONLINE TEST</strong>
          <span>#{String(matchId).slice(0, 8)} · REV {room.revision}</span>
        </div>
        <div className={`online-sync-state ${error ? "error" : ""}`}>
          {error || (busy ? "행동 동기화 중" : "서버 동기화 정상")}
        </div>
        <button className="btn-ghost small" onClick={leaveRoom}>전투방 나가기</button>
      </div>

      <div className="online-battle-board">
        <section className="online-battle-side enemy-side">
          <HeroPanel
            player={enemy}
            label="OPPONENT"
            targetable={myTurn && (attackTargets.hero || (!!selectedHandUid && selectedNeed === "enemy"))}
            onClick={onEnemyHero}
          />
          <div className="online-opponent-private">
            HAND {enemy.hand.length} · DECK {enemy.deck.length}
          </div>
          <div className="online-field">
            {enemy.field.map((unit) => (
              <FieldUnit
                key={unit.uid}
                unit={unit}
                game={displayGame}
                canAct={false}
                selected={false}
                targetable={myTurn && enemyTargetable(unit)}
                onClick={() => onEnemyUnit(unit)}
              />
            ))}
          </div>
        </section>

        <div className="online-battle-centerline">
          <div className={`online-turn-banner ${myTurn ? "mine" : "theirs"}`}>
            <strong>{room.phase === "battle" ? (myTurn ? "내 턴" : "상대 턴") : "멀리건"}</strong>
            <span>TURN {displayGame.turnCount}</span>
            {displayGame.weather && <span>WEATHER {displayGame.weather}</span>}
          </div>
        </div>

        <section className="online-battle-side player-side">
          <div className="online-field">
            {my.field.map((unit) => (
              <FieldUnit
                key={unit.uid}
                unit={unit}
                game={displayGame}
                canAct={myTurn && canAttack(displayGame, "player", unit.uid)}
                selected={aimUid === unit.uid}
                targetable={myTurn && myTargetable(unit)}
                onClick={() => onMyUnit(unit)}
              />
            ))}
          </div>
          <HeroPanel
            player={my}
            label="YOU"
            targetable={myTurn && !!selectedHandUid && selectedNeed === "friendly-or-hero"}
            onClick={onMyHero}
          />
        </section>

        <div className="online-hand-row">
          {my.hand.map((handCard, index) => (
            <HandCard
              key={handCard.uid}
              cardId={handCard.cardId}
              game={displayGame}
              handCard={handCard}
              shiny={!!handCard.shiny}
              playable={myTurn && !busy && canPlayCard(displayGame, "player", index)}
              selected={selectedHandUid === handCard.uid}
              onClick={() => onHandClick(handCard, index)}
            />
          ))}
        </div>

        <div className="online-battle-actions">
          <button
            className="btn-primary"
            disabled={!myTurn || busy || hasPendingChoice}
            onClick={() => issue({ type: "end_turn" })}
          >
            턴 종료
          </button>
          <button
            className="btn-ghost small danger"
            disabled={busy || room.phase === "finished"}
            onClick={() => issue({ type: "surrender" })}
          >
            항복
          </button>
        </div>
      </div>

      {room.phase === "mulligan" && (
        <div className="online-mulligan-overlay">
          <div className="online-mulligan-box">
            <span className="online-state-label">MULLIGAN</span>
            <h2>교체할 카드를 선택하세요</h2>
            <p>
              {room.mulligan.me
                ? room.mulligan.opponent
                  ? "양쪽 준비 완료. 전투를 시작합니다."
                  : "내 선택 완료. 상대를 기다리는 중입니다."
                : "선택하지 않으면 현재 손패를 그대로 사용합니다."}
            </p>
            <div className="online-mulligan-cards">
              {my.hand.map((handCard) => (
                <div
                  key={handCard.uid}
                  className={mulliganSelected.includes(handCard.uid) ? "selected" : ""}
                  onClick={() => toggleMulligan(handCard.uid)}
                >
                  <HandCard
                    cardId={handCard.cardId}
                    handCard={handCard}
                    shiny={!!handCard.shiny}
                    playable={!room.mulligan.me && !busy}
                    selected={mulliganSelected.includes(handCard.uid)}
                  />
                  <span>{mulliganSelected.includes(handCard.uid) ? "교체" : "유지"}</span>
                </div>
              ))}
            </div>
            {!room.mulligan.me && (
              <button className="btn-primary" disabled={busy} onClick={submitMulligan}>
                {busy ? "확정 중..." : mulliganSelected.length ? `${mulliganSelected.length}장 교체` : "이 손패로 시작"}
              </button>
            )}
          </div>
        </div>
      )}

      <PendingChoiceOverlay game={displayGame} onChoose={choosePending} busy={busy} />

      {pending && (
        <div className="online-target-hint">
          특성 대상을 선택하세요
        </div>
      )}

      {room.phase === "finished" && displayGame.winner && (
        <div className="online-result-overlay">
          <div className="online-result-box">
            <span>ONLINE BATTLE</span>
            <h2>{displayGame.winner === "player" ? "승리" : "패배"}</h2>
            <button className="btn-primary" onClick={leaveRoom}>메인 메뉴</button>
          </div>
        </div>
      )}
    </div>
  );
}
