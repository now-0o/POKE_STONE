import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Battle from "./Battle.jsx";
import { HandCard } from "./Card.jsx";
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
  leaveMatchmakingKeepalive,
  sendOnlineCommand,
} from "../state/api.js";
import { playSfx } from "../audio.js";
import "../styles/online-battle.css";
import "../styles/online-battle-runtime.css";

const POLL_MS = 45;
const COMMAND_RETRY_MS = 30;
const COMMAND_RETRY_ATTEMPTS = 8;
const ACTIVE_CONFIRM_DELAY_MS = 12;
const ACTIVE_CONFIRM_ATTEMPTS = 10;
const TURN_LIMIT_MS = 60_000;
const MULLIGAN_OUT_MS = 260;
const MULLIGAN_IN_MS = 420;
const MULLIGAN_BATTLE_GRACE_MS = MULLIGAN_OUT_MS + MULLIGAN_IN_MS;
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

function roomRevision(room) {
  return Number.isInteger(room?.revision) ? room.revision : -1;
}

function startOnlineTurnClock(game, delayMs = 0) {
  const now = Date.now() + Math.max(0, delayMs || 0);
  game._onlineTurnStartedAt = now;
  game._onlineTurnDeadlineAt = now + TURN_LIMIT_MS;
}

function clearOnlineTurnClock(game) {
  game._onlineTurnStartedAt = null;
  game._onlineTurnDeadlineAt = null;
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
  clearOnlineTurnClock(game);
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
  const originalHand = [...(player.hand || [])];
  const returned = originalHand.filter((handCard) => chosen.has(handCard.uid));
  if (!returned.length) return true;

  player.hand = originalHand.filter((handCard) => !chosen.has(handCard.uid));
  player.deck = shuffleWithSeed(player.deck || [], `${seedText}:replace`);

  const replacementStart = player.hand.length;
  for (let i = 0; i < returned.length; i += 1) {
    battleRules.drawCard(game, side, true);
  }
  const replacements = player.hand.splice(replacementStart, returned.length);

  let replacementIndex = 0;
  player.hand = originalHand
    .map((handCard) =>
      chosen.has(handCard.uid)
        ? replacements[replacementIndex++] || null
        : handCard,
    )
    .filter(Boolean);

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

function endedBySurrender(game) {
  if (game?._onlineEndReason?.type === "surrender") return true;
  return (game?.log || [])
    .slice(-4)
    .some((line) => typeof line === "string" && line.includes("항복했다"));
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
      game.pendingBattlecry = null;
      game.pendingChoose = null;
      game.pendingWishmaker = null;
      game.pendingDeoxysForm = null;
      game.pendingShayminForm = null;
      battleRules.endTurn(game);
      if (!game.winner) startOnlineTurnClock(game);
      else clearOnlineTurnClock(game);
      return { ok: true };
    }

    if (payload.type === "surrender") {
      const loserName = game.players[side].name;
      game.winner = side === "player" ? "enemy" : "player";
      game._onlineEndReason = {
        type: "surrender",
        loserName,
      };
      clearOnlineTurnClock(game);
      game.log.push(`${loserName}이(가) 항복했다.`);
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
  const [sessionEnded, setSessionEnded] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [clockHost, setClockHost] = useState(null);
  const [mulliganSelected, setMulliganSelected] = useState([]);
  const [mulliganOldHand, setMulliganOldHand] = useState([]);
  const [mulliganStage, setMulliganStage] = useState("select");
  const [mulliganVisualDone, setMulliganVisualDone] = useState(false);

  const initializedRef = useRef(false);
  const processingCommandRef = useRef(null);
  const mountedRef = useRef(true);
  const sharedGameRef = useRef(null);
  const latestRef = useRef({ room: null });
  const issueRef = useRef(null);
  const busyRef = useRef(false);
  const syncedRevisionRef = useRef(-1);
  const timeoutDeadlineRef = useRef(null);
  const sessionEndedRef = useRef(false);
  const mulliganSubmittedRef = useRef(false);
  const mulliganSubmitAtRef = useRef(0);

  const displayGame = useMemo(
    () => localViewGame(room?.game, room?.mySide),
    [room?.game, room?.mySide],
  );

  if (displayGame) {
    const revision = roomRevision(room);
    if (!sharedGameRef.current) {
      sharedGameRef.current = cloneJson(displayGame);
      syncedRevisionRef.current = revision;
    } else if (revision > syncedRevisionRef.current) {
      syncGameObject(sharedGameRef.current, displayGame);
      syncedRevisionRef.current = revision;
    }
  }

  latestRef.current.room = room;

  function applyCommittedRoom(next) {
    if (!next || !mountedRef.current) return false;
    const current = latestRef.current.room;
    const nextRevision = roomRevision(next);
    const currentRevision = roomRevision(current);

    if (current && nextRevision <= currentRevision) return false;

    latestRef.current.room = next;
    setRoom(next);
    return true;
  }

  function resetMulliganSubmission() {
    mulliganSubmittedRef.current = false;
    mulliganSubmitAtRef.current = 0;
    setMulliganStage("select");
    setMulliganOldHand([]);
    setMulliganVisualDone(false);
  }

  function endDisconnectedSession(message = "상대가 웹을 닫았거나 전투방을 나갔습니다.") {
    if (sessionEndedRef.current) return;
    if (
      sharedGameRef.current?.winner ||
      latestRef.current.room?.phase === "finished"
    ) {
      return;
    }

    sessionEndedRef.current = true;
    busyRef.current = false;
    setBusy(false);
    setPendingCommand(null);
    setError("");
    setSessionEnded(message);
    unregisterOnlineBattleBridge(matchId);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handlePageExit = () => {
      leaveMatchmakingKeepalive();
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);
    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
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
          if (!cancelled) applyCommittedRoom(initialized);
        } else {
          const state = data.host
            ? await fetchOnlineHostState(matchId)
            : await fetchOnlineState(matchId);
          if (!cancelled) applyCommittedRoom(state);
        }
      } catch (err) {
        if (!cancelled) {
          if (err?.code === "match_not_found") {
            endDisconnectedSession("이전 온라인 배틀 연결이 종료되었습니다.");
          } else {
            setError(err.message || "온라인 전투방에 입장하지 못했습니다.");
          }
        }
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
    withOnlineBattleBridgeBypass(() => battleRules.cleanupDeaths(game));

    const result = withOnlineBattleBridgeBypass(() =>
      applyHostCommand(game, command, seed),
    );

    if (
      result.ok &&
      command.payload?.type === "mulligan" &&
      snapshot.phase === "mulligan"
    ) {
      const otherMulliganDone =
        command.side === snapshot.mySide
          ? !!snapshot.mulligan?.opponent
          : !!snapshot.mulligan?.me;
      if (otherMulliganDone) {
        startOnlineTurnClock(game, MULLIGAN_BATTLE_GRACE_MS);
      }
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
        const mulligan = { ...(snapshot.mulligan || {}) };
        if (result.ok && command.payload?.type === "mulligan") {
          if (command.side === snapshot.mySide) mulligan.me = true;
          else mulligan.opponent = true;
        }

        applyCommittedRoom({
          ...snapshot,
          game,
          phase: committed.phase,
          revision: committed.revision,
          mulligan,
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
        if (err?.code === "match_not_found") {
          endDisconnectedSession();
        } else {
          try {
            const refreshed = await fetchOnlineHostState(matchId);
            if (mountedRef.current) applyCommittedRoom(refreshed);
          } catch (refreshErr) {
            if (refreshErr?.code === "match_not_found") {
              endDisconnectedSession();
            }
          }
          if (!sessionEndedRef.current) {
            setError(err.message || "전투 행동 동기화에 실패했습니다.");
          }
        }
      }
    } finally {
      processingCommandRef.current = null;
    }
  }

  useEffect(() => {
    if (!matchId || !bootstrap || sessionEnded) return undefined;
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

        applyCommittedRoom(next);
        setError("");

        if (bootstrap.host && next.pendingCommand) {
          await processHostCommand(next, bootstrap.seed);
        }
      } catch (err) {
        if (!stopped) {
          if (err?.code === "match_not_found") {
            endDisconnectedSession();
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
  }, [matchId, bootstrap, sessionEnded]);

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
      if (mulliganSubmittedRef.current && mulliganStage === "leaving") {
        resetMulliganSubmission();
      }
      playSfx("buzzer");
    }

    setPendingCommand(null);
  }, [room?.revision, room?.lastCommand, pendingCommand, mulliganStage]);

  useEffect(() => {
    if (
      mulliganStage !== "leaving" ||
      !mulliganSubmittedRef.current ||
      !room?.mulligan?.me
    ) {
      return undefined;
    }

    const elapsed = Date.now() - mulliganSubmitAtRef.current;
    const delay = Math.max(0, MULLIGAN_OUT_MS - elapsed);
    const timer = window.setTimeout(() => setMulliganStage("entering"), delay);
    return () => window.clearTimeout(timer);
  }, [mulliganStage, room?.mulligan?.me, room?.revision]);

  useEffect(() => {
    if (mulliganStage !== "entering") return undefined;
    const timer = window.setTimeout(() => {
      setMulliganStage("done");
      setMulliganVisualDone(true);
    }, MULLIGAN_IN_MS);
    return () => window.clearTimeout(timer);
  }, [mulliganStage]);

  useEffect(() => {
    if (mulliganStage !== "leaving" || room?.mulligan?.me) return undefined;
    const timer = window.setTimeout(() => {
      if (!latestRef.current.room?.mulligan?.me) {
        resetMulliganSubmission();
        setError("멀리건 확정을 다시 시도해주세요.");
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [mulliganStage, room?.mulligan?.me]);

  useEffect(() => {
    if (!displayGame?.turn) return;

    document.body.dataset.battleTurn = displayGame.turn;
    window.dispatchEvent(
      new CustomEvent("battle-turn-change", {
        detail: { turn: displayGame.turn },
      }),
    );
  }, [room?.revision, displayGame?.turn]);

  const turnDeadline = Number(displayGame?._onlineTurnDeadlineAt) || 0;
  const remainingMs = turnDeadline ? Math.max(0, turnDeadline - clockNow) : 0;
  const turnSeconds = turnDeadline ? Math.max(0, Math.ceil(remainingMs / 1000)) : null;
  const showMulligan =
    room?.phase === "mulligan" ||
    (mulliganSubmittedRef.current && !mulliganVisualDone);

  useEffect(() => {
    if (room?.phase !== "battle" || !turnDeadline || sessionEnded) return undefined;
    setClockNow(Date.now());
    const timer = window.setInterval(() => setClockNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [room?.phase, turnDeadline, sessionEnded]);

  useEffect(() => {
    if (room?.phase !== "battle" || showMulligan || sessionEnded) {
      setClockHost(null);
      return undefined;
    }

    let frame = 0;
    let attempts = 0;
    const findHost = () => {
      const host = document.querySelector(
        `.battle[data-trainer="online-${matchId}"] > .mid-bar`,
      );
      if (host) {
        setClockHost(host);
        return;
      }
      attempts += 1;
      if (attempts < 20) frame = window.requestAnimationFrame(findHost);
    };

    frame = window.requestAnimationFrame(findHost);
    return () => window.cancelAnimationFrame(frame);
  }, [matchId, room?.phase, showMulligan, sessionEnded]);

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
      if (!mountedRef.current || !busyRef.current || sessionEndedRef.current) return;
      await sleep(ACTIVE_CONFIRM_DELAY_MS);

      try {
        const next = await fetchOnlineState(matchId);
        if (!mountedRef.current) return;
        applyCommittedRoom(next);
        setError("");

        if (
          next.lastCommand?.id === commandId ||
          next.revision > baseRevision
        ) {
          return;
        }
      } catch (err) {
        if (mountedRef.current && err?.code === "match_not_found") {
          endDisconnectedSession();
        }
        return;
      }
    }
  }

  async function issue(command) {
    if (busyRef.current || !matchId || sessionEndedRef.current) return false;

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
      if (command?.type === "mulligan") resetMulliganSubmission();
      if (err?.code === "match_not_found") {
        endDisconnectedSession();
      } else {
        setError(err.message || "행동을 서버로 보내지 못했습니다.");
        playSfx("buzzer");
      }
      return false;
    }
  }

  issueRef.current = issue;

  async function submitMulligan() {
    if (
      busyRef.current ||
      room?.mulligan?.me ||
      mulliganStage !== "select" ||
      !displayGame?.players?.player
    ) {
      return;
    }

    mulliganSubmittedRef.current = true;
    mulliganSubmitAtRef.current = Date.now();
    setMulliganOldHand(cloneJson(displayGame.players.player.hand || []));
    setMulliganVisualDone(false);
    setMulliganStage("leaving");

    const ok = await issue({
      type: "mulligan",
      cardUids: [...mulliganSelected],
    });
    if (ok) playSfx("click");
  }

  function toggleMulligan(uid) {
    if (busyRef.current || room?.mulligan?.me || mulliganStage !== "select") return;
    setMulliganSelected((current) =>
      current.includes(uid)
        ? current.filter((entry) => entry !== uid)
        : [...current, uid],
    );
    playSfx("click");
  }

  useEffect(() => {
    if (
      sessionEnded ||
      room?.phase !== "battle" ||
      displayGame?.turn !== "player" ||
      !turnDeadline ||
      turnDeadline > clockNow ||
      busyRef.current
    ) {
      return;
    }

    if (timeoutDeadlineRef.current === turnDeadline) return;
    timeoutDeadlineRef.current = turnDeadline;

    Promise.resolve(issueRef.current?.({ type: "end_turn" })).then((ok) => {
      if (!ok && mountedRef.current && !sessionEndedRef.current) {
        window.setTimeout(() => {
          if (sharedGameRef.current?._onlineTurnDeadlineAt === turnDeadline) {
            timeoutDeadlineRef.current = null;
            setClockNow(Date.now());
          }
        }, 250);
      }
    });
  }, [clockNow, turnDeadline, displayGame?.turn, room?.phase, sessionEnded]);

  if (matchId && sharedGameRef.current && !sessionEnded) {
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
        <strong>{sessionEnded ? "온라인 연결 종료" : "온라인 배틀 동기화 중"}</strong>
        <span>
          {sessionEnded || error || "전투 상태를 준비하고 있습니다."}
        </span>
        <button className="btn-secondary" onClick={leaveRoom}>
          메인 메뉴
        </button>
      </div>
    );
  }

  if (showMulligan) {
    const currentHand = displayGame.players.player.hand || [];
    const oldHand = mulliganOldHand.length ? mulliganOldHand : currentHand;
    const renderedHand = mulliganStage === "leaving" ? oldHand : currentHand;
    const selectedSet = new Set(mulliganSelected);
    const replacedSlots = new Set(
      oldHand
        .map((card, index) => (selectedSet.has(card.uid) ? index : null))
        .filter((index) => index !== null),
    );
    const waitingForOpponent = !!room.mulligan?.me && !room.mulligan?.opponent;

    return (
      <div className="online-mulligan-overlay stable-mulligan-overlay">
        <div className="online-mulligan-box stable-mulligan-box">
          <span className="online-state-label">MULLIGAN</span>
          <h2>
            {mulliganStage === "select"
              ? "교체할 카드를 선택하세요"
              : mulliganStage === "leaving"
                ? "선택한 카드를 덱으로 돌려보내는 중..."
                : mulliganStage === "entering"
                  ? "새 카드를 받는 중..."
                  : waitingForOpponent
                    ? "멀리건 완료"
                    : "배틀 준비 완료"}
          </h2>
          <p>
            {mulliganStage === "select"
              ? "카드를 눌러 교체 여부를 정한 뒤 확정하세요. 선택하지 않은 카드는 자리를 유지합니다."
              : waitingForOpponent && mulliganStage === "done"
                ? "상대의 선택을 기다리고 있습니다."
                : "카드 교체 연출이 끝난 뒤 배틀이 시작됩니다."}
          </p>

          <div className={`online-mulligan-cards stable-mulligan-cards stage-${mulliganStage}`}>
            {renderedHand.map((handCard, index) => {
              const originalCard = oldHand[index] || handCard;
              const selected =
                mulliganStage === "select" && selectedSet.has(handCard.uid);
              const replacedSlot = replacedSlots.has(index);
              const leaving = mulliganStage === "leaving" && replacedSlot;
              const entering = mulliganStage === "entering" && replacedSlot;

              return (
                <div
                  key={`mulligan-slot-${index}`}
                  className={[
                    "online-mulligan-slot",
                    selected ? "selected" : "",
                    leaving ? "is-leaving" : "",
                    entering ? "is-entering" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => toggleMulligan(handCard.uid)}
                >
                  <HandCard
                    cardId={handCard.cardId}
                    game={displayGame}
                    handCard={handCard}
                    playable={mulliganStage === "select" && !room.mulligan?.me && !busy}
                    selected={selected}
                    ghost={mulliganStage !== "select"}
                  />
                  <span>
                    {mulliganStage === "select"
                      ? selected
                        ? "교체"
                        : "유지"
                      : leaving
                        ? "교체 중"
                        : entering
                          ? "새 카드"
                          : "확정"}
                  </span>
                </div>
              );
            })}
          </div>

          {mulliganStage === "select" && !room.mulligan?.me && (
            <button className="btn-primary" disabled={busy} onClick={submitMulligan}>
              {busy
                ? "확정 중..."
                : mulliganSelected.length
                  ? `${mulliganSelected.length}장 교체`
                  : "이 손패로 시작"}
            </button>
          )}

          {(room.mulligan?.me || mulliganStage !== "select") && (
            <div className="stable-mulligan-status">
              {mulliganStage === "done" && waitingForOpponent
                ? "상대 선택 대기 중"
                : "카드 교체 처리 중"}
            </div>
          )}
        </div>
      </div>
    );
  }

  const enemy = displayGame.players.enemy;
  const surrenderResult = endedBySurrender(displayGame);
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

  const turnClock =
    clockHost && room.phase === "battle" && turnSeconds !== null && !sessionEnded
      ? createPortal(
          <div
            className={`online-turn-clock ${displayGame.turn === "player" ? "mine" : "theirs"} ${turnSeconds <= 10 ? "urgent" : ""}`}
            aria-label={`턴 제한시간 ${turnSeconds}초`}
          >
            <span>{displayGame.turn === "player" ? "내 턴" : "상대 턴"}</span>
            <strong>{turnSeconds}</strong>
          </div>,
          clockHost,
        )
      : null;

  return (
    <>
      <Battle
        key={`shared-online-${matchId}`}
        trainer={onlineTrainer}
        deck={bootstrap.playerDeck?.deck || []}
        deckShiny={bootstrap.playerDeck?.deckShiny || {}}
        onFinish={handleBattleFinish}
      />

      {turnClock}

      <div className={`online-sync-state online-sync-overlay ${error ? "error" : ""}`}>
        {error || (busy ? "행동 동기화 중" : "ONLINE")}
      </div>

      {sessionEnded && (
        <div className="online-session-ended-overlay">
          <div className="online-session-ended-box">
            <span>ONLINE SESSION CLOSED</span>
            <h2>연결 종료</h2>
            <p>{sessionEnded}</p>
            <button className="btn-primary" onClick={leaveRoom}>
              메인 메뉴
            </button>
          </div>
        </div>
      )}

      {room.phase === "finished" && displayGame.winner && (
        <div className="online-result-overlay">
          <div className="online-result-box">
            <span>ONLINE BATTLE</span>
            <h2>{displayGame.winner === "player" ? "승리" : "패배"}</h2>
            {surrenderResult && (
              <p className="online-result-reason">
                {displayGame.winner === "player"
                  ? "상대가 항복하여 승리했습니다."
                  : "항복하여 패배했습니다."}
              </p>
            )}
            <button className="btn-primary" onClick={leaveRoom}>
              메인 메뉴
            </button>
          </div>
        </div>
      )}
    </>
  );
}
