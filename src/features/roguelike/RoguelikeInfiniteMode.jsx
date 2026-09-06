import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Battle from "../../components/Battle.jsx";
import { Sprite, TrainerSprite } from "../../components/Card.jsx";
import { CARD_MAP } from "../../data/cards.js";
import { ROGUELIKE_CARD_IDS } from "../../data/cards/roguelike.js";
import { drawCard } from "../../engine/engine.js";
import { playBgm, playSfx } from "../../audio.js";
import { ENCOUNTERS } from "./encounters.js";
import { makeStarterChoices } from "./starterDraft.js";
import {
  abandonRoguelikeRun,
  claimRoguelikeDeathReward,
  markRoguelikeDead,
  readRoguelikeSave,
  saveRoguelikeCheckpoint,
} from "./runState.js";
import "./starter-draft.css";

const SUPPORT_REWARD_POOL = [
  "quickattack", "thunderbolt", "flamethrower", "hydropump", "solarbeam",
  "scald", "voltswitch", "dragontail", "reflect", "lightscreen",
  "potion", "superball", "hyperball", "fullrestore", "lifeorb", "focussash",
].filter((id) => CARD_MAP[id]);

const RARITY_META = Object.freeze({
  C: { label: "커먼", className: "rarity-common" },
  R: { label: "레어", className: "rarity-rare" },
  E: { label: "에픽", className: "rarity-epic" },
  L: { label: "레전드", className: "rarity-legend" },
});

const UPGRADE_POOL = [
  {
    id: "heal",
    rarity: "C",
    itemSprite: "/sprites/items/potion.png",
    itemLabel: "상처약",
    name: "응급 치료",
    desc: "현재 체력을 10 회복합니다.",
  },
  {
    id: "max_hp",
    rarity: "R",
    itemSprite: "/sprites/items/eviolite.png",
    itemLabel: "진화의휘석",
    name: "체력 단련",
    desc: "최대 체력 +5. 현재 체력도 5 회복합니다.",
  },
  {
    id: "opening_hand",
    rarity: "E",
    itemSprite: "/sprites/items/adventure-rules.png",
    itemLabel: "모험의 규칙",
    name: "준비된 작전",
    desc: "이후 전투의 시작 손패가 1장 증가합니다. 최대 +5.",
  },
  {
    id: "starting_mana",
    rarity: "E",
    itemSprite: "/sprites/items/normal-gem.png",
    itemLabel: "노말주얼",
    name: "에너지 저장",
    desc: "이후 전투의 시작 최대 코스트와 현재 코스트가 1 증가합니다. 최대 +5.",
  },
];

function randomItem(list) {
  if (!list?.length) return null;
  return list[Math.floor(Math.random() * list.length)] || null;
}

function randomItems(list, count) {
  const pool = [...list];
  const out = [];
  while (pool.length && out.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(index, 1)[0]);
  }
  return out;
}

function rewardablePokemon() {
  return Object.values(CARD_MAP).filter(
    (card) =>
      card?.kind === "pokemon" &&
      !card.trainerOnly &&
      !card.signature &&
      !card.roguelikeOnly &&
      card.stage === 0 &&
      !card.evolvesFrom &&
      card.rarity !== "L",
  );
}

function legendaryPokemon() {
  return Object.values(CARD_MAP).filter(
    (card) =>
      card?.kind === "pokemon" &&
      card.rarity === "L" &&
      !card.trainerOnly &&
      !card.signature &&
      !card.roguelikeOnly,
  );
}

function evolutionChildren(cardId) {
  return Object.values(CARD_MAP).filter(
    (card) =>
      card?.kind === "pokemon" &&
      !card.trainerOnly &&
      !card.signature &&
      !card.roguelikeOnly &&
      card.evolvesFrom === cardId,
  );
}

function getEvolutionOptions(deckIds) {
  const ownedIds = [...new Set(deckIds.filter((id) => CARD_MAP[id]?.kind === "pokemon"))];
  const options = [];
  for (const sourceId of ownedIds) {
    for (const target of evolutionChildren(sourceId)) {
      options.push({ sourceId, targetId: target.id });
    }
  }
  return options;
}

function collectEvolutionPaths(cardId, path = []) {
  const nextPath = [...path, cardId];
  const children = evolutionChildren(cardId);
  if (!children.length) return nextPath.length >= 2 ? [nextPath] : [];
  return children.flatMap((child) => collectEvolutionPaths(child.id, nextPath));
}

function getEvolutionLines() {
  const roots = rewardablePokemon().filter((card) => evolutionChildren(card.id).length > 0);
  return roots.flatMap((root) => collectEvolutionPaths(root.id));
}

function rollRewardRarity(stage) {
  const s = Math.max(0, Number(stage) || 0);
  const table = s >= 60
    ? { C: 15, R: 30, E: 35, L: 20 }
    : s >= 30
      ? { C: 20, R: 35, E: 30, L: 15 }
      : s >= 15
        ? { C: 30, R: 35, E: 25, L: 10 }
        : s >= 5
          ? { C: 45, R: 35, E: 15, L: 5 }
          : { C: 60, R: 30, E: 8, L: 2 };

  let roll = Math.random() * 100;
  for (const rarity of ["C", "R", "E", "L"]) {
    roll -= table[rarity];
    if (roll < 0) return rarity;
  }
  return "C";
}

function makeBasicPokemonReward(rarity) {
  let pool = rewardablePokemon();
  if (rarity === "C") {
    const common = pool.filter((card) => card.rarity === "C");
    if (common.length) pool = common;
  } else if (rarity === "R") {
    const better = pool.filter((card) => ["C", "R"].includes(card.rarity));
    if (better.length) pool = better;
  }
  const card = randomItem(pool);
  if (!card) return null;
  return {
    id: `basic:${rarity}:${card.id}:${Math.random()}`,
    kind: "basic_card",
    rarity,
    cardId: card.id,
    name: "포켓몬 합류",
    desc: `${card.name} 1장을 런 덱에 추가합니다.`,
  };
}

function makeSupportReward(rarity) {
  const cardId = randomItem(SUPPORT_REWARD_POOL);
  if (!cardId) return null;
  return {
    id: `support:${rarity}:${cardId}:${Math.random()}`,
    kind: "support_card",
    rarity,
    cardId,
    name: "기술·도구 보급",
    desc: `${CARD_MAP[cardId]?.name || cardId} 1장을 런 덱에 추가합니다.`,
  };
}

function makeRoguelikeCardReward(rarity = "R") {
  const pool = ROGUELIKE_CARD_IDS.filter((id) => CARD_MAP[id]);
  const cardId = randomItem(pool);
  if (!cardId) return null;
  return {
    id: `rogue-card:${cardId}:${Math.random()}`,
    kind: "rogue_card",
    rarity,
    cardId,
    name: "로그라이크 전용 카드",
    desc: `${CARD_MAP[cardId]?.name || cardId}을(를) 획득합니다. 일반 컬렉션에는 남지 않습니다.`,
  };
}

function makeLegendaryChoiceReward(stage) {
  if (stage < 6) return null;
  const options = randomItems(legendaryPokemon(), 3).map((card) => card.id);
  if (!options.length) return null;
  return {
    id: `legend-choice:${options.join("-")}:${Math.random()}`,
    kind: "legendary_choice",
    rarity: "L",
    options,
    name: "전설의 조우",
    desc: "전설 포켓몬 후보 중 1장을 선택해 이번 런 덱에 추가합니다.",
  };
}

function makeRandomEvolutionReward(run, rarity = "R") {
  const option = randomItem(getEvolutionOptions(run.deck));
  if (!option) return null;
  return {
    id: `random-evo:${option.sourceId}:${option.targetId}:${Math.random()}`,
    kind: "random_evolution",
    rarity,
    ...option,
    name: "랜덤 진화",
    desc: `${CARD_MAP[option.sourceId]?.name}의 진화체 ${CARD_MAP[option.targetId]?.name}을 획득합니다.`,
  };
}

function makeChooseEvolutionReward(run, rarity = "E") {
  const options = getEvolutionOptions(run.deck);
  if (!options.length) return null;
  return {
    id: `choose-evo:${Math.random()}`,
    kind: "choose_evolution",
    rarity,
    options,
    name: "선택 진화",
    desc: "현재 런 덱에서 진화 가능한 포켓몬을 선택해 다음 진화체를 획득합니다.",
  };
}

function makeEvolutionSetReward(rarity = "L") {
  const lines = getEvolutionLines();
  const threeStage = lines.filter((line) => line.length >= 3);
  const lineIds = randomItem(threeStage.length && Math.random() < 0.8 ? threeStage : lines);
  if (!lineIds) return null;
  return {
    id: `evo-set:${lineIds.join("-")}:${Math.random()}`,
    kind: "evolution_set",
    rarity,
    lineIds,
    name: "진화 라인 세트",
    desc: `${lineIds.map((id) => CARD_MAP[id]?.name || id).join(" → ")}을 한 장씩 획득합니다.`,
  };
}

function makeUpgradeReward(rarity) {
  const candidates = UPGRADE_POOL.filter((entry) => entry.rarity === rarity);
  const entry = randomItem(candidates);
  return entry
    ? { ...entry, kind: "upgrade", id: `upgrade:${entry.id}:${Math.random()}` }
    : null;
}

function makeDeckRemoveReward(run, rarity = "R") {
  if ((run.deck?.length || 0) <= 18) return null;
  return {
    id: `deck-remove:${Math.random()}`,
    kind: "deck_remove",
    rarity,
    name: "PC 박스 정리",
    desc: "현재 런 덱에서 원하는 카드 1장을 선택해 이번 런 동안 제외합니다.",
  };
}

function makeDuplicateReward(run, rarity = "E") {
  if (!(run.deck?.length > 0)) return null;
  return {
    id: `deck-copy:${Math.random()}`,
    kind: "duplicate_card",
    rarity,
    name: "메타몽 복제",
    desc: "현재 런 덱의 카드 1장을 선택해 같은 카드를 1장 더 추가합니다.",
  };
}

function makeRewardByRarity(rarity, run) {
  const stage = Math.max(1, run.stage + 1);
  let factories;

  if (rarity === "L") {
    factories = [
      () => makeLegendaryChoiceReward(stage),
      () => makeLegendaryChoiceReward(stage),
      () => makeEvolutionSetReward("L"),
      () => makeChooseEvolutionReward(run, "L"),
      () => (stage >= 15 ? makeDuplicateReward(run, "L") : null),
    ];
  } else if (rarity === "E") {
    factories = [
      () => makeChooseEvolutionReward(run, "E"),
      () => (stage >= 4 ? makeRoguelikeCardReward("E") : null),
      () => (stage >= 10 ? makeDuplicateReward(run, "E") : null),
      () => makeUpgradeReward("E"),
    ];
  } else if (rarity === "R") {
    factories = [
      () => makeRandomEvolutionReward(run, "R"),
      () => (stage >= 3 ? makeRoguelikeCardReward("R") : null),
      () => (stage >= 5 ? makeDeckRemoveReward(run, "R") : null),
      () => makeUpgradeReward("R"),
      () => makeBasicPokemonReward("R"),
    ];
  } else {
    factories = [
      () => makeBasicPokemonReward("C"),
      () => makeBasicPokemonReward("C"),
      () => makeSupportReward("C"),
      () => makeUpgradeReward("C"),
    ];
  }

  for (const factory of randomItems(factories, factories.length)) {
    const reward = factory();
    if (reward) return reward;
  }
  return makeBasicPokemonReward("C") || makeSupportReward("C");
}

function makeStageRewards(run) {
  const rewards = [];
  let guard = 0;
  while (rewards.length < 3 && guard < 30) {
    guard += 1;
    const rarity = rollRewardRarity(run.stage);
    const reward = makeRewardByRarity(rarity, run);
    if (!reward) continue;
    const key = `${reward.kind}:${reward.cardId || reward.targetId || reward.lineIds?.join("-") || reward.options?.join("-") || reward.name}`;
    if (rewards.some((entry) => entry._dedupeKey === key)) continue;
    rewards.push({ ...reward, _dedupeKey: key });
  }
  while (rewards.length < 3) {
    const fallback = makeBasicPokemonReward("C");
    if (!fallback) break;
    rewards.push(fallback);
  }
  return rewards;
}

function initialRun(deck = []) {
  return {
    status: "active",
    phase: "preview",
    stage: 0,
    deck: [...deck],
    hp: 40,
    maxHp: 40,
    openingHandBonus: 0,
    startingManaBonus: 0,
    rewardsTaken: [],
    pendingRewards: [],
    pendingDeathReward: null,
    battleStarted: false,
    startedAt: Date.now(),
  };
}

function encounterForStage(stage) {
  if (!ENCOUNTERS.length) return null;
  const base = ENCOUNTERS[stage % ENCOUNTERS.length];
  const cycle = Math.floor(stage / ENCOUNTERS.length);
  const hpBonus = cycle * 9 + Math.floor(cycle * cycle * 1.5);
  return {
    ...base,
    hp: Math.max(1, base.hp + hpBonus),
    aiLevel: Math.min(5, base.aiLevel + Math.floor((cycle + 1) / 2)),
    rogueCycle: cycle,
    title: cycle > 0 ? `${base.title} · 위험도 ${cycle + 1}` : base.title,
  };
}

function cardSummary(card) {
  if (!card) return "카드";
  if (card.kind === "pokemon") return `${card.type} · ${card.cost}코 · ${card.atk}/${card.hp}`;
  return `${card.type || card.kind} · ${card.cost}코`;
}

function StatusItem({ cardId, children }) {
  return (
    <span className="rogue-status-item">
      <Sprite cardId={cardId} emoji="" size={24} />
      <b>{children}</b>
    </span>
  );
}

function RunStatus({ run }) {
  return (
    <div className="roguelike-status rogue-status-sprites">
      <StatusItem cardId="chansey">{run.hp}/{run.maxHp}</StatusItem>
      <StatusItem cardId="porygon">덱 {run.deck.length}</StatusItem>
      <StatusItem cardId="aipom">손패 +{run.openingHandBonus}</StatusItem>
      <StatusItem cardId="pikachu">코스트 +{run.startingManaBonus}</StatusItem>
    </div>
  );
}

function RewardSprites({ reward, run }) {
  if (["basic_card", "support_card", "rogue_card"].includes(reward.kind)) {
    return <Sprite cardId={reward.cardId} emoji="" size={82} />;
  }
  if (reward.kind === "random_evolution") {
    return <Sprite cardId={reward.targetId} emoji="" size={82} />;
  }
  if (reward.kind === "choose_evolution") {
    return (
      <div className="roguelike-reward-sprite-stack">
        {(reward.options || getEvolutionOptions(run.deck)).slice(0, 3).map((option) => (
          <Sprite key={`${option.sourceId}:${option.targetId}`} cardId={option.targetId} emoji="" size={62} />
        ))}
      </div>
    );
  }
  if (reward.kind === "evolution_set") {
    return (
      <div className="roguelike-reward-sprite-stack is-line">
        {reward.lineIds.slice(0, 3).map((id) => (
          <Sprite key={id} cardId={id} emoji="" size={58} />
        ))}
      </div>
    );
  }
  if (reward.kind === "legendary_choice") {
    return (
      <div className="roguelike-reward-sprite-stack is-line">
        {reward.options.slice(0, 3).map((id) => (
          <Sprite key={id} cardId={id} emoji="" size={62} />
        ))}
      </div>
    );
  }
  if (reward.kind === "deck_remove") {
    return <Sprite cardId="porygon" emoji="" size={82} />;
  }
  if (reward.kind === "duplicate_card") {
    return <Sprite cardId="ditto" emoji="" size={82} />;
  }
  return (
    <img
      className="roguelike-upgrade-item"
      src={reward.itemSprite}
      alt={reward.itemLabel || reward.name}
      width={84}
      height={84}
      draggable={false}
    />
  );
}

function StarterChoiceCard({ choice, onChoose }) {
  return (
    <button className="roguelike-starter-card" onClick={() => onChoose(choice)}>
      <span className="roguelike-starter-tag">RANDOM START</span>
      <div className="roguelike-starter-sprites">
        {choice.previewIds.map((cardId) => (
          <Sprite key={cardId} cardId={cardId} emoji="" size={62} />
        ))}
      </div>
      <strong>{choice.name}</strong>
      <span className="roguelike-starter-subtitle">{choice.subtitle}</span>
      <div className="roguelike-starter-lines">
        {choice.lines.map((line) => (
          <div key={`${line.sourceId}:${line.targetId}`} className="roguelike-starter-line">
            <span>{CARD_MAP[line.sourceId]?.name || line.sourceId}</span>
            <b>→</b>
            <span>{CARD_MAP[line.targetId]?.name || line.targetId}</span>
          </div>
        ))}
      </div>
      <span className="roguelike-starter-breakdown">24장 · 진화 라인 4개 · 단독 포켓몬 4장 · 기술/도구 8장</span>
      <span className="roguelike-starter-select">이 덱으로 무한 소탕 시작</span>
    </button>
  );
}

function SelectionCard({ cardId, onClick, label = null }) {
  const card = CARD_MAP[cardId];
  if (!card) return null;
  return (
    <button className="roguelike-evolution-option rogue-card-picker-option" onClick={() => onClick(cardId)}>
      <Sprite cardId={cardId} emoji="" size={76} />
      <strong>{label || card.name}</strong>
      <small>{cardSummary(card)}</small>
    </button>
  );
}

export default function RoguelikeInfiniteMode({ onExit }) {
  const initialSaved = useMemo(() => readRoguelikeSave(), []);
  const [phase, setPhase] = useState(
    initialSaved.run?.status === "dead" ? "defeat" : initialSaved.run ? "resume" : "intro",
  );
  const [run, setRun] = useState(() => initialSaved.run || initialRun());
  const [starterChoices, setStarterChoices] = useState([]);
  const [rewards, setRewards] = useState(() => initialSaved.run?.pendingRewards || []);
  const [selectionReward, setSelectionReward] = useState(null);
  const [battleNonce, setBattleNonce] = useState(0);
  const [selectedShiny, setSelectedShiny] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [, setSetupPulse] = useState(0);

  const encounter = useMemo(() => encounterForStage(run.stage), [run.stage]);
  const cycle = Math.floor(run.stage / Math.max(1, ENCOUNTERS.length));
  const deckCounts = useMemo(() => {
    const counts = new Map();
    run.deck.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    return [...counts.entries()]
      .map(([id, count]) => ({ card: CARD_MAP[id], count }))
      .filter((entry) => entry.card)
      .sort((a, b) => (a.card.cost || 0) - (b.card.cost || 0) || a.card.name.localeCompare(b.card.name));
  }, [run.deck]);

  useEffect(() => {
    document.body.classList.add("roguelike-active");
    return () => document.body.classList.remove("roguelike-active");
  }, []);

  useEffect(() => {
    playBgm(phase === "battle" ? "battle" : "main");
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "battle" || !encounter) return;
    const game = window.__pokeBattleGame;
    if (!game?.players?.player || game.trainer?.id !== encounter.id) return;
    const setupKey = `${encounter.id}:${run.stage}:${battleNonce}`;
    if (game._roguelikeSetupKey === setupKey) return;

    const player = game.players.player;
    player.maxHp = Math.max(1, run.maxHp);
    player.hp = Math.max(1, Math.min(run.hp, player.maxHp));

    const handBonus = Math.max(0, Math.min(5, run.openingHandBonus || 0));
    for (let i = 0; i < handBonus; i += 1) {
      if (player.hand.length >= 10 || player.deck.length <= 0) break;
      drawCard(game, "player", true);
    }

    const manaBonus = Math.max(0, Math.min(5, run.startingManaBonus || 0));
    if (manaBonus > 0) {
      player.maxMana = Math.min(10, (player.maxMana || 0) + manaBonus);
      player.mana = Math.min(10, (player.mana || 0) + manaBonus);
    }

    const enemy = game.players.enemy;
    const enemyManaBonus = Math.min(3, Math.floor(cycle / 2));
    const enemyHandBonus = Math.min(2, Math.floor(cycle / 3));
    if (enemyManaBonus > 0) {
      enemy.maxMana = Math.min(10, (enemy.maxMana || 0) + enemyManaBonus);
      enemy.mana = Math.min(10, (enemy.mana || 0) + enemyManaBonus);
    }
    for (let i = 0; i < enemyHandBonus; i += 1) {
      if (enemy.hand.length >= 10 || enemy.deck.length <= 0) break;
      drawCard(game, "enemy", true);
    }

    game._roguelikeSetupKey = setupKey;
    game._roguelikeRun = {
      stage: run.stage,
      cycle,
      maxHp: run.maxHp,
      openingHandBonus: handBonus,
      startingManaBonus: manaBonus,
      enemyManaBonus,
      enemyHandBonus,
    };
    setSetupPulse((value) => value + 1);
  }, [phase, encounter, battleNonce, run, cycle]);

  function startRun() {
    playSfx("click");
    setRun(initialRun());
    setRewards([]);
    setSelectionReward(null);
    setSelectedShiny(null);
    setSettlement(null);
    setStarterChoices(makeStarterChoices(3));
    setPhase("starter");
  }

  function continueSavedRun() {
    playSfx("click");
    if (run.status === "dead") {
      setPhase("defeat");
      return;
    }
    if (run.phase === "reward" && run.pendingRewards?.length) {
      setRewards(run.pendingRewards);
      setPhase("reward");
    } else {
      setPhase("preview");
    }
  }

  function abandonAndRestart() {
    playSfx("click");
    abandonRoguelikeRun();
    startRun();
  }

  function chooseStarter(choice) {
    if (!choice?.deck?.length) return;
    playSfx("click");
    const next = saveRoguelikeCheckpoint(initialRun(choice.deck), "preview");
    setRun(next);
    setStarterChoices([]);
    setRewards([]);
    setSelectionReward(null);
    setPhase("preview");
  }

  function beginBattle() {
    if (!encounter || !run.deck.length) return;
    playSfx("click");
    const checkpoint = saveRoguelikeCheckpoint(run, "preview", {
      battleStarted: true,
      pendingRewards: [],
    });
    setRun(checkpoint);
    setBattleNonce((value) => value + 1);
    setPhase("battle");
  }

  function finishBattle(winner) {
    const game = window.__pokeBattleGame;
    if (winner !== "player") {
      playSfx("buzzer");
      const deadRun = markRoguelikeDead({ ...run, battleStarted: false });
      setRun(deadRun);
      setRewards([]);
      setSelectionReward(null);
      setSelectedShiny(null);
      setPhase("defeat");
      return;
    }

    const remainingHp = Math.max(1, Math.min(run.maxHp, game?.players?.player?.hp ?? run.hp));
    const rewardRun = { ...run, hp: remainingHp, battleStarted: false };
    const nextRewards = makeStageRewards(rewardRun);
    const checkpoint = saveRoguelikeCheckpoint(
      { ...rewardRun, pendingRewards: nextRewards },
      "reward",
    );
    setRun(checkpoint);
    setRewards(nextRewards);
    setSelectionReward(null);
    setPhase("reward");
  }

  function applyReward(reward, chosenId = null) {
    playSfx("click");
    const next = {
      ...run,
      deck: [...run.deck],
      rewardsTaken: [...run.rewardsTaken],
      pendingRewards: [],
      battleStarted: false,
    };

    if (["basic_card", "support_card", "rogue_card"].includes(reward.kind)) {
      next.deck.push(reward.cardId);
      next.rewardsTaken.push(CARD_MAP[reward.cardId]?.name || reward.cardId);
    } else if (reward.kind === "random_evolution") {
      next.deck.push(reward.targetId);
      next.rewardsTaken.push(`진화 · ${CARD_MAP[reward.targetId]?.name || reward.targetId}`);
    } else if (reward.kind === "choose_evolution" && chosenId) {
      next.deck.push(chosenId);
      next.rewardsTaken.push(`선택 진화 · ${CARD_MAP[chosenId]?.name || chosenId}`);
    } else if (reward.kind === "evolution_set") {
      next.deck.push(...reward.lineIds);
      next.rewardsTaken.push(`진화 세트 · ${reward.lineIds.map((id) => CARD_MAP[id]?.name || id).join("/")}`);
    } else if (reward.kind === "legendary_choice" && chosenId) {
      next.deck.push(chosenId);
      next.rewardsTaken.push(`전설 · ${CARD_MAP[chosenId]?.name || chosenId}`);
    } else if (reward.kind === "deck_remove" && chosenId) {
      const index = next.deck.indexOf(chosenId);
      if (index !== -1) next.deck.splice(index, 1);
      next.rewardsTaken.push(`PC 정리 · ${CARD_MAP[chosenId]?.name || chosenId}`);
    } else if (reward.kind === "duplicate_card" && chosenId) {
      next.deck.push(chosenId);
      next.rewardsTaken.push(`복제 · ${CARD_MAP[chosenId]?.name || chosenId}`);
    } else if (reward.kind === "upgrade" && reward.id.includes("max_hp")) {
      next.maxHp += 5;
      next.hp = Math.min(next.maxHp, next.hp + 5);
      next.rewardsTaken.push("체력 단련");
    } else if (reward.kind === "upgrade" && reward.id.includes("heal")) {
      next.hp = Math.min(next.maxHp, next.hp + 10);
      next.rewardsTaken.push("응급 치료");
    } else if (reward.kind === "upgrade" && reward.id.includes("opening_hand")) {
      next.openingHandBonus = Math.min(5, next.openingHandBonus + 1);
      next.rewardsTaken.push("준비된 작전");
    } else if (reward.kind === "upgrade" && reward.id.includes("starting_mana")) {
      next.startingManaBonus = Math.min(5, next.startingManaBonus + 1);
      next.rewardsTaken.push("에너지 저장");
    }

    next.stage += 1;
    const checkpoint = saveRoguelikeCheckpoint(next, "preview");
    setRun(checkpoint);
    setRewards([]);
    setSelectionReward(null);
    setPhase("preview");
  }

  function chooseReward(reward) {
    if (["choose_evolution", "legendary_choice", "deck_remove", "duplicate_card"].includes(reward.kind)) {
      playSfx("click");
      setSelectionReward(reward);
      return;
    }
    applyReward(reward);
  }

  function claimDeathReward() {
    const result = claimRoguelikeDeathReward(selectedShiny);
    if (!result.ok) {
      playSfx("buzzer");
      return;
    }
    playSfx("buy");
    setSettlement(result);
    setRun(initialRun());
    setSelectedShiny(null);
    setPhase("settled");
  }

  function exitMode() {
    playSfx("click");
    playBgm("main");
    onExit?.();
  }

  if (phase === "battle" && encounter) {
    return (
      <div className="roguelike-root roguelike-battle-root">
        <Battle
          key={`${encounter.id}:${run.stage}:${battleNonce}`}
          trainer={encounter}
          deck={run.deck}
          deckShiny={{}}
          onFinish={finishBattle}
        />
      </div>
    );
  }

  const showRunStatus = !["intro", "starter", "settled"].includes(phase);
  const milestone = run.stage > 0 && run.stage % ENCOUNTERS.length === 0;

  return (
    <div className="roguelike-root roguelike-infinite-root">
      <div className="roguelike-screen">
        <header className="roguelike-header">
          <button className="btn-ghost small" onClick={exitMode}>← 메인 메뉴</button>
          <div>
            <div className="roguelike-kicker">END CONTENT · INFINITE RUN</div>
            <h1>악의 조직 소탕전</h1>
          </div>
          {showRunStatus ? <RunStatus run={run} /> : <span />}
        </header>

        {phase === "intro" && (
          <section className="roguelike-panel roguelike-intro">
            <div className="roguelike-emblem rogue-pokemon-emblem">
              <Sprite cardId="absol" emoji="" size={118} />
            </div>
            <h2>무한 악의 조직 로그라이크</h2>
            <p>
              무작위 24장 시작 덱으로 출발해 로켓단, 갤럭시단, 플라즈마단을 반복 소탕합니다.
              15스테이지마다 다음 위험도로 넘어가며 적은 계속 강해집니다. 패배하기 전까지 런은 끝나지 않습니다.
            </p>
            <div className="rogue-faction-preview">
              <div><TrainerSprite spriteKey="giovanni" emoji="" size={72} /><span>로켓단</span></div>
              <div><TrainerSprite spriteKey="cyrus" emoji="" size={72} /><span>갤럭시단</span></div>
              <div><TrainerSprite spriteKey="ghetsis-gen5bw" emoji="" size={72} /><span>플라즈마단</span></div>
            </div>
            <button className="btn-primary big" onClick={startRun}>시작 덱 뽑기</button>
          </section>
        )}

        {phase === "resume" && (
          <section className="roguelike-panel roguelike-end-panel rogue-resume-panel">
            <Sprite cardId="celebi" emoji="" size={104} />
            <div className="roguelike-stage-clear">RUN CHECKPOINT</div>
            <h2>진행 중인 소탕전이 있습니다</h2>
            <p>STAGE {run.stage + 1} · 위험도 {cycle + 1} · 덱 {run.deck.length}장 · 체력 {run.hp}/{run.maxHp}</p>
            <RunStatus run={run} />
            <div className="roguelike-end-actions">
              <button className="btn-primary" onClick={continueSavedRun}>계속하기</button>
              <button className="btn-secondary" onClick={abandonAndRestart}>현재 런 포기 후 새로 시작</button>
            </div>
          </section>
        )}

        {phase === "starter" && (
          <section className="roguelike-panel roguelike-starter-draft-panel">
            <div className="roguelike-stage-clear">STARTER DRAFT</div>
            <h2>이번 런의 시작 덱을 고르세요</h2>
            <p>각 후보는 24장이고 실제로 이어지는 진화 라인 4개를 보장합니다. 선택한 순간부터 진행 상태가 저장됩니다.</p>
            <div className="roguelike-starter-choices">
              {starterChoices.map((choice) => (
                <StarterChoiceCard key={choice.id} choice={choice} onChoose={chooseStarter} />
              ))}
            </div>
          </section>
        )}

        {phase === "preview" && encounter && (
          <div className="roguelike-columns">
            <section className="roguelike-panel roguelike-encounter">
              {milestone && (
                <div className="rogue-cycle-banner">
                  <Sprite cardId="hooh" emoji="" size={46} />
                  <span>{run.stage / ENCOUNTERS.length}회차 돌파 · 위험도 {cycle + 1} 진입</span>
                </div>
              )}
              <div className="roguelike-stage">STAGE {run.stage + 1} · 위험도 {cycle + 1}</div>
              <div className="roguelike-villain-sprite">
                <TrainerSprite spriteKey={encounter.sprite} emoji="" size={132} />
              </div>
              <div className="roguelike-faction">{encounter.faction}</div>
              <h2>{encounter.name}</h2>
              <p>{encounter.title}</p>
              <div className="roguelike-enemy-stats rogue-stat-row">
                <StatusItem cardId="chansey">적 체력 {encounter.hp}</StatusItem>
                <StatusItem cardId="alakazam">AI Lv.{encounter.aiLevel}</StatusItem>
                {cycle >= 2 && <StatusItem cardId="pikachu">적 시작 코스트 +{Math.min(3, Math.floor(cycle / 2))}</StatusItem>}
              </div>
              <button className="btn-primary big" onClick={beginBattle}>전투 시작</button>
              <small className="rogue-checkpoint-note">전투 시작 직전 상태가 자동 저장됩니다.</small>
            </section>

            <section className="roguelike-panel roguelike-deck-panel">
              <h3>현재 런 덱 · {run.deck.length}장</h3>
              <div className="roguelike-deck-list">
                {deckCounts.map(({ card, count }) => (
                  <div key={card.id} className="roguelike-deck-row">
                    <Sprite cardId={card.id} emoji="" size={28} />
                    <span>{card.name}</span>
                    <small>{cardSummary(card)}</small>
                    <strong>×{count}</strong>
                  </div>
                ))}
              </div>
              <div className="roguelike-upgrade-log">
                <strong>스테이지 클리어 보상 기록</strong>
                <p>{run.rewardsTaken.length ? run.rewardsTaken.slice(-12).join(" · ") : "아직 없음"}</p>
              </div>
            </section>
          </div>
        )}

        {phase === "reward" && !selectionReward && (
          <section className="roguelike-panel roguelike-reward-panel">
            <div className="roguelike-stage-clear">STAGE {run.stage + 1} CLEAR</div>
            <h2>스테이지 클리어 보상</h2>
            <p>한 가지를 선택하세요. 후반으로 갈수록 전설, 로그라이크 전용 탐색 카드, 복제와 덱 정리 보상이 더 자주 등장합니다.</p>
            <div className="roguelike-rewards">
              {rewards.map((reward) => {
                const rarity = RARITY_META[reward.rarity] || RARITY_META.C;
                const detail = reward.kind === "random_evolution"
                  ? `${CARD_MAP[reward.sourceId]?.name} → ${CARD_MAP[reward.targetId]?.name}`
                  : reward.kind === "evolution_set"
                    ? reward.lineIds.map((id) => CARD_MAP[id]?.name || id).join(" → ")
                    : reward.kind === "legendary_choice"
                      ? "전설 포켓몬 3택 1"
                      : reward.kind === "upgrade"
                        ? reward.itemLabel
                        : reward.kind === "deck_remove"
                          ? "덱 압축"
                          : reward.kind === "duplicate_card"
                            ? "카드 복제"
                            : cardSummary(CARD_MAP[reward.cardId]);
                return (
                  <button
                    key={reward.id}
                    className={`roguelike-reward-card ${reward.kind === "upgrade" ? "is-upgrade" : ""} ${rarity.className}`}
                    onClick={() => chooseReward(reward)}
                  >
                    <span className="roguelike-reward-tag">{rarity.label}</span>
                    <RewardSprites reward={reward} run={run} />
                    <strong>{reward.name}</strong>
                    <small>{detail}</small>
                    <span className="roguelike-reward-desc">{reward.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {phase === "reward" && selectionReward?.kind === "choose_evolution" && (
          <section className="roguelike-panel roguelike-reward-panel roguelike-evolution-picker">
            <div className="roguelike-stage-clear">선택 진화</div>
            <h2>진화시킬 포켓몬을 선택하세요</h2>
            <div className="roguelike-evolution-options">
              {(selectionReward.options || []).map((option) => (
                <button key={`${option.sourceId}:${option.targetId}`} className="roguelike-evolution-option" onClick={() => applyReward(selectionReward, option.targetId)}>
                  <div className="roguelike-evolution-pair">
                    <Sprite cardId={option.sourceId} emoji="" size={56} />
                    <span>→</span>
                    <Sprite cardId={option.targetId} emoji="" size={72} />
                  </div>
                  <strong>{CARD_MAP[option.sourceId]?.name} → {CARD_MAP[option.targetId]?.name}</strong>
                </button>
              ))}
            </div>
            <button className="btn-ghost small roguelike-picker-back" onClick={() => setSelectionReward(null)}>← 다른 보상 보기</button>
          </section>
        )}

        {phase === "reward" && selectionReward?.kind === "legendary_choice" && (
          <section className="roguelike-panel roguelike-reward-panel roguelike-evolution-picker">
            <div className="roguelike-stage-clear">전설의 조우</div>
            <h2>이번 런에 합류할 전설을 고르세요</h2>
            <div className="roguelike-evolution-options rogue-card-picker-grid">
              {selectionReward.options.map((id) => <SelectionCard key={id} cardId={id} onClick={(cardId) => applyReward(selectionReward, cardId)} />)}
            </div>
            <button className="btn-ghost small roguelike-picker-back" onClick={() => setSelectionReward(null)}>← 다른 보상 보기</button>
          </section>
        )}

        {phase === "reward" && ["deck_remove", "duplicate_card"].includes(selectionReward?.kind) && (
          <section className="roguelike-panel roguelike-reward-panel roguelike-evolution-picker">
            <div className="roguelike-stage-clear">{selectionReward.kind === "deck_remove" ? "PC 박스 정리" : "메타몽 복제"}</div>
            <h2>{selectionReward.kind === "deck_remove" ? "제외할 카드 1장을 선택하세요" : "복제할 카드 1장을 선택하세요"}</h2>
            <div className="roguelike-evolution-options rogue-card-picker-grid">
              {[...new Set(run.deck)].map((id) => (
                <SelectionCard key={id} cardId={id} onClick={(cardId) => applyReward(selectionReward, cardId)} />
              ))}
            </div>
            <button className="btn-ghost small roguelike-picker-back" onClick={() => setSelectionReward(null)}>← 다른 보상 보기</button>
          </section>
        )}

        {phase === "defeat" && (
          <section className="roguelike-panel roguelike-end-panel is-defeat rogue-death-settlement">
            <Sprite cardId="gengar" emoji="" size={112} />
            <div className="roguelike-stage-clear">RUN OVER</div>
            <h2>STAGE {run.pendingDeathReward?.reachedStage || run.stage + 1}에서 전멸</h2>
            <p>런 덱과 스테이지 강화는 여기서 끝납니다. 아래 보상은 계정에 영구 지급됩니다.</p>

            <div className="rogue-account-reward-money">
              <Sprite cardId="meowth" emoji="" size={56} />
              <div><span>로그라이크 보상</span><strong>{(run.pendingDeathReward?.money || 0).toLocaleString("ko-KR")}원</strong></div>
            </div>

            {run.pendingDeathReward?.shinyChoices?.length > 0 && (
              <div className="rogue-shiny-choice">
                <h3>이로치 선택 보상</h3>
                <p>깊은 스테이지까지 도달한 추가 보상입니다. 보유 카드 중 하나를 이로치로 바꿉니다.</p>
                <div className="rogue-shiny-choice-grid">
                  {run.pendingDeathReward.shinyChoices.map((id) => (
                    <button key={id} className={selectedShiny === id ? "selected" : ""} onClick={() => setSelectedShiny(id)}>
                      <Sprite cardId={id} emoji="" size={76} shiny />
                      <strong>{CARD_MAP[id]?.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {run.pendingDeathReward?.shinyEligible && !run.pendingDeathReward?.shinyChoices?.length && (
              <p className="rogue-no-shiny">현재 이로치로 바꿀 수 있는 보유 포켓몬이 없어 이번 정산은 재화만 지급됩니다.</p>
            )}

            <div className="roguelike-end-actions">
              <button
                className="btn-primary"
                disabled={!!run.pendingDeathReward?.shinyChoices?.length && !selectedShiny}
                onClick={claimDeathReward}
              >
                로그라이크 보상 받기
              </button>
              <button className="btn-secondary" onClick={exitMode}>나중에 받기</button>
            </div>
          </section>
        )}

        {phase === "settled" && settlement && (
          <section className="roguelike-panel roguelike-end-panel is-victory rogue-settled-panel">
            <Sprite cardId={settlement.shinyCardId || "jirachi"} emoji="" size={112} shiny={!!settlement.shinyCardId} />
            <div className="roguelike-stage-clear">REWARD CLAIMED</div>
            <h2>로그라이크 보상 정산 완료</h2>
            <p>
              STAGE {settlement.reachedStage} 기록 · {(settlement.money || 0).toLocaleString("ko-KR")}원
              {settlement.shinyCardId ? ` · 이로치 ${CARD_MAP[settlement.shinyCardId]?.name}` : ""}
            </p>
            <div className="roguelike-end-actions">
              <button className="btn-primary" onClick={startRun}>새 런 시작</button>
              <button className="btn-secondary" onClick={exitMode}>메인 메뉴</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
