import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Battle from "../../components/Battle.jsx";
import { Sprite, TrainerSprite } from "../../components/Card.jsx";
import { CARD_MAP } from "../../data/cards.js";
import { drawCard } from "../../engine/engine.js";
import { playBgm, playSfx } from "../../audio.js";

const STARTER_DECK = [
  "bulbasaur", "bulbasaur", "ivysaur", "venusaur",
  "charmander", "charmander", "charmeleon", "charizard",
  "squirtle", "squirtle", "wartortle", "blastoise",
  "pikachu", "pikachu", "raichu",
  "eevee", "eevee",
  "quickattack", "quickattack",
  "potion", "potion",
  "pokeball", "pokeball", "superball",
];

const FALLBACK_DECK_CARDS = [
  "rattata", "rattata", "pidgey", "pidgey", "quickattack", "potion", "pokeball",
];

const CARD_REWARD_POOL = [
  "bulbasaur", "ivysaur", "venusaur",
  "charmander", "charmeleon", "charizard",
  "squirtle", "wartortle", "blastoise",
  "pikachu", "raichu", "eevee", "vaporeon", "jolteon", "flareon",
  "growlithe", "arcanine", "lapras", "tauros",
  "snivy", "servine", "serperior",
  "tepig", "pignite", "emboar",
  "oshawott", "dewott", "samurott",
  "drilbur", "excadrill",
  "deino", "zweilous", "hydreigon",
  "litwick", "lampent", "chandelure",
  "quickattack", "thunderbolt", "flamethrower", "hydropump", "solarbeam",
  "scald", "voltswitch", "dragontail", "reflect", "lightscreen",
  "potion", "superball", "hyperball", "fullrestore", "lifeorb", "focussash",
].filter((id) => CARD_MAP[id]);

function makeDeck(pool, size = 30) {
  const valid = pool.filter((id) => CARD_MAP[id]);
  const source = valid.length ? valid : FALLBACK_DECK_CARDS.filter((id) => CARD_MAP[id]);
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
    id: "max_hp",
    itemSprite: "/sprites/items/eviolite.png",
    itemLabel: "진화의휘석",
    name: "체력 단련",
    desc: "최대 체력 +5. 현재 체력도 5 회복.",
  },
  {
    id: "heal",
    itemSprite: "/sprites/items/potion.png",
    itemLabel: "상처약",
    name: "응급 치료",
    desc: "현재 체력을 10 회복.",
  },
  {
    id: "opening_hand",
    itemSprite: "/sprites/items/adventure-rules.png",
    itemLabel: "모험의 규칙",
    name: "준비된 작전",
    desc: "이후 전투의 시작 손패 +1.",
  },
  {
    id: "starting_mana",
    itemSprite: "/sprites/items/normal-gem.png",
    itemLabel: "노말주얼",
    name: "에너지 저장",
    desc: "이후 전투 시작 시 최대 코스트와 현재 코스트 +1.",
  },
];

function randomItems(list, count) {
  const pool = [...list];
  const out = [];
  while (pool.length && out.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(index, 1)[0]);
  }
  return out;
}

function makeRewards() {
  const cards = randomItems(CARD_REWARD_POOL, 2).map((cardId) => ({
    kind: "card",
    id: `card:${cardId}`,
    cardId,
  }));
  const upgrade = randomItems(UPGRADE_POOL, 1).map((entry) => ({
    kind: "upgrade",
    ...entry,
  }));
  return randomItems([...cards, ...upgrade], 3);
}

function initialRun() {
  const deck = STARTER_DECK.filter((id) => CARD_MAP[id]);
  if (deck.length < 20) {
    const fallback = FALLBACK_DECK_CARDS.filter((id) => CARD_MAP[id]);
    while (deck.length < 24 && fallback.length) deck.push(fallback[deck.length % fallback.length]);
  }
  return {
    stage: 0,
    deck,
    hp: 40,
    maxHp: 40,
    openingHandBonus: 0,
    startingManaBonus: 0,
    rewardsTaken: [],
  };
}

function cardSummary(card) {
  if (!card) return "카드";
  if (card.kind === "pokemon") return `${card.type} · ${card.cost}코 · ${card.atk}/${card.hp}`;
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

export default function RoguelikeMode({ onExit }) {
  const [phase, setPhase] = useState("intro");
  const [run, setRun] = useState(() => initialRun());
  const [rewards, setRewards] = useState([]);
  const [battleNonce, setBattleNonce] = useState(0);
  const [, setSetupPulse] = useState(0);

  const encounter = ENCOUNTERS[run.stage] || null;
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

    const remainingHp = Math.max(1, Math.min(run.maxHp, game?.players?.player?.hp ?? run.hp));
    if (run.stage >= ENCOUNTERS.length - 1) {
      setRun((current) => ({ ...current, hp: remainingHp }));
      setPhase("victory");
      return;
    }

    setRun((current) => ({ ...current, hp: remainingHp }));
    setRewards(makeRewards());
    setPhase("reward");
  }

  function chooseReward(reward) {
    playSfx("click");
    setRun((current) => {
      const next = {
        ...current,
        deck: [...current.deck],
        rewardsTaken: [...current.rewardsTaken],
      };

      if (reward.kind === "card") {
        next.deck.push(reward.cardId);
        next.rewardsTaken.push(CARD_MAP[reward.cardId]?.name || reward.cardId);
      } else if (reward.id === "max_hp") {
        next.maxHp += 5;
        next.hp = Math.min(next.maxHp, next.hp + 5);
        next.rewardsTaken.push("체력 단련");
      } else if (reward.id === "heal") {
        next.hp = Math.min(next.maxHp, next.hp + 10);
        next.rewardsTaken.push("응급 치료");
      } else if (reward.id === "opening_hand") {
        next.openingHandBonus += 1;
        next.rewardsTaken.push("준비된 작전");
      } else if (reward.id === "starting_mana") {
        next.startingManaBonus += 1;
        next.rewardsTaken.push("에너지 저장");
      }

      next.stage += 1;
      return next;
    });
    setRewards([]);
    setPhase("preview");
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
              지급된 24장 임시 덱으로 악의 조직을 연속 격파하세요. 승리할 때마다 카드 또는 영구 강화를 하나 선택하고,
              남은 체력은 다음 전투까지 이어집니다.
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
                <strong>획득 강화</strong>
                <p>{run.rewardsTaken.length ? run.rewardsTaken.join(" · ") : "아직 없음"}</p>
              </div>
            </section>
          </div>
        )}

        {phase === "reward" && (
          <section className="roguelike-panel roguelike-reward-panel">
            <div className="roguelike-stage-clear">STAGE CLEAR</div>
            <h2>보상 하나를 선택하세요</h2>
            <p>카드를 덱에 추가하거나, 남은 런 전체에 적용되는 강화를 선택할 수 있습니다.</p>
            <div className="roguelike-rewards">
              {rewards.map((reward) => {
                if (reward.kind === "card") {
                  const card = CARD_MAP[reward.cardId];
                  return (
                    <button key={reward.id} className="roguelike-reward-card" onClick={() => chooseReward(reward)}>
                      <span className="roguelike-reward-tag">CARD</span>
                      <Sprite cardId={reward.cardId} emoji={card?.emoji || "?"} size={82} />
                      <strong>{card?.name || reward.cardId}</strong>
                      <small>{cardSummary(card)}</small>
                      <span className="roguelike-reward-desc">덱에 1장 추가</span>
                    </button>
                  );
                }
                return (
                  <button key={reward.id} className="roguelike-reward-card is-upgrade" onClick={() => chooseReward(reward)}>
                    <span className="roguelike-reward-tag">UPGRADE</span>
                    <img
                      className="roguelike-upgrade-item"
                      src={reward.itemSprite}
                      alt={reward.itemLabel || reward.name}
                      width={84}
                      height={84}
                      draggable={false}
                    />
                    <strong>{reward.name}</strong>
                    <small className="roguelike-item-label">{reward.itemLabel}</small>
                    <span className="roguelike-reward-desc">{reward.desc}</span>
                  </button>
                );
              })}
            </div>
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