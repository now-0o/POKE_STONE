import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Battle from "../../components/Battle.jsx";
import { Sprite, TrainerSprite } from "../../components/Card.jsx";
import { CARD_MAP } from "../../data/cards.js";
import { drawCard } from "../../engine/engine.js";
import { playBgm, playSfx } from "../../audio.js";

// 첫 전투부터 3단 진화 라인을 조립하게 하지 않는다.
// 기본체/1회 진화/단독 포켓몬 중심의 24장 덱으로 시작한다.
const STARTER_DECK = [
  "drilbur", "drilbur", "excadrill",
  "growlithe", "growlithe", "arcanine",
  "rattata", "rattata", "raticate",
  "eevee", "eevee", "vaporeon", "jolteon",
  "lapras", "lapras",
  "tauros", "tauros",
  "quickattack", "quickattack",
  "potion", "potion",
  "pokeball", "pokeball", "superball",
];

const FALLBACK_DECK_CARDS = [
  "rattata", "rattata", "pidgey", "pidgey", "quickattack", "potion", "pokeball",
];

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

function hasEvolutionPrerequisites(deckIds, cardId, visited = new Set()) {
  const card = CARD_MAP[cardId];
  if (!card?.evolvesFrom) return true;
  if (visited.has(cardId)) return false;

  visited.add(cardId);
  if (!deckIds.includes(card.evolvesFrom)) return false;
  return hasEvolutionPrerequisites(deckIds, card.evolvesFrom, visited);
}

function buildStarterDeck() {
  const available = STARTER_DECK.filter((id) => CARD_MAP[id]);
  const deck = available.filter((id) => {
    const card = CARD_MAP[id];
    if (card?.kind !== "pokemon" || !card.evolvesFrom) return true;
    return hasEvolutionPrerequisites(available, id);
  });

  const fallback = FALLBACK_DECK_CARDS.filter((id) => CARD_MAP[id]);
  while (deck.length < 24 && fallback.length) {
    deck.push(fallback[deck.length % fallback.length]);
  }
  return deck.slice(0, 24);
}

function makeDeck(pool, size = 30) {
  const valid = pool.filter((id) => CARD_MAP[id]);
  const source = valid.length
    ? valid
    : FALLBACK_DECK_CARDS.filter((id) => CARD_MAP[id]);
  const deck = [];
  if (!source.length) return deck;
  while (deck.length < size) deck.push(source[deck.length % source.length]);
  return deck;
}

const ENCOUNTERS = [
  {
    id: "rogue_rocket_grunt",
    faction: "로켓단",
    name: "로켓단 조무래기",
    title: "악의 조직 소탕 · 1구역",
    sprite: "rocketgrunt",
    aiLevel: 2,
    hp: 32,
    reward: 0,
    introLines: ["여긴 로켓단의 구역이다! 가진 포켓몬을 전부 내놔!"],
    winLines: ["흥! 역시 로켓단의 힘이지!"],
    loseLines: ["뭐야, 이런 녀석에게 지다니...!"],
    deck: makeDeck([
      "rattata", "raticate", "zubat", "golbat", "arbok", "grimer", "muk",
      "weezing", "stunky", "skuntank", "quickattack", "toxic", "pokeball", "potion",
    ]),
  },
  {
    id: "rogue_rocket_athena",
    faction: "로켓단",
    name: "로켓단 간부 아테나",
    title: "악의 조직 소탕 · 간부전",
    sprite: "ariana",
    aiLevel: 3,
    hp: 38,
    reward: 0,
    introLines: ["조무래기를 이겼다고 우쭐대지 마. 간부의 싸움은 다르니까."],
    winLines: ["이게 로켓단 간부의 실력이야."],
    loseLines: ["비주기 님께서 그냥 두지 않으실 거야...!"],
    deck: makeDeck([
      "zubat", "golbat", "crobat", "stunky", "skuntank", "skorupi", "drapion",
      "croagunk", "toxicroak", "arbok", "weezing", "darkpulse", "toxic",
      "superball", "potion", "fullrestore",
    ]),
  },
  {
    id: "rogue_giovanni",
    faction: "로켓단",
    name: "로켓단 보스 비주기",
    title: "악의 조직 소탕 · 보스전",
    sprite: "giovanni",
    aiLevel: 4,
    hp: 44,
    reward: 0,
    introLines: ["조직을 무너뜨리겠다고? 힘이 무엇인지 직접 가르쳐 주지."],
    winLines: ["결국 힘 앞에서는 모두 무릎을 꿇는다."],
    loseLines: ["흥미롭군. 하지만 이걸로 끝이라고 생각하지 마라."],
    deck: makeDeck([
      "rhyhorn", "rhydon", "rhyperior", "geodude", "graveler", "golem",
      "sandile", "krokorok", "krookodile", "drilbur", "excadrill",
      "earthquake", "stoneedge", "sandstorm", "hyperball", "fullrestore",
    ]),
  },
  {
    id: "rogue_galactic_mars",
    faction: "갤럭시단",
    name: "갤럭시단 간부 마스",
    title: "악의 조직 소탕 · 4구역",
    sprite: "mars",
    aiLevel: 4,
    hp: 46,
    reward: 0,
    introLines: ["우주의 새 질서에 방해되는 건 전부 치워버리겠어!"],
    winLines: ["갤럭시단의 계획은 멈추지 않아!"],
    loseLines: ["말도 안 돼... 태홍 님께 보고해야 해!"],
    deck: makeDeck([
      "zubat", "golbat", "crobat", "stunky", "skuntank",
      "yamask", "cofagrigus", "litwick", "lampent", "chandelure",
      "darkpulse", "shadowball", "toxic", "reflect", "lightscreen", "superball",
    ]),
  },
  {
    id: "rogue_ghetsis",
    faction: "플라즈마단",
    name: "플라즈마단 게치스",
    title: "악의 조직 소탕 · 최종전",
    sprite: "ghetsis-gen5bw",
    aiLevel: 5,
    hp: 54,
    reward: 0,
    introLines: ["포켓몬을 다루는 자들 위에 서는 것은 오직 나다. 네 여정도 여기까지다!"],
    winLines: ["모든 것은 나의 계획대로다!"],
    loseLines: ["내가... 내가 이런 곳에서 패배한다고?!"],
    deck: makeDeck([
      "deino", "zweilous", "hydreigon", "druddigon", "haxorus",
      "vullaby", "mandibuzz", "sandile", "krokorok", "krookodile",
      "yamask", "cofagrigus", "dragontail", "darkpulse", "reflect", "lightscreen",
      "fullrestore", "hyperball",
    ]),
  },
];

const UPGRADE_POOL = [
  {
    id: "heal",
    rarity: "C",
    itemSprite: "/sprites/items/potion.png",
    itemLabel: "상처약",
    name: "응급 치료",
    desc: "현재 체력을 10 회복.",
  },
  {
    id: "max_hp",
    rarity: "R",
    itemSprite: "/sprites/items/eviolite.png",
    itemLabel: "진화의휘석",
    name: "체력 단련",
    desc: "최대 체력 +5. 현재 체력도 5 회복.",
  },
  {
    id: "opening_hand",
    rarity: "E",
    itemSprite: "/sprites/items/adventure-rules.png",
    itemLabel: "모험의 규칙",
    name: "준비된 작전",
    desc: "이후 전투의 시작 손패 +1.",
  },
  {
    id: "starting_mana",
    rarity: "E",
    itemSprite: "/sprites/items/normal-gem.png",
    itemLabel: "노말주얼",
    name: "에너지 저장",
    desc: "이후 전투 시작 시 최대 코스트와 현재 코스트 +1.",
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
      card.stage === 0 &&
      !card.evolvesFrom &&
      card.rarity !== "L",
  );
}

function evolutionChildren(cardId) {
  return Object.values(CARD_MAP).filter(
    (card) =>
      card?.kind === "pokemon" &&
      !card.trainerOnly &&
      !card.signature &&
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
  const tables = [
    { C: 55, R: 30, E: 12, L: 3 },
    { C: 48, R: 32, E: 15, L: 5 },
    { C: 40, R: 34, E: 19, L: 7 },
    { C: 32, R: 35, E: 23, L: 10 },
  ];
  const table = tables[Math.max(0, Math.min(tables.length - 1, stage || 0))];
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
    const better = pool.filter((card) => card.rarity === "C" || card.rarity === "R");
    if (better.length) pool = better;
  }
  const card = randomItem(pool);
  if (!card) return null;
  return {
    id: `basic:${rarity}:${card.id}:${Math.random()}`,
    kind: "basic_card",
    rarity,
    cardId: card.id,
    name: "기본 포켓몬",
    desc: `${card.name} 1장을 덱에 추가합니다.`,
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
    name: "전술 보급",
    desc: `${CARD_MAP[cardId]?.name || cardId} 1장을 덱에 추가합니다.`,
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
    desc: `보유 중인 ${CARD_MAP[option.sourceId]?.name}의 진화체 ${CARD_MAP[option.targetId]?.name}을 획득합니다.`,
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
    desc: "현재 덱의 진화 가능한 포켓몬을 직접 선택해 다음 진화체를 획득합니다.",
  };
}

function makeEvolutionSetReward(rarity = "L") {
  const lines = getEvolutionLines();
  const threeStage = lines.filter((line) => line.length >= 3);
  const lineIds = randomItem(threeStage.length && Math.random() < 0.8 ? threeStage : lines);
  if (!lineIds) return null;
  const names = lineIds.map((id) => CARD_MAP[id]?.name || id);
  return {
    id: `evo-set:${lineIds.join("-")}:${Math.random()}`,
    kind: "evolution_set",
    rarity,
    lineIds,
    name: "진화 라인 세트",
    desc: `${names.join(" → ")}을(를) 한 장씩 모두 획득합니다.`,
  };
}

function makeUpgradeReward(rarity) {
  const candidates = UPGRADE_POOL.filter((entry) => entry.rarity === rarity);
  const entry = randomItem(candidates);
  return entry
    ? { ...entry, kind: "upgrade", id: `upgrade:${entry.id}:${Math.random()}` }
    : null;
}

function makeRewardByRarity(rarity, run) {
  let factories;
  if (rarity === "L") {
    factories = [
      () => makeEvolutionSetReward("L"),
      () => makeEvolutionSetReward("L"),
      () => makeChooseEvolutionReward(run, "L"),
    ];
  } else if (rarity === "E") {
    factories = [
      () => makeChooseEvolutionReward(run, "E"),
      () => makeChooseEvolutionReward(run, "E"),
      () => makeUpgradeReward("E"),
    ];
  } else if (rarity === "R") {
    factories = [
      () => makeRandomEvolutionReward(run, "R"),
      () => makeRandomEvolutionReward(run, "R"),
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

function makeRewards(run) {
  const rewards = [];
  let guard = 0;
  while (rewards.length < 3 && guard < 20) {
    guard += 1;
    const rarity = rollRewardRarity(run.stage);
    const reward = makeRewardByRarity(rarity, run);
    if (!reward) continue;
    const key = `${reward.kind}:${reward.cardId || reward.targetId || reward.lineIds?.join("-") || reward.name}`;
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

function initialRun() {
  return {
    stage: 0,
    deck: buildStarterDeck(),
    hp: 40,
    maxHp: 40,
    openingHandBonus: 0,
    startingManaBonus: 0,
    rewardsTaken: [],
  };
}

function cardSummary(card) {
  if (!card) return "카드";
  if (card.kind === "pokemon") {
    return `${card.type} · ${card.cost}코 · ${card.atk}/${card.hp}`;
  }
  return `${card.type || card.kind} · ${card.cost}코`;
}

function RunStatus({ run }) {
  return (
    <div className="roguelike-status">
      <span>❤️ {run.hp}/{run.maxHp}</span>
      <span>🂠 덱 {run.deck.length}장</span>
      <span>🃏 시작 손패 +{run.openingHandBonus}</span>
      <span>⚡ 시작 코스트 +{run.startingManaBonus}</span>
    </div>
  );
}

function RewardSprites({ reward, run }) {
  if (reward.kind === "basic_card" || reward.kind === "support_card") {
    const card = CARD_MAP[reward.cardId];
    return <Sprite cardId={reward.cardId} emoji={card?.emoji || "?"} size={82} />;
  }

  if (reward.kind === "random_evolution") {
    const card = CARD_MAP[reward.targetId];
    return <Sprite cardId={reward.targetId} emoji={card?.emoji || "?"} size={82} />;
  }

  if (reward.kind === "choose_evolution") {
    const targets = randomItems(getEvolutionOptions(run.deck), 3);
    return (
      <div className="roguelike-reward-sprite-stack">
        {targets.map((option) => (
          <Sprite
            key={`${option.sourceId}:${option.targetId}`}
            cardId={option.targetId}
            emoji={CARD_MAP[option.targetId]?.emoji || "?"}
            size={62}
          />
        ))}
      </div>
    );
  }

  if (reward.kind === "evolution_set") {
    return (
      <div className="roguelike-reward-sprite-stack is-line">
        {reward.lineIds.slice(0, 3).map((cardId) => (
          <Sprite key={cardId} cardId={cardId} emoji={CARD_MAP[cardId]?.emoji || "?"} size={58} />
        ))}
      </div>
    );
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

export default function RoguelikeMode({ onExit }) {
  const [phase, setPhase] = useState("intro");
  const [run, setRun] = useState(() => initialRun());
  const [rewards, setRewards] = useState([]);
  const [selectionReward, setSelectionReward] = useState(null);
  const [battleNonce, setBattleNonce] = useState(0);
  const [, setSetupPulse] = useState(0);

  const encounter = ENCOUNTERS[run.stage] || null;
  const deckCounts = useMemo(() => {
    const counts = new Map();
    run.deck.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    return [...counts.entries()]
      .map(([id, count]) => ({ card: CARD_MAP[id], count }))
      .filter((entry) => entry.card)
      .sort(
        (a, b) =>
          (a.card.cost || 0) - (b.card.cost || 0) ||
          a.card.name.localeCompare(b.card.name),
      );
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
    const setupKey = `${encounter.id}:${battleNonce}`;
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

    game._roguelikeSetupKey = setupKey;
    game._roguelikeRun = {
      stage: run.stage,
      maxHp: run.maxHp,
      openingHandBonus: handBonus,
      startingManaBonus: manaBonus,
    };
    setSetupPulse((value) => value + 1);
  }, [phase, encounter, battleNonce, run]);

  function startRun() {
    playSfx("click");
    setRun(initialRun());
    setRewards([]);
    setSelectionReward(null);
    setPhase("preview");
  }

  function beginBattle() {
    if (!encounter) return;
    playSfx("click");
    setBattleNonce((value) => value + 1);
    setPhase("battle");
  }

  function finishBattle(winner) {
    const game = window.__pokeBattleGame;
    if (winner !== "player") {
      playSfx("buzzer");
      setPhase("defeat");
      return;
    }

    const remainingHp = Math.max(
      1,
      Math.min(run.maxHp, game?.players?.player?.hp ?? run.hp),
    );
    if (run.stage >= ENCOUNTERS.length - 1) {
      setRun((current) => ({ ...current, hp: remainingHp }));
      setPhase("victory");
      return;
    }

    const rewardRun = { ...run, hp: remainingHp };
    setRun((current) => ({ ...current, hp: remainingHp }));
    setRewards(makeRewards(rewardRun));
    setSelectionReward(null);
    setPhase("reward");
  }

  function finishReward(reward, chosenTargetId = null) {
    playSfx("click");
    setRun((current) => {
      const next = {
        ...current,
        deck: [...current.deck],
        rewardsTaken: [...current.rewardsTaken],
      };

      if (reward.kind === "basic_card" || reward.kind === "support_card") {
        next.deck.push(reward.cardId);
        next.rewardsTaken.push(CARD_MAP[reward.cardId]?.name || reward.cardId);
      } else if (reward.kind === "random_evolution") {
        next.deck.push(reward.targetId);
        next.rewardsTaken.push(`진화 · ${CARD_MAP[reward.targetId]?.name || reward.targetId}`);
      } else if (reward.kind === "choose_evolution" && chosenTargetId) {
        next.deck.push(chosenTargetId);
        next.rewardsTaken.push(`선택 진화 · ${CARD_MAP[chosenTargetId]?.name || chosenTargetId}`);
      } else if (reward.kind === "evolution_set") {
        next.deck.push(...reward.lineIds);
        next.rewardsTaken.push(`진화 세트 · ${reward.lineIds.map((id) => CARD_MAP[id]?.name || id).join("/")}`);
      } else if (reward.kind === "upgrade" && reward.id.includes("max_hp")) {
        next.maxHp += 5;
        next.hp = Math.min(next.maxHp, next.hp + 5);
        next.rewardsTaken.push("체력 단련");
      } else if (reward.kind === "upgrade" && reward.id.includes("heal")) {
        next.hp = Math.min(next.maxHp, next.hp + 10);
        next.rewardsTaken.push("응급 치료");
      } else if (reward.kind === "upgrade" && reward.id.includes("opening_hand")) {
        next.openingHandBonus += 1;
        next.rewardsTaken.push("준비된 작전");
      } else if (reward.kind === "upgrade" && reward.id.includes("starting_mana")) {
        next.startingManaBonus += 1;
        next.rewardsTaken.push("에너지 저장");
      }

      next.stage += 1;
      return next;
    });
    setRewards([]);
    setSelectionReward(null);
    setPhase("preview");
  }

  function chooseReward(reward) {
    if (reward.kind === "choose_evolution") {
      playSfx("click");
      setSelectionReward(reward);
      return;
    }
    finishReward(reward);
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
          key={`${encounter.id}:${battleNonce}`}
          trainer={encounter}
          deck={run.deck}
          deckShiny={{}}
          onFinish={finishBattle}
        />
      </div>
    );
  }

  return (
    <div className="roguelike-root">
      <div className="roguelike-screen">
        <header className="roguelike-header">
          <button className="btn-ghost small" onClick={exitMode}>◀ 메인 메뉴</button>
          <div>
            <div className="roguelike-kicker">END CONTENT · PROTOTYPE</div>
            <h1>악의 조직 소탕전</h1>
          </div>
          {phase !== "intro" ? <RunStatus run={run} /> : <span />}
        </header>

        {phase === "intro" && (
          <section className="roguelike-panel roguelike-intro">
            <div className="roguelike-emblem">☠️</div>
            <h2>내 덱 없이 시작하는 로그라이크</h2>
            <p>
              지급된 24장 임시 덱으로 악의 조직을 연속 격파하세요. 승리할 때마다 등급이 무작위인 보상 3개 중 하나를 고르고,
              포켓몬을 모아 진화 라인을 완성하며 남은 체력은 다음 전투까지 이어집니다.
            </p>
            <div className="roguelike-route">
              {ENCOUNTERS.map((entry, index) => (
                <span key={entry.id}>{index + 1}. {entry.name}</span>
              ))}
            </div>
            <button className="btn-primary big" onClick={startRun}>소탕 작전 시작</button>
          </section>
        )}

        {phase === "preview" && encounter && (
          <div className="roguelike-columns">
            <section className="roguelike-panel roguelike-encounter">
              <div className="roguelike-stage">STAGE {run.stage + 1} / {ENCOUNTERS.length}</div>
              <div className="roguelike-villain-sprite">
                <TrainerSprite spriteKey={encounter.sprite} emoji="?" size={132} />
              </div>
              <div className="roguelike-faction">{encounter.faction}</div>
              <h2>{encounter.name}</h2>
              <p>{encounter.title}</p>
              <div className="roguelike-enemy-stats">
                <span>❤️ 적 체력 {encounter.hp}</span>
                <span>AI Lv.{encounter.aiLevel}</span>
              </div>
              <button className="btn-primary big" onClick={beginBattle}>전투 시작 ▶</button>
            </section>

            <section className="roguelike-panel roguelike-deck-panel">
              <h3>현재 런 덱</h3>
              <div className="roguelike-deck-list">
                {deckCounts.map(({ card, count }) => (
                  <div key={card.id} className="roguelike-deck-row">
                    <span>{card.name}</span>
                    <small>{cardSummary(card)}</small>
                    <strong>×{count}</strong>
                  </div>
                ))}
              </div>
              <div className="roguelike-upgrade-log">
                <strong>획득 보상</strong>
                <p>{run.rewardsTaken.length ? run.rewardsTaken.join(" · ") : "아직 없음"}</p>
              </div>
            </section>
          </div>
        )}

        {phase === "reward" && !selectionReward && (
          <section className="roguelike-panel roguelike-reward-panel">
            <div className="roguelike-stage-clear">STAGE CLEAR</div>
            <h2>보상 하나를 선택하세요</h2>
            <p>세 보상의 등급과 종류는 매번 무작위입니다. 높은 등급일수록 진화 선택권과 완성 세트가 등장합니다.</p>
            <div className="roguelike-rewards">
              {rewards.map((reward) => {
                const rarity = RARITY_META[reward.rarity] || RARITY_META.C;
                const detail = reward.kind === "random_evolution"
                  ? `${CARD_MAP[reward.sourceId]?.name} → ${CARD_MAP[reward.targetId]?.name}`
                  : reward.kind === "evolution_set"
                    ? reward.lineIds.map((id) => CARD_MAP[id]?.name || id).join(" → ")
                    : reward.kind === "upgrade"
                      ? reward.itemLabel
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

        {phase === "reward" && selectionReward && (
          <section className="roguelike-panel roguelike-reward-panel roguelike-evolution-picker">
            <div className="roguelike-stage-clear">{RARITY_META[selectionReward.rarity]?.label || "에픽"} · 선택 진화</div>
            <h2>진화시킬 포켓몬을 선택하세요</h2>
            <p>현재 런 덱에 실제로 들어있는 포켓몬의 다음 진화체만 표시됩니다.</p>
            <div className="roguelike-evolution-options">
              {getEvolutionOptions(run.deck).map((option) => (
                <button
                  key={`${option.sourceId}:${option.targetId}`}
                  className="roguelike-evolution-option"
                  onClick={() => finishReward(selectionReward, option.targetId)}
                >
                  <div className="roguelike-evolution-pair">
                    <Sprite cardId={option.sourceId} emoji={CARD_MAP[option.sourceId]?.emoji || "?"} size={56} />
                    <span>→</span>
                    <Sprite cardId={option.targetId} emoji={CARD_MAP[option.targetId]?.emoji || "?"} size={72} />
                  </div>
                  <strong>{CARD_MAP[option.sourceId]?.name} → {CARD_MAP[option.targetId]?.name}</strong>
                  <small>{cardSummary(CARD_MAP[option.targetId])}</small>
                </button>
              ))}
            </div>
            <button className="btn-ghost small roguelike-picker-back" onClick={() => setSelectionReward(null)}>◀ 다른 보상 보기</button>
          </section>
        )}

        {phase === "defeat" && (
          <section className="roguelike-panel roguelike-end-panel is-defeat">
            <div className="roguelike-emblem">💀</div>
            <h2>소탕 작전 실패</h2>
            <p>{run.stage + 1}번째 전투에서 쓰러졌습니다. 이번 런의 덱과 강화는 초기화됩니다.</p>
            <div className="roguelike-end-actions">
              <button className="btn-primary" onClick={startRun}>새 런 시작</button>
              <button className="btn-secondary" onClick={exitMode}>메인 메뉴</button>
            </div>
          </section>
        )}

        {phase === "victory" && (
          <section className="roguelike-panel roguelike-end-panel is-victory">
            <div className="roguelike-emblem">🏆</div>
            <h2>악의 조직 소탕 완료!</h2>
            <p>로켓단부터 플라즈마단까지 초기 프로토타입 루트를 모두 격파했습니다.</p>
            <RunStatus run={run} />
            <div className="roguelike-end-actions">
              <button className="btn-primary" onClick={startRun}>다시 도전</button>
              <button className="btn-secondary" onClick={exitMode}>메인 메뉴</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
