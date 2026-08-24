import React from "react";
import { createRoot } from "react-dom/client";
import {
  CARD_MAP,
  SAND_IMMUNE_TYPES,
  spriteUrl,
} from "../../data/cards.js";
import {
  calcTypedDamage,
  effectiveAtk,
  effectiveCost,
} from "../../engine/engine.js";
import { HandCard } from "../../components/Card.jsx";
import "./battle-history-v2.css";

const MAX_STORED = 60;
const WEATHER_CARD = {
  rain: "raindance",
  sun: "sunnyday",
  sand: "sandstorm",
  hail: "hail",
};

let mountedBoard = null;
let previousLines = [];
let previousSnapshots = new Map();
let entries = [];
let sequence = 0;
let mobileOpen = false;
let syncing = false;
let inspectHost = null;
let inspectRoot = null;

function getGame() {
  return window.__pokeBattleGame || window.__pokeNState?.game || null;
}

function cards() {
  return Object.values(CARD_MAP)
    .filter((card) => card?.id && card?.name)
    .sort((a, b) => b.name.length - a.name.length);
}

function pokemonCards() {
  return cards().filter((card) => card.kind === "pokemon");
}

function cardByName(name) {
  const text = String(name || "").trim();
  return cards().find((card) => card.name === text) || null;
}

function pokemonByDisplayName(name) {
  const text = String(name || "").trim();
  return (
    pokemonCards().find((card) => card.name === text) ||
    pokemonCards().find((card) => text.endsWith(card.name)) ||
    null
  );
}

function mentionedPokemon(message, excludeIds = []) {
  const excluded = new Set(excludeIds.filter(Boolean));
  const found = [];
  for (const card of pokemonCards()) {
    if (excluded.has(card.id)) continue;
    const index = message.indexOf(card.name);
    if (index >= 0) found.push({ card, index });
  }
  found.sort((a, b) => a.index - b.index || b.card.name.length - a.card.name.length);
  const seen = new Set();
  return found
    .filter(({ card }) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    })
    .map(({ card }) => card);
}

function readLines(board) {
  const game = getGame();
  if (Array.isArray(game?.log)) {
    return game.log.map((line) => String(line || "").trim()).filter(Boolean);
  }
  const log = board?.querySelector(".mid-bar .battle-log");
  if (!log) return [];
  return [...log.children]
    .map((node) => node.textContent?.trim() || "")
    .filter(Boolean);
}

function suffixPrefixOverlap(before, after) {
  const max = Math.min(before.length, after.length);
  for (let size = max; size > 0; size -= 1) {
    let same = true;
    for (let i = 0; i < size; i += 1) {
      if (before[before.length - size + i] !== after[i]) {
        same = false;
        break;
      }
    }
    if (same) return size;
  }
  return 0;
}

function cloneUnit(unit, game, side) {
  if (!unit) return null;
  let atk = unit.atk;
  try {
    atk = effectiveAtk(unit, game);
  } catch {
    atk = unit.atk;
  }
  return {
    uid: unit.uid,
    cardId: unit.cardId,
    side,
    name: unit.name,
    type: unit.type,
    atk,
    baseAtk: unit.baseAtk,
    hp: Math.max(0, Number(unit.hp) || 0),
    maxHp: Math.max(0, Number(unit.maxHp) || 0),
    ability: unit.ability || null,
    secondaryAbility: unit.secondaryAbility || null,
    shiny: !!unit.shiny,
    mega: !!unit.mega,
    megaSpriteId: unit.megaSpriteId || null,
    item: unit.item || null,
    status: unit.status || null,
  };
}

function snapshotCost(card, game, side) {
  if (!card) return null;
  try {
    return effectiveCost(card, game, side);
  } catch {
    return card.cost;
  }
}

function collectSnapshots(game) {
  const map = new Map();
  if (!game?.players) return map;
  for (const side of ["player", "enemy"]) {
    const player = game.players[side];
    (player?.field || []).forEach((unit, fieldIndex) => {
      const card = CARD_MAP[unit.cardId];
      map.set(unit.uid, {
        uid: unit.uid,
        side,
        fieldIndex,
        cardId: unit.cardId,
        cost: snapshotCost(card, game, side),
        unit: cloneUnit(unit, game, side),
      });
    });
  }
  return map;
}

function copySnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    ...snapshot,
    unit: snapshot.unit ? { ...snapshot.unit } : null,
  };
}

function snapshotsForSide(map, side) {
  return [...map.values()]
    .filter((snapshot) => snapshot.side === side)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
}

function findSnapshotByCard(map, card, side = null) {
  if (!card) return null;
  return (
    [...map.values()].find(
      (snapshot) => snapshot.cardId === card.id && (!side || snapshot.side === side),
    ) || null
  );
}

function findSnapshotByDisplayName(map, name, side = null) {
  const card = pokemonByDisplayName(name);
  if (!card) return null;
  const candidates = [...map.values()].filter(
    (snapshot) => snapshot.cardId === card.id && (!side || snapshot.side === side),
  );
  return (
    candidates.find((snapshot) => snapshot.unit?.name === name) ||
    candidates[0] ||
    null
  );
}

function inferSide(board, message, sourceCard, oldSnapshots, currentSnapshots) {
  if (sourceCard?.kind === "pokemon") {
    const oldMatches = [...oldSnapshots.values()].filter((s) => s.cardId === sourceCard.id);
    const currentMatches = [...currentSnapshots.values()].filter((s) => s.cardId === sourceCard.id);
    const combined = [...currentMatches, ...oldMatches];
    if (combined.length === 1) return combined[0].side;
  }

  const enemyName = board.querySelector(".enemy-hero-cluster .hero-name")?.textContent?.trim();
  const playerName = board.querySelector(".my-hero-cluster .hero-name")?.textContent?.trim() || "나";
  if (playerName && (message.startsWith(playerName) || message.includes(`${playerName}의`))) {
    return "player";
  }
  if (enemyName && message.startsWith(enemyName)) return "enemy";
  return document.body.dataset.battleTurn === "enemy" ? "enemy" : "player";
}

function heroSnapshot(board, side) {
  const selector = side === "enemy" ? ".enemy-hero-cluster" : ".my-hero-cluster";
  const cluster = board.querySelector(selector);
  if (!cluster) return null;
  const image = cluster.querySelector(".trainer-sprite, img");
  return {
    side,
    name:
      cluster.querySelector(".hero-name")?.textContent?.trim() ||
      (side === "enemy" ? "상대 트레이너" : "플레이어"),
    spriteUrl: image?.currentSrc || image?.src || null,
  };
}

function findUsedCard(message) {
  return (
    cards().find((card) => message.startsWith(`${card.name}!`)) ||
    cards().find((card) => message.includes(`${card.name}을(를) 사용했다!`)) ||
    null
  );
}

function parseDamage(message) {
  const match = message.match(/피해(?:를|가)?\s*(\d+)/);
  return match ? Number(match[1]) || 0 : 0;
}

function isAoeTechnique(card) {
  const effect = card?.spell?.effect;
  const target = card?.spell?.target;
  return (
    target === "enemy-board" ||
    effect === "aoe" ||
    effect === "aoe_status" ||
    effect === "aoe_self_debuff" ||
    effect === "all_field_damage"
  );
}

function parsePrimaryAction(board, message, oldSnapshots, currentSnapshots) {
  const summon = message.match(/^(.+?)이\(가\)\s+(.+?)을\(를\)\s+냈다!/);
  if (summon) {
    const sourceCard = cardByName(summon[2]);
    if (sourceCard?.kind === "pokemon") {
      return {
        type: "summon",
        sourceCard,
        side: inferSide(board, message, sourceCard, oldSnapshots, currentSnapshots),
        message,
      };
    }
  }

  const itemEquip = message.match(/^(.+?)에게\s+(.+?)을\(를\)\s+장착했다!/);
  if (itemEquip) {
    const sourceCard = cardByName(itemEquip[2]);
    const targetCard = pokemonByDisplayName(itemEquip[1]);
    if (sourceCard && (sourceCard.kind === "item" || sourceCard.type === "도구")) {
      const side = inferSide(board, message, sourceCard, oldSnapshots, currentSnapshots);
      return { type: "item", sourceCard, targetCard, side, message };
    }
  }

  const unitAttack = message.match(
    /^(.+?)\s*➜\s*(.+?)\s+공격!\s*피해\s*(\d+)\s*,\s*반격\s*(\d+)/,
  );
  if (unitAttack) {
    const sourceCard = pokemonByDisplayName(unitAttack[1]);
    const targetCard = pokemonByDisplayName(unitAttack[2]);
    if (sourceCard && targetCard) {
      const sourceSnapshot =
        findSnapshotByDisplayName(oldSnapshots, unitAttack[1]) ||
        findSnapshotByDisplayName(currentSnapshots, unitAttack[1]);
      return {
        type: "attack",
        sourceCard,
        targetCard,
        sourceName: unitAttack[1],
        targetName: unitAttack[2],
        side:
          sourceSnapshot?.side ||
          inferSide(board, message, sourceCard, oldSnapshots, currentSnapshots),
        damage: Number(unitAttack[3]) || 0,
        retaliation: Number(unitAttack[4]) || 0,
        message,
      };
    }
  }

  const heroAttack = message.match(
    /^(.+?)이\(가\)\s+(.+?)을\(를\)\s+직접\s+공격!\s*피해\s*(\d+)!?/,
  );
  if (heroAttack) {
    const sourceCard = pokemonByDisplayName(heroAttack[1]);
    if (sourceCard) {
      const sourceSnapshot =
        findSnapshotByDisplayName(oldSnapshots, heroAttack[1]) ||
        findSnapshotByDisplayName(currentSnapshots, heroAttack[1]);
      const side =
        sourceSnapshot?.side ||
        inferSide(board, message, sourceCard, oldSnapshots, currentSnapshots);
      return {
        type: "attack",
        sourceCard,
        sourceName: heroAttack[1],
        side,
        targetHero: heroSnapshot(board, side === "player" ? "enemy" : "player"),
        damage: Number(heroAttack[3]) || 0,
        retaliation: 0,
        message,
      };
    }
  }

  const usedCard = findUsedCard(message);
  if (usedCard) {
    const isItem = usedCard.kind === "item" || usedCard.type === "도구";
    const isTechnique = usedCard.kind === "spell" && usedCard.type === "기술";
    if (isItem || isTechnique) {
      const targets = mentionedPokemon(message, [usedCard.id]);
      return {
        type: isItem ? "item" : "technique",
        sourceCard: usedCard,
        targetCard: targets[0] || null,
        side: inferSide(board, message, usedCard, oldSnapshots, currentSnapshots),
        damage: parseDamage(message),
        isAoe: isTechnique && isAoeTechnique(usedCard),
        message,
      };
    }
  }

  return null;
}

function parseAbilityAction(board, message, oldSnapshots, currentSnapshots) {
  const match = message.match(/^(.+?)의\s+([^!]+)!/);
  if (!match) return null;
  const sourceName = match[1].trim();
  const abilityName = match[2].trim();
  const sourceCard = pokemonByDisplayName(sourceName);
  if (!sourceCard) return null;
  const sourceSnapshot =
    findSnapshotByDisplayName(oldSnapshots, sourceName) ||
    findSnapshotByDisplayName(currentSnapshots, sourceName);
  return {
    type: "ability",
    sourceCard,
    sourceName,
    abilityName,
    side:
      sourceSnapshot?.side ||
      inferSide(board, message, sourceCard, oldSnapshots, currentSnapshots),
    message,
  };
}

function weatherSpec(message) {
  if (message === "모래바람이 몰아친다!") {
    return { weather: "sand", label: "모래바람", cardId: WEATHER_CARD.sand };
  }
  if (message === "싸라기눈이 몰아친다!") {
    return { weather: "hail", label: "싸라기눈", cardId: WEATHER_CARD.hail };
  }
  return null;
}

function weatherImmune(snapshot, weather) {
  const unit = snapshot?.unit;
  if (!unit || unit.hp <= 0) return true;
  if (unit.ability === "overcoat" || unit.secondaryAbility === "overcoat") return true;
  if (weather === "sand") return SAND_IMMUNE_TYPES.includes(unit.type);
  if (weather === "hail") return unit.type === "얼음";
  return true;
}

function syntheticHpSnapshot(before, delta) {
  const snapshot = copySnapshot(before);
  if (!snapshot?.unit) return snapshot;
  snapshot.unit.hp = Math.max(0, Math.min(snapshot.unit.maxHp, snapshot.unit.hp + delta));
  return snapshot;
}

function makeTarget(before, after, amountOverride = null, healOverride = null) {
  const beforeHp = before?.unit?.hp ?? 0;
  const afterHp = after?.unit?.hp ?? 0;
  const damage = amountOverride ?? Math.max(0, beforeHp - afterHp);
  const heal = healOverride ?? Math.max(0, afterHp - beforeHp);
  return {
    card: CARD_MAP[(after || before)?.cardId] || null,
    snapshot: copySnapshot(after || before),
    fainted: !after || afterHp <= 0,
    damage,
    heal,
  };
}

function weatherActionFromLine(message, oldSnapshots, linesBefore) {
  const spec = weatherSpec(message);
  if (!spec) return null;
  const targets = [];
  for (const before of oldSnapshots.values()) {
    if (weatherImmune(before, spec.weather)) continue;
    const name = before.unit?.name || CARD_MAP[before.cardId]?.name;
    if (
      name &&
      linesBefore.some(
        (line) => line.includes(name) && /(기절했다|기절!|쓰러졌다|쓰러졌다!)/.test(line),
      )
    ) {
      continue;
    }
    const damage =
      spec.weather === "hail"
        ? calcTypedDamage(1, "얼음", before.unit?.type || CARD_MAP[before.cardId]?.type)
        : 1;
    const after = syntheticHpSnapshot(before, -damage);
    targets.push(makeTarget(before, after, damage, 0));
  }
  return {
    type: "weather",
    weather: spec.weather,
    weatherLabel: spec.label,
    sourceCard: CARD_MAP[spec.cardId] || null,
    side: "neutral",
    targets,
    message,
  };
}

function preferredUids(game, action) {
  const last = game?.lastAction;
  if (!last) return {};
  if (action.type === "attack" && last.kind === "attack") {
    return {
      sourceUid: last.uid || null,
      targetUid: last.targetUid && last.targetUid !== "hero" ? last.targetUid : null,
    };
  }
  if (["summon", "technique", "item"].includes(action.type) && last.kind === "play") {
    if (last.cardId === action.sourceCard?.id) {
      return {
        sourceUid: last.uid || null,
        targetUid: last.targetUid && last.targetUid !== "hero" ? last.targetUid : null,
      };
    }
  }
  return {};
}

function resolveSourceSnapshot(action, game, oldSnapshots, currentSnapshots) {
  const { sourceUid } = preferredUids(game, action);
  if (sourceUid) {
    return copySnapshot(currentSnapshots.get(sourceUid) || oldSnapshots.get(sourceUid));
  }
  if (action.sourceName) {
    return copySnapshot(
      findSnapshotByDisplayName(currentSnapshots, action.sourceName, action.side) ||
        findSnapshotByDisplayName(oldSnapshots, action.sourceName, action.side),
    );
  }
  return copySnapshot(
    findSnapshotByCard(currentSnapshots, action.sourceCard, action.side) ||
      findSnapshotByCard(oldSnapshots, action.sourceCard, action.side),
  );
}

function targetSideForAction(action) {
  if (action.type === "item") return action.side;
  return action.side === "player" ? "enemy" : "player";
}

function aoeTargets(action, oldSnapshots, currentSnapshots) {
  const effect = action.sourceCard?.spell?.effect;
  const sides =
    effect === "all_field_damage"
      ? ["player", "enemy"]
      : [action.side === "player" ? "enemy" : "player"];
  const targets = [];
  for (const side of sides) {
    for (const before of snapshotsForSide(oldSnapshots, side)) {
      const after = currentSnapshots.get(before.uid) || null;
      targets.push(makeTarget(before, after));
    }
  }
  return targets;
}

function singleTarget(action, game, oldSnapshots, currentSnapshots) {
  if (!action.targetCard) return [];
  const { targetUid } = preferredUids(game, action);
  const side = targetSideForAction(action);
  const before =
    (targetUid ? oldSnapshots.get(targetUid) : null) ||
    (action.targetName ? findSnapshotByDisplayName(oldSnapshots, action.targetName, side) : null) ||
    findSnapshotByCard(oldSnapshots, action.targetCard, side);
  const after =
    (targetUid ? currentSnapshots.get(targetUid) : null) ||
    (action.targetName ? findSnapshotByDisplayName(currentSnapshots, action.targetName, side) : null) ||
    findSnapshotByCard(currentSnapshots, action.targetCard, side);
  if (!before && !after) return [];
  return [makeTarget(before || after, after || null, action.damage || null)];
}

function abilityTargets(action, oldSnapshots, currentSnapshots) {
  const sourceBefore =
    findSnapshotByDisplayName(oldSnapshots, action.sourceName, action.side) ||
    findSnapshotByCard(oldSnapshots, action.sourceCard, action.side);
  const sourceAfter =
    (sourceBefore ? currentSnapshots.get(sourceBefore.uid) : null) ||
    findSnapshotByDisplayName(currentSnapshots, action.sourceName, action.side) ||
    findSnapshotByCard(currentSnapshots, action.sourceCard, action.side);

  if (action.abilityName === "재생력" && sourceBefore) {
    const healed = Math.min(1, Math.max(0, sourceBefore.unit.maxHp - sourceBefore.unit.hp));
    const after = syntheticHpSnapshot(sourceBefore, healed);
    return healed > 0 ? [makeTarget(sourceBefore, after, 0, healed)] : [];
  }

  if (action.abilityName === "치유의마음" && sourceBefore) {
    const allies = snapshotsForSide(oldSnapshots, action.side);
    return allies
      .filter(
        (snapshot) =>
          Math.abs(snapshot.fieldIndex - sourceBefore.fieldIndex) === 1 &&
          snapshot.unit?.hp > 0 &&
          snapshot.unit.hp < snapshot.unit.maxHp,
      )
      .map((before) => {
        const after = syntheticHpSnapshot(before, 1);
        return makeTarget(before, after, 0, 1);
      });
  }

  const named = mentionedPokemon(action.message, [action.sourceCard?.id]);
  const targets = [];
  for (const card of named) {
    const before =
      findSnapshotByCard(oldSnapshots, card) || findSnapshotByCard(currentSnapshots, card);
    if (!before) continue;
    const after = currentSnapshots.get(before.uid) || null;
    targets.push(makeTarget(before, after));
  }

  if (!targets.length && /회복/.test(action.message) && sourceBefore) {
    const after = sourceAfter || sourceBefore;
    const heal = Math.max(0, (after.unit?.hp || 0) - (sourceBefore.unit?.hp || 0));
    if (heal > 0) targets.push(makeTarget(sourceBefore, after, 0, heal));
  }

  return targets;
}

function enrichAction(action, game, oldSnapshots, currentSnapshots) {
  if (action.type === "weather") return action;
  const sourceSnapshot =
    action.sourceCard?.kind === "pokemon"
      ? resolveSourceSnapshot(action, game, oldSnapshots, currentSnapshots)
      : null;
  let targets = [];
  if (action.type === "ability") {
    targets = abilityTargets(action, oldSnapshots, currentSnapshots);
  } else if (action.isAoe) {
    targets = aoeTargets(action, oldSnapshots, currentSnapshots);
  } else {
    targets = singleTarget(action, game, oldSnapshots, currentSnapshots);
  }
  return {
    ...action,
    sourceSnapshot,
    sourceFainted: sourceSnapshot?.unit?.hp <= 0,
    targets,
  };
}

function typeLabel(entry) {
  if (entry.type === "summon") return "포켓몬 소환";
  if (entry.type === "technique") return "기술 사용";
  if (entry.type === "attack") return "공격";
  if (entry.type === "item") return "도구 사용";
  if (entry.type === "weather") return entry.weatherLabel || "날씨 피해";
  if (entry.type === "ability") return entry.abilityName || "특성 발동";
  return "전투 기록";
}

function targetScale(count) {
  if (count <= 1) return 1.42;
  if (count === 2) return 1.16;
  if (count === 3) return 0.96;
  if (count === 4) return 0.82;
  if (count <= 6) return 0.7;
  if (count <= 8) return 0.6;
  return 0.52;
}

function sourceScale(count) {
  if (count <= 2) return 1.42;
  if (count <= 4) return 1.24;
  if (count <= 6) return 1.08;
  return 0.94;
}

function targetColumns(count) {
  if (count <= 3) return Math.max(1, count);
  if (count <= 6) return 3;
  if (count <= 8) return 4;
  return 6;
}

function handCardElement(card, snapshot) {
  if (!card?.id) return null;
  const shownCost = Number.isFinite(snapshot?.cost) ? snapshot.cost : card.cost;
  const costReduction = Number(card.cost) - Number(shownCost);
  return React.createElement(HandCard, {
    cardId: card.id,
    playable: true,
    ghost: true,
    unit: snapshot?.unit || undefined,
    handCard: costReduction ? { costReduction } : undefined,
  });
}

function cardSlot(card, snapshot, options = {}) {
  if (!card) return null;
  const scale = options.scale || 1;
  const style = {
    width: `${134 * scale}px`,
    height: `${188 * scale}px`,
  };
  const innerStyle = { transform: `scale(${scale})` };
  const badge = options.damage > 0
    ? `피해 ${options.damage}`
    : options.heal > 0
      ? `회복 ${options.heal}`
      : null;
  return React.createElement(
    "div",
    { className: "battle-history-v2-card-slot", style, key: options.key },
    React.createElement(
      "div",
      {
        className: `battle-history-v2-card-inner ${options.fainted ? "is-fainted" : ""}`,
        style: innerStyle,
      },
      handCardElement(card, snapshot),
      badge
        ? React.createElement(
            "div",
            {
              className: `battle-history-v2-impact ${options.heal > 0 ? "is-heal" : "is-damage"}`,
            },
            badge,
          )
        : null,
      options.fainted
        ? React.createElement("div", { className: "battle-history-v2-fainted" }, "기절")
        : null,
    ),
  );
}

function trainerSlot(hero, scale = 1) {
  if (!hero) return null;
  return React.createElement(
    "div",
    {
      className: "battle-history-v2-trainer",
      style: {
        width: `${150 * scale}px`,
        height: `${190 * scale}px`,
      },
    },
    hero.spriteUrl
      ? React.createElement("img", { src: hero.spriteUrl, alt: hero.name, draggable: false })
      : null,
    React.createElement("strong", null, hero.name),
  );
}

function inspectView(entry) {
  const targets = entry.targets || [];
  const count = targets.length;
  const tScale = targetScale(count);
  const sScale = sourceScale(count);
  const source = entry.sourceCard
    ? cardSlot(entry.sourceCard, entry.sourceSnapshot, {
        scale: sScale,
        fainted: entry.sourceFainted,
        key: "source",
      })
    : null;

  const targetCards = targets.map((target, index) =>
    cardSlot(target.card, target.snapshot, {
      scale: tScale,
      fainted: target.fainted,
      damage: target.damage,
      heal: target.heal,
      key: `${target.snapshot?.uid || target.card?.id || "target"}-${index}`,
    }),
  );

  if (!count && entry.targetHero) {
    targetCards.push(trainerSlot(entry.targetHero, 1.2));
  }

  const hasTargets = targetCards.length > 0;
  const bridgeText =
    entry.type === "ability"
      ? entry.abilityName
      : entry.type === "weather"
        ? entry.weatherLabel
        : count > 1
          ? `대상 ${count}`
          : null;

  return React.createElement(
    "div",
    { className: "battle-history-v2-inspect", "aria-label": typeLabel(entry) },
    source,
    hasTargets
      ? React.createElement(
          "div",
          { className: "battle-history-v2-bridge" },
          React.createElement("span", { className: "battle-history-v2-arrow" }, "→"),
          bridgeText ? React.createElement("strong", null, bridgeText) : null,
          entry.damage > 0 && count <= 1
            ? React.createElement("em", null, `피해 ${entry.damage}`)
            : null,
          entry.retaliation > 0
            ? React.createElement("em", null, `반격 ${entry.retaliation}`)
            : null,
        )
      : entry.type === "ability"
        ? React.createElement(
            "div",
            { className: "battle-history-v2-ability-label" },
            entry.abilityName,
          )
        : null,
    hasTargets
      ? React.createElement(
          "div",
          {
            className: "battle-history-v2-target-grid",
            style: { gridTemplateColumns: `repeat(${targetColumns(targetCards.length)}, max-content)` },
          },
          ...targetCards,
        )
      : null,
  );
}

function hideInspect() {
  if (inspectRoot) {
    inspectRoot.unmount();
    inspectRoot = null;
  }
  if (inspectHost) {
    inspectHost.remove();
    inspectHost = null;
  }
}

function showInspect(entry, coarse = false) {
  hideInspect();
  if (!entry) return;
  const host = document.createElement("div");
  host.className = `inspect-overlay battle-history-v2-overlay ${coarse ? "is-coarse" : ""}`;
  if (coarse) host.addEventListener("click", hideInspect, { once: true });
  document.body.appendChild(host);
  inspectHost = host;
  inspectRoot = createRoot(host);
  inspectRoot.render(inspectView(entry));
}

function railIcon(entry) {
  const wrap = document.createElement("span");
  wrap.className = "battle-history-portrait";
  const card = entry.sourceCard;
  const url = card?.id ? spriteUrl(card.id) : null;
  if (url) {
    const img = document.createElement("img");
    img.alt = card?.name || typeLabel(entry);
    img.draggable = false;
    img.src = url;
    img.addEventListener(
      "error",
      () => {
        img.remove();
        wrap.textContent = (card?.name || typeLabel(entry)).slice(0, 1);
      },
      { once: true },
    );
    wrap.appendChild(img);
  } else {
    wrap.textContent = (card?.name || typeLabel(entry)).slice(0, 1);
  }
  return wrap;
}

function entryNode(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `battle-history-entry is-${entry.side} event-${entry.type}`;
  button.setAttribute("aria-label", `${typeLabel(entry)}: ${entry.message || ""}`);
  button.appendChild(railIcon(entry));
  button.addEventListener("mouseenter", () => {
    if (!window.matchMedia?.("(pointer: coarse)").matches) showInspect(entry, false);
  });
  button.addEventListener("mouseleave", () => {
    if (!window.matchMedia?.("(pointer: coarse)").matches) hideInspect();
  });
  button.addEventListener("focus", () => showInspect(entry, false));
  button.addEventListener("blur", hideInspect);
  button.addEventListener("click", () => {
    if (window.matchMedia?.("(pointer: coarse)").matches) showInspect(entry, true);
  });
  return button;
}

function shellFor(board) {
  let shell = board.querySelector(":scope > .battle-history-shell");
  if (shell) return shell;
  shell = document.createElement("aside");
  shell.className = "battle-history-shell";
  shell.setAttribute("aria-label", "전투 기록");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "battle-history-toggle";
  toggle.textContent = "전투 기록";
  toggle.addEventListener("click", () => {
    mobileOpen = !mobileOpen;
    renderHistory(board);
  });
  shell.appendChild(toggle);

  const panel = document.createElement("div");
  panel.className = "battle-history-panel";
  shell.appendChild(panel);
  board.prepend(shell);
  board.classList.add("battle-history-enabled");
  return shell;
}

function renderHistory(board) {
  if (!board || board !== mountedBoard) return;
  const shell = shellFor(board);
  shell.classList.toggle("is-open", mobileOpen);
  const panel = shell.querySelector(".battle-history-panel");
  if (!panel) return;
  panel.replaceChildren();

  const list = document.createElement("div");
  list.className = "battle-history-list";
  const spacer = document.createElement("div");
  spacer.className = "battle-history-spacer";
  list.appendChild(spacer);

  entries
    .slice(-MAX_STORED)
    .reverse()
    .forEach((entry) => list.appendChild(entryNode(entry)));
  panel.appendChild(list);
  requestAnimationFrame(() => {
    list.scrollTop = 0;
  });
}

function captureNewLines(board, game, currentSnapshots, oldSnapshots) {
  const currentLines = readLines(board);
  if (!currentLines.length) {
    previousLines = [];
    return false;
  }
  const overlap = suffixPrefixOverlap(previousLines, currentLines);
  const newLines = previousLines.length ? currentLines.slice(overlap) : currentLines;
  previousLines = currentLines;

  const parsed = [];
  newLines.forEach((message, index) => {
    const weather = weatherActionFromLine(message, oldSnapshots, newLines.slice(0, index));
    if (weather) {
      parsed.push({ index, action: weather });
      return;
    }
    const primary = parsePrimaryAction(board, message, oldSnapshots, currentSnapshots);
    if (primary) {
      parsed.push({ index, action: primary });
      return;
    }
    const ability = parseAbilityAction(board, message, oldSnapshots, currentSnapshots);
    if (ability) parsed.push({ index, action: ability });
  });

  if (!parsed.length) return false;
  for (const item of parsed) {
    const action = enrichAction(item.action, game, oldSnapshots, currentSnapshots);
    if (
      (action.type === "weather" || action.isAoe) &&
      Array.isArray(action.targets) &&
      action.targets.length === 0
    ) {
      continue;
    }
    entries.push({ seq: ++sequence, ...action });
  }
  if (entries.length > MAX_STORED) entries = entries.slice(-MAX_STORED);
  return true;
}

function reset(board) {
  if (mountedBoard === board) return;
  hideInspect();
  if (mountedBoard) mountedBoard.classList.remove("battle-history-enabled");
  mountedBoard = board;
  previousLines = [];
  previousSnapshots = new Map();
  entries = [];
  sequence = 0;
  mobileOpen = false;
}

export function syncBattleHistory() {
  if (syncing) return;
  syncing = true;
  try {
    const board = document.querySelector(".battle.battle-board");
    if (!board) {
      reset(null);
      return;
    }
    reset(board);
    const game = getGame();
    const currentSnapshots = collectSnapshots(game);
    const changed = captureNewLines(board, game, currentSnapshots, previousSnapshots);
    previousSnapshots = currentSnapshots;
    const shellMissing = !board.querySelector(":scope > .battle-history-shell");
    if (changed || shellMissing) renderHistory(board);
  } finally {
    syncing = false;
  }
}
