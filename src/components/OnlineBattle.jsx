import React, { useEffect, useMemo, useRef, useState } from "react";
import Battle from "./Battle.jsx";
import * as battleRules from "../engine/engine.js";
import {
  registerOnlineBattleBridge,
  unregisterOnlineBattleBridge,
  withOnlineBattleBridgeBypass,
} from "../engine/onlineBattleBridge.js";
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

const POLL_MS = 45;
const COMMAND_RETRY_MS = 30;
const COMMAND_RETRY_ATTEMPTS = 8;
const ACTIVE_CONFIRM_DELAY_MS = 12;
const ACTIVE_CONFIRM_ATTEMPTS = 10;
const DISCARD_REDRAW_SENTINEL = "__discard_redraw__";
const ONLINE_TRAINER_SPRITE = "ethan";

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function syncGameObject(target, source) {
  if (!source) return target;
  const next = cloneJson(source);
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, next);
  return target;
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
  if (view.lastAction?.targetSide) {
    view.lastAction.targetSide = remapSide(view.lastAction.targetSide);
  }
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
    battleRules.createGame(
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
    battleRules.drawCard(game, side, true);
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
  if (ability === "metronome") return battleRules.resolveMew(game, side, targetUid);
  if (ability === "spacialrend") {
    return battleRules.resolveSpacialRend(game, side, targetUid);
  }
  if (ability === "magmastorm") {
    return battleRules.resolveMagmaStorm(game, side, targetUid);
  }
  if (ability === "bravecharge_phione") {
    return battleRules.resolvePhioneBraveCharge(game, side, targetUid);
  }
  if (ability === "bravecharge_manaphy") {
    return battleRules.resolveManaphyBraveCharge(game, side, targetUid);
  }
  return battleRules.resolveMoldbreaker(game, side, targetUid);
}

function resolvePendingChoice(game, side, value) {
  if (game.pendingChoose?.side === side) {
    if (game.pendingChoose.effect === "hyperball") {
      return battleRules.resolveHyperball(game, side, value);
    }
    if (game.pendingChoose.effect === "uxie") {
      return battleRules.resolveUxie(game, side, value);
    }
  }
  if (game.pendingWishmaker?.side === side) {
    return battleRules.resolveWishmaker(game, side, value);
  }
  if (game.pendingDeoxysForm?.side === side) {
    return battleRules.resolveDeoxysForm(game, side, value);
  }
  if (game.pendingShayminForm?.side === side) {
    return battleRules.resolveShayminForm(game, side, value);
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

      if (payload.targetUid === DISCARD_REDRAW_SENTINEL) {
        const ok = battleRules.discardToDraw(game, side, handIdx);
        return { ok, error: ok ? null : "discard_redraw_rejected" };
      }

      const target = payload.targetUid ? { uid: payload.targetUid } : null;
      const ok = battleRules.playCard(
        game,
        side,
        handIdx,
        target,
        payload.fieldIndex ?? null,
      );
      return { ok, error: ok ? null : "card_play_rejected" };
    }

    if (payload.type === "attack") {
      const ok = battleRules.attack(game, side, payload.attackerUid, {
        uid: payload.targetUid,
      });
      return { ok, error: ok ? null : "attack_rejected" };
    }

    if (payload.type === "attack_obstacle") {
      const ok = battleRules.attackFieldObstacle(
        game,
        side,
        payload.attackerUid,
        payload.obstacleId,
      );
      return { ok, error: ok ? null : "obstacle_attack_rejected" };
    }

    if (payload.type === "discard_redraw") {
      const handIdx = game.players[side].hand.findIndex(
        (entry) => entry.uid === payload.handUid,
      );
      if (handIdx < 0) return { ok: false, error: "hand_card_not_found" };
      const ok = battleRules.discardToDraw(game, side, handIdx);
      return { ok, error: ok ? null : "discard_redraw_rejected" };
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
      battleRules.endTurn(game);
      return { ok: true };
    }

    if (payload.type === "surrender") {
      game.winner = side === "player" ? "enemy" : "player";
      game.log.push(`${game.players[side].name}이(가) 항복했다.`);
      return { ok: true };
    }
  } catch (err) {
    return { ok: false, error: err?.message || "engine_error" };
  }

  return { ok: false, error: "unknown_command" };
}

export default function OnlineBattle({ match, onBack }) {
  const matchId = match?.matchId;
  const [bootstrap, setBootstrap] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingCommand, setPendingCommand] = useState(null);

  const initializedRef = useRef(false);
  const processingCommandRef = useRef(null);
  const mountedRef = useRef(true);
  const sharedGameRef = useRef(null);
  const latestRef = useRef({ room: null });
  const issueRef = useRef(null);
  const busyRef = useRef(false);

  const displayGame = useMemo(
    () => localViewGame(room?.game, room?.mySide),
    [room?.game, room?.mySide],
  );

  if (displayGame) {
    if (!sharedGameRef.current) {
      sharedGameRef.current = cloneJson(displayGame);
    } else {
      syncGameObject(sharedGameRef.current, displayGame);
    }
  }

  latestRef.current = { room };

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
        if (!cancelled) {
          setError(err.message || "온라인 전투방에 입장하지 못했습니다.");
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  function rollbackOptimisticState() {
    const current = latestRef.current.room;
    if (!current?.game) return;
    setRoom({
      ...current,
      game: cloneJson(current.game),
    });
  }

  async function processHostCommand(snapshot, seed) {
    const command = snapshot?.pendingCommand;
    if (!command || !snapshot.game) return;
    if (processingCommandRef.current === command.id) return;
    processingCommandRef.current = command.id;

    const game = cloneJson(snapshot.game);
    const result = withOnlineBattleBridgeBypass(() =>
      applyHostCommand(game, command, seed),
    );
    const optimisticRoom = {
      ...snapshot,
      game,
      pendingCommand: command,
    };

    if (mountedRef.current) {
      setRoom(optimisticRoom);
      setError("");
    }

    try {
      const committed = await commitOnlineHostState(matchId, {
        commandId: command.id,
        baseRevision: snapshot.revision,
        game,
        ok: result.ok,
        error: result.error || null,
      });

      if (mountedRef.current) {
        setRoom({
          ...optimisticRoom,
          phase: committed.phase,
          revision: committed.revision,
          pendingCommand: null,
          lastCommand:
            command.side === snapshot.mySide
              ? {
                  id: command.id,
                  ok: result.ok,
                  error: result.error || null,
                  revision: committed.revision,
                }
              : null,
        });
        setError("");
      }
    } catch (err) {
      if (mountedRef.current) {
        try {
          const refreshed = await fetchOnlineHostState(matchId);
          if (mountedRef.current) setRoom(refreshed);
        } catch {
          // 다음 polling에서 다시 서버 권위 상태로 맞춘다.
        }
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
    if (!pendingCommand || !room) return;

    const matchingLast = room.lastCommand?.id === pendingCommand.id;
    const revisionAdvanced = room.revision > pendingCommand.baseRevision;
    if (!matchingLast && !revisionAdvanced) return;

    busyRef.current = false;
    setBusy(false);

    if (matchingLast && !room.lastCommand.ok) {
      setError(
        `행동이 처리되지 않았습니다: ${room.lastCommand.error || "invalid_action"}`,
      );
      playSfx("buzzer");
    }

    setPendingCommand(null);
  }, [room?.revision, room?.lastCommand, pendingCommand]);

  useEffect(() => {
    if (!displayGame?.turn) return;

    document.body.dataset.battleTurn = displayGame.turn;
    window.dispatchEvent(
      new CustomEvent("battle-turn-change", {
        detail: { turn: displayGame.turn },
      }),
    );
  }, [room?.revision, displayGame?.turn]);

  async function sendWithRetry(command) {
    let lastError = null;

    for (let attempt = 0; attempt < COMMAND_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await sendOnlineCommand(matchId, command);
      } catch (err) {
        lastError = err;
        if (err?.code !== "command_busy" || attempt === COMMAND_RETRY_ATTEMPTS - 1) {
          throw err;
        }
        await sleep(COMMAND_RETRY_MS);
      }
    }

    throw lastError || new Error("온라인 행동 전송에 실패했습니다.");
  }

  async function confirmOwnCommand(commandId, baseRevision) {
    for (let attempt = 0; attempt < ACTIVE_CONFIRM_ATTEMPTS; attempt += 1) {
      if (!mountedRef.current || !busyRef.current) return;
      await sleep(ACTIVE_CONFIRM_DELAY_MS);

      try {
        const next = await fetchOnlineState(matchId);
        if (!mountedRef.current) return;
        setRoom(next);
        setError("");

        if (
          next.lastCommand?.id === commandId ||
          next.revision > baseRevision
        ) {
          return;
        }
      } catch (err) {
        if (mountedRef.current && err?.code === "match_not_found") {
          setError("상대가 전투방을 나갔거나 세션이 종료되었습니다.");
        }
        return;
      }
    }
  }

  async function issue(command) {
    if (busyRef.current || !matchId) return false;

    busyRef.current = true;
    setBusy(true);
    setError("");

    try {
      const result = await sendWithRetry(command);
      setPendingCommand({
        id: result.commandId,
        baseRevision: result.revision,
      });

      if (bootstrap?.host) {
        const current = latestRef.current.room;
        if (current?.game) {
          await processHostCommand(
            {
              ...current,
              revision: result.revision,
              pendingCommand: {
                id: result.commandId,
                side: current.mySide,
                payload: command,
                baseRevision: result.revision,
              },
            },
            bootstrap.seed,
          );
        }
      } else {
        void confirmOwnCommand(result.commandId, result.revision);
      }

      return true;
    } catch (err) {
      busyRef.current = false;
      setBusy(false);
      setPendingCommand(null);
      rollbackOptimisticState();
      setError(err.message || "행동을 서버로 보내지 못했습니다.");
      playSfx("buzzer");
      return false;
    }
  }

  issueRef.current = issue;

  if (matchId && sharedGameRef.current) {
    registerOnlineBattleBridge(matchId, {
      getGame: () => sharedGameRef.current,
      canAct: () =>
        latestRef.current.room?.phase === "battle" && !busyRef.current,
      dispatch: (command) => issueRef.current?.(command),
    });
  }

  useEffect(
    () => () => {
      unregisterOnlineBattleBridge(matchId);
      delete document.body.dataset.battleTurn;
    },
    [matchId],
  );

  async function leaveRoom() {
    unregisterOnlineBattleBridge(matchId);
    try {
      await leaveMatchmaking();
    } catch {
      // 이미 종료된 세션이면 메인 이동은 계속한다.
    }
    onBack();
  }

  async function handleBattleFinish(result) {
    if (sharedGameRef.current?.winner || room?.phase === "finished") {
      await leaveRoom();
      return;
    }

    if (result === "enemy") {
      const ok = await issue({ type: "surrender" });
      if (ok) playSfx("click");
    }
  }

  if (!bootstrap || !room || !displayGame || !sharedGameRef.current) {
    return (
      <div className="online-battle-loading">
        <strong>온라인 배틀 동기화 중</strong>
        <span>{error || "전투 상태를 준비하고 있습니다."}</span>
        <button className="btn-secondary" onClick={leaveRoom}>
          메인 메뉴
        </button>
      </div>
    );
  }

  const enemy = displayGame.players.enemy;
  const onlineTrainer = {
    id: `online-${matchId}`,
    matchId,
    onlineBattle: true,
    name: enemy.name || bootstrap.enemyDeck?.username || room.opponent?.username || "상대",
    sprite: ONLINE_TRAINER_SPRITE,
    emoji: "⚔️",
    hp: enemy.maxHp || 40,
    reward: 0,
    deck: [...(bootstrap.enemyDeck?.deck || [])],
    region: "kanto",
    gymType: "",
    introLines: ["온라인 배틀, 시작한다!"],
    winLines: ["좋은 승부였다!"],
    loseLines: ["좋은 승부였다!"],
  };

  return (
    <>
      <Battle
        key={`shared-online-${matchId}`}
        trainer={onlineTrainer}
        deck={bootstrap.playerDeck?.deck || []}
        deckShiny={bootstrap.playerDeck?.deckShiny || {}}
        onFinish={handleBattleFinish}
      />

      <div className={`online-sync-state online-sync-overlay ${error ? "error" : ""}`}>
        {error || (busy ? "행동 동기화 중" : "ONLINE")}
      </div>

      {room.phase === "finished" && displayGame.winner && (
        <div className="online-result-overlay">
          <div className="online-result-box">
            <span>ONLINE BATTLE</span>
            <h2>{displayGame.winner === "player" ? "승리" : "패배"}</h2>
            <button className="btn-primary" onClick={leaveRoom}>
              메인 메뉴
            </button>
          </div>
        </div>
      )}
    </>
  );
}
