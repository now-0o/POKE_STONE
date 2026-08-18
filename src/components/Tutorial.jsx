import React, { useMemo, useRef, useState, useEffect } from "react";
import { playSfx } from "../audio.js";
import { CARD_MAP, TYPE_CHART, TYPE_COLORS } from "../data/cards.js";
import { HandCard, Sprite } from "./Card.jsx";

const DRAG_THRESHOLD = 8;

const LESSONS = [
  {
    id: "summon",
    title: "포켓몬을 필드에 내기",
    instruction: "손패의 파이리를 내 필드로 드래그해서 놓으세요.",
  },
  {
    id: "turn",
    title: "턴을 넘기기",
    instruction: "방금 낸 포켓몬은 보통 바로 공격할 수 없습니다. 턴 종료를 눌러보세요.",
  },
  {
    id: "attack",
    title: "드래그로 공격하기",
    instruction: "파이리를 잡아 상대 이상해씨까지 드래그한 뒤 놓으세요.",
  },
  {
    id: "evolve",
    title: "진화하기",
    instruction: "손패의 리자드를 필드의 파이리 위로 드래그해서 놓으세요.",
  },
  {
    id: "technique",
    title: "기술 카드 사용하기",
    instruction: "화염방사를 상대 이상해풀 위로 드래그해서 놓으세요.",
  },
  {
    id: "status",
    title: "상태이상 만들기",
    instruction: "냉동빔을 액스라이즈 위로 드래그해서 얼려보세요.",
  },
  {
    id: "weather",
    title: "날씨 바꾸기",
    instruction: "쾌청 카드를 배틀 필드 쪽으로 드래그해서 사용하세요.",
  },
  {
    id: "taunt",
    title: "도발 상대하기",
    instruction: "날쌩마를 상대 트레이너에게 드래그해 직접 공격을 먼저 시도해보세요.",
  },
  {
    id: "type",
    title: "타입 상성으로 피해 바꾸기",
    instruction: "먼저 10만볼트를 라프라스에 드래그하세요. 효과가 굉장한 피해부터 확인합니다.",
  },
];

function unit(cardId, uid, hp = null, extra = {}) {
  const card = CARD_MAP[cardId];
  return {
    uid,
    cardId,
    atk: card?.atk || 0,
    hp: hp ?? card?.hp ?? 1,
    maxHp: card?.hp ?? hp ?? 1,
    status: null,
    ...extra,
  };
}

function typedDamage(base, moveType, targetCardId) {
  const target = CARD_MAP[targetCardId];
  const mult = TYPE_CHART[moveType]?.[target?.type] ?? 1;
  if (base <= 0) return 0;
  if (mult === 0) return 0;
  if (mult > 1) return Math.ceil(base * mult);
  if (mult < 1) return Math.max(1, Math.floor(base * mult));
  return base;
}

function initialScene(index) {
  switch (index) {
    case 0:
      return {
        mana: 3,
        maxMana: 3,
        hand: ["charmander"],
        player: [],
        enemy: [],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: ["연습 배틀 시작! 파이리를 필드에 내보자."],
      };
    case 1:
      return {
        mana: 2,
        maxMana: 3,
        hand: [],
        player: [unit("charmander", "p1")],
        enemy: [],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: ["파이리를 냈다! 소환한 턴에는 아직 공격할 수 없다."],
      };
    case 2:
      return {
        mana: 4,
        maxMana: 4,
        hand: [],
        player: [unit("charmander", "p1")],
        enemy: [unit("bulbasaur", "e1")],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: ["다시 내 턴이다. 파이리는 이제 공격할 수 있다!"],
      };
    case 3:
      return {
        mana: 5,
        maxMana: 5,
        hand: ["charmeleon"],
        player: [unit("charmander", "p1", 1)],
        enemy: [],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: ["파이리는 앞선 전투에서 피해 1을 받은 상태다."],
      };
    case 4:
      return {
        mana: 5,
        maxMana: 5,
        hand: ["flamethrower"],
        player: [unit("charmeleon", "p1", 2)],
        enemy: [unit("ivysaur", "e1")],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: ["기술 카드도 마나를 사용한다. 대상을 지정해보자."],
      };
    case 5:
      return {
        mana: 6,
        maxMana: 6,
        hand: ["icebeam"],
        player: [unit("lapras", "p1")],
        enemy: [unit("haxorus", "e1", 9, { maxHp: 9 })],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: ["상태이상 기술은 피해와 함께 행동을 제한할 수 있다."],
      };
    case 6:
      return {
        mana: 5,
        maxMana: 5,
        hand: ["sunnyday"],
        player: [unit("charmander", "p1")],
        enemy: [],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: ["현재 날씨는 없음. 쾌청을 사용해보자."],
      };
    case 7:
      return {
        mana: 6,
        maxMana: 6,
        hand: [],
        player: [unit("rapidash", "p1")],
        enemy: [unit("lapras", "e1")],
        playerHp: 20,
        enemyHp: 16,
        weather: null,
        logs: ["상대 필드에 도발 포켓몬 라프라스가 있다."],
        tauntBlockedOnce: false,
      };
    default:
      return {
        mana: 10,
        maxMana: 10,
        hand: ["thunderbolt", "flamethrower", "quickattack"],
        player: [unit("pikachu", "p1")],
        enemy: [
          unit("lapras", "e1", 12, { maxHp: 12 }),
          unit("geodude", "e2", 6, { maxHp: 6 }),
        ],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: ["같은 기본 피해도 타입 상성에 따라 실제 피해가 달라진다."],
        typeStep: 0,
      };
  }
}

function statusLabel(status) {
  if (status === "ice") return "얼음";
  if (status === "burn") return "화상";
  if (status === "para") return "마비";
  if (status === "sleep") return "Zz";
  if (status === "poison") return "독";
  return "";
}

function MiniUnit({
  value,
  selected,
  targetable,
  canAct,
  onClick,
  onPointerDown,
  dropZone,
  evolveFx,
  summonFx,
  typeHint,
}) {
  const card = CARD_MAP[value.cardId];
  if (!card) return null;

  return (
    <button
      type="button"
      className={[
        "field-unit",
        "tutorial-field-unit",
        selected ? "selected" : "",
        targetable ? "targetable" : "",
        canAct ? "can-act" : "",
        value.status === "ice" ? "frozen" : "",
        evolveFx ? "tutorial-evolving" : "",
        summonFx ? "tutorial-summoning" : "",
      ].join(" ")}
      style={{ "--type-color": TYPE_COLORS[card.type] }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      data-tutorial-drop={dropZone}
      data-uid={value.uid}
    >
      {typeHint && <div className="tutorial-type-hint">{typeHint}</div>}
      {evolveFx && (
        <div className="tutorial-evolve-overlay" aria-hidden="true">
          <i className="tutorial-evolve-ring ring-a" />
          <i className="tutorial-evolve-ring ring-b" />
          <i className="tutorial-evolve-flash" />
        </div>
      )}
      {value.status && (
        <div className={`status-overlay status-${value.status}`}>
          <span>{statusLabel(value.status)}</span>
        </div>
      )}
      {card.ability === "taunt" && <div className="taunt-badge">도발</div>}
      <div className="unit-art">
        <Sprite cardId={card.id} emoji={card.emoji} size={44} />
      </div>
      <div className="unit-name">{card.name}</div>
      <div className="unit-orb orb-atk">{value.atk}</div>
      <div className={`unit-orb orb-hp ${value.hp < value.maxHp ? "hurt" : ""}`}>
        {value.hp}
      </div>
    </button>
  );
}

function Mana({ current, max }) {
  return (
    <div className="mana-display tutorial-mana" aria-label={`마나 ${current} / ${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span key={index} className={`mana-pip ${index < current ? "full" : "empty"}`} />
      ))}
      <span className="mana-num">{current}/{max}</span>
    </div>
  );
}

function Weather({ weather }) {
  const label = weather === "sun" ? "쾌청" : weather === "rain" ? "비" : weather === "sand" ? "모래바람" : "날씨 없음";
  return (
    <div className={`weather-indicator ${weather || ""}`}>
      <span className="weather-dot" />
      {label}
    </div>
  );
}

function Hero({ enemy = false, hp, targetable, onClick }) {
  return (
    <button
      type="button"
      className={[
        "hero-bar",
        enemy ? "enemy-bar" : "",
        targetable ? "targetable tutorial-hero-pulse" : "",
        "tutorial-hero-bar",
      ].join(" ")}
      onClick={onClick}
      data-tutorial-drop={enemy ? "enemy-hero" : "my-hero"}
    >
      <div className="hero-portrait">
        <span className="hero-name">{enemy ? "연습 상대" : "플레이어"}</span>
        <span className="hero-hp">HP {hp}</span>
      </div>
      <div className="hero-info">
        <div className="hero-sub">{enemy ? "상대 트레이너" : "내 트레이너"}</div>
      </div>
    </button>
  );
}

export default function Tutorial({ onBack }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [scene, setScene] = useState(() => initialScene(0));
  const [done, setDone] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [coachText, setCoachText] = useState(LESSONS[0].instruction);
  const [successText, setSuccessText] = useState("");
  const [dragCard, setDragCard] = useState(null);
  const [aimUid, setAimUid] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [moveFx, setMoveFx] = useState(null);
  const [impactFx, setImpactFx] = useState(null);
  const [evolveFxUid, setEvolveFxUid] = useState(null);
  const [summonFxUid, setSummonFxUid] = useState(null);
  const [weatherFx, setWeatherFx] = useState(false);

  const dragInfo = useRef(null);
  const aimInfo = useRef(null);
  const aimLineRef = useRef(null);
  const suppressClickUntil = useRef(0);
  const timers = useRef([]);

  const lesson = LESSONS[lessonIndex];
  const progress = ((lessonIndex + (done ? 1 : 0)) / LESSONS.length) * 100;
  const playerCanAct = useMemo(() => lesson.id === "attack" || lesson.id === "taunt", [lesson.id]);

  useEffect(() => () => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  }, []);

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }

  function replaceScene(next) {
    setScene((prev) => ({ ...prev, ...next }));
  }

  function complete(message) {
    playSfx("click");
    setDone(true);
    setSuccessText(message);
    setDragCard(null);
    setAimUid(null);
  }

  function fail(message) {
    playSfx("buzzer");
    setCoachText(message);
  }

  function clearFx() {
    setMoveFx(null);
    setImpactFx(null);
    setEvolveFxUid(null);
    setSummonFxUid(null);
    setWeatherFx(false);
  }

  function goLesson(index) {
    const safe = Math.max(0, Math.min(LESSONS.length - 1, index));
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
    playSfx("click");
    setLessonIndex(safe);
    setScene(initialScene(safe));
    setDone(false);
    setSelectedCard(null);
    setSelectedUnit(null);
    setDragCard(null);
    setAimUid(null);
    setAnimating(false);
    clearFx();
    setSuccessText("");
    setCoachText(LESSONS[safe].instruction);
  }

  function rectForUid(uid) {
    const el = document.querySelector(`.tutorial-interactive [data-uid="${uid}"]`);
    return el?.getBoundingClientRect() || null;
  }

  function showImpact(uid, amount, label = null) {
    const rect = rectForUid(uid);
    if (!rect) return;
    setImpactFx({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      amount,
      label,
      key: `${Date.now()}-${uid}`,
    });
    const el = document.querySelector(`.tutorial-interactive [data-uid="${uid}"]`);
    el?.animate(
      [
        { transform: "translateX(0)", filter: "brightness(1)" },
        { transform: "translateX(-6px)", filter: "brightness(2.2) saturate(1.5)" },
        { transform: "translateX(5px)", filter: "brightness(1.8)" },
        { transform: "translateX(0)", filter: "brightness(1)" },
      ],
      { duration: 330, easing: "ease-out" },
    );
    later(() => setImpactFx(null), 650);
  }

  function runAttackFx(sourceUid, targetKind, targetUid, damage, onImpact, onFinish) {
    const source = document.querySelector(`.tutorial-interactive [data-uid="${sourceUid}"]`);
    const target = targetKind === "hero"
      ? document.querySelector('.tutorial-interactive [data-tutorial-drop="enemy-hero"]')
      : document.querySelector(`.tutorial-interactive [data-uid="${targetUid}"]`);

    if (!source || !target) {
      onImpact?.();
      onFinish?.();
      return;
    }

    setAnimating(true);
    const sr = source.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    let dx = tr.left + tr.width / 2 - (sr.left + sr.width / 2);
    let dy = tr.top + tr.height / 2 - (sr.top + sr.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > 0) {
      const ratio = Math.max(0, (distance - 34) / distance);
      dx *= ratio;
      dy *= ratio;
    }

    source.animate(
      [
        { transform: "translate(0,0) scale(1)", offset: 0 },
        { transform: `translate(${-dx * 0.08}px, ${-dy * 0.08}px) scale(.95)`, offset: .22 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.1)`, offset: .62 },
        { transform: `translate(${dx * .82}px, ${dy * .82}px) scale(.98)`, offset: .76 },
        { transform: "translate(0,0) scale(1)", offset: 1 },
      ],
      { duration: 650, easing: "cubic-bezier(.18,.72,.22,1)" },
    );

    later(() => {
      if (targetKind !== "hero" && damage > 0) showImpact(targetUid, damage);
      onImpact?.();
    }, 400);

    later(() => {
      setAnimating(false);
      onFinish?.();
    }, 700);
  }

  function runMoveFx(theme, targetUid, damage, onImpact, onFinish) {
    const source = document.querySelector('.tutorial-interactive [data-tutorial-drop="my-hero"]');
    const target = document.querySelector(`.tutorial-interactive [data-uid="${targetUid}"]`);
    if (!source || !target) {
      onImpact?.();
      onFinish?.();
      return;
    }

    const sr = source.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const x1 = sr.left + sr.width / 2;
    const y1 = sr.top;
    const x2 = tr.left + tr.width / 2;
    const y2 = tr.top + tr.height / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;

    setAnimating(true);
    setMoveFx({
      theme,
      x: x1,
      y: y1,
      distance: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
      key: Date.now(),
    });

    later(() => {
      if (damage > 0) showImpact(targetUid, damage);
      onImpact?.();
    }, 360);

    later(() => {
      setMoveFx(null);
      setAnimating(false);
      onFinish?.();
    }, 720);
  }

  function performSummon() {
    setAnimating(true);
    replaceScene({
      mana: 2,
      hand: [],
      player: [unit("charmander", "p1")],
      logs: [...scene.logs, "파이리를 냈다! 마나 1을 사용했다."],
    });
    setSummonFxUid("p1");
    later(() => {
      setSummonFxUid(null);
      setAnimating(false);
      complete("좋아요. 기본 포켓몬은 손패에서 필드로 드래그해 소환할 수 있습니다.");
    }, 560);
  }

  function performEvolve() {
    const damageTaken = 2 - scene.player[0].hp;
    const nextHp = Math.max(1, CARD_MAP.charmeleon.hp - damageTaken);
    setAnimating(true);
    setEvolveFxUid("p1");
    playSfx("click");

    later(() => {
      replaceScene({
        mana: 2,
        hand: [],
        player: [unit("charmeleon", "p1", nextHp)],
        logs: [...scene.logs, `파이리가 리자드로 진화했다! 받은 피해 ${damageTaken}은 유지된다.`],
      });
    }, 430);

    later(() => {
      setEvolveFxUid(null);
      setAnimating(false);
      setSelectedCard(null);
      complete("진화할 때도 실제 배틀처럼 진화 연출이 재생됩니다. 받은 피해는 그대로 유지됩니다.");
    }, 900);
  }

  function performTechnique() {
    const damage = typedDamage(4, "불꽃", "ivysaur");
    runMoveFx(
      "fire",
      "e1",
      damage,
      () => {
        replaceScene({
          mana: 2,
          hand: [],
          enemy: [],
          logs: [...scene.logs, `화염방사! 불꽃 → 풀 약점 ×1.5, 피해 ${damage}!`],
        });
      },
      () => {
        setSelectedCard(null);
        complete("화염방사는 실제 배틀처럼 불꽃 스트림과 피격 연출 뒤에 피해가 적용됩니다.");
      },
    );
  }

  function performStatus(uid) {
    const damage = typedDamage(3, "얼음", "haxorus");
    runMoveFx(
      "ice",
      uid,
      damage,
      () => {
        const nextEnemy = scene.enemy.map((u) =>
          u.uid === uid ? { ...u, hp: Math.max(1, u.hp - damage), status: "ice" } : u,
        );
        replaceScene({
          mana: 3,
          hand: [],
          enemy: nextEnemy,
          logs: [...scene.logs, `냉동빔! 얼음 → 드래곤 약점, 피해 ${damage}. 액스라이즈가 얼어붙었다!`],
        });
      },
      () => {
        setSelectedCard(null);
        complete("냉동빔의 빔/피격 연출 뒤 얼음 상태가 카드 위에 표시됩니다.");
      },
    );
  }

  function performWeather() {
    setAnimating(true);
    setWeatherFx(true);
    playSfx("click");
    later(() => {
      const boosted = scene.player.map((u) => ({ ...u, atk: u.cardId === "charmander" ? 2 : u.atk }));
      replaceScene({
        mana: 3,
        hand: [],
        weather: "sun",
        player: boosted,
        logs: [...scene.logs, "쾌청! 필드가 밝아지며 불꽃 포켓몬의 공격력이 올라갔다."],
      });
    }, 260);
    later(() => {
      setWeatherFx(false);
      setAnimating(false);
      complete("날씨 기술도 필드 전체 연출과 함께 적용됩니다. 쾌청에서는 불꽃 쪽이 유리해집니다.");
    }, 850);
  }

  function performAttack() {
    runAttackFx(
      "p1",
      "unit",
      "e1",
      2,
      () => {
        replaceScene({
          player: [unit("charmander", "p1", 1)],
          enemy: [],
          logs: [...scene.logs, "파이리가 돌진! 불꽃 → 풀 약점으로 피해 2. 이상해씨의 반격으로 파이리도 피해 1!"],
        });
      },
      () => {
        setSelectedUnit(null);
        complete("공격 포켓몬이 실제 대상까지 돌진하고, 명중 순간 피해와 반격이 적용됩니다.");
      },
    );
  }

  function performTauntAttack() {
    runAttackFx(
      "p1",
      "unit",
      "e1",
      4,
      () => {
        replaceScene({
          enemy: [],
          logs: [...scene.logs, "날쌩마가 라프라스에게 돌진했다! 도발 포켓몬을 처리했다."],
        });
      },
      () => {
        setSelectedUnit(null);
        complete("도발 포켓몬이 있으면 그 포켓몬을 먼저 처리해야 상대 트레이너를 직접 공격할 수 있습니다.");
      },
    );
  }

  function performTypeLesson(cardId, uid) {
    const step = scene.typeStep || 0;

    if (step === 0 && cardId === "thunderbolt" && uid === "e1") {
      const damage = typedDamage(4, "전기", "lapras");
      runMoveFx(
        "electric",
        uid,
        damage,
        () => {
          replaceScene({
            mana: 7,
            hand: scene.hand.filter((id) => id !== "thunderbolt"),
            enemy: scene.enemy.map((u) => u.uid === uid ? { ...u, hp: u.hp - damage } : u),
            logs: [...scene.logs, `10만볼트 기본 피해 4 × 1.5 = ${damage}! 효과가 굉장하다!`],
            typeStep: 1,
          });
          setCoachText("이번에는 화염방사를 같은 라프라스에 드래그하세요. 반감 피해를 비교합니다.");
        },
      );
      return;
    }

    if (step === 1 && cardId === "flamethrower" && uid === "e1") {
      const damage = typedDamage(4, "불꽃", "lapras");
      runMoveFx(
        "fire",
        uid,
        damage,
        () => {
          replaceScene({
            mana: 4,
            hand: scene.hand.filter((id) => id !== "flamethrower"),
            enemy: scene.enemy.map((u) => u.uid === uid ? { ...u, hp: Math.max(1, u.hp - damage) } : u),
            logs: [...scene.logs, `화염방사 기본 피해 4 × 0.5 = ${damage}. 효과가 별로다.`],
            typeStep: 2,
          });
          setCoachText("마지막으로 전광석화를 꼬마돌에 드래그하세요. 1 피해 최소 보정을 확인합니다.");
        },
      );
      return;
    }

    if (step === 2 && cardId === "quickattack" && uid === "e2") {
      const damage = typedDamage(1, "노말", "geodude");
      runMoveFx(
        "normal",
        uid,
        damage,
        () => {
          replaceScene({
            mana: 3,
            hand: [],
            enemy: scene.enemy.map((u) => u.uid === uid ? { ...u, hp: Math.max(1, u.hp - damage) } : u),
            logs: [...scene.logs, `전광석화 기본 피해 1 × 0.5는 0.5지만 반감 피해는 최소 ${damage}!`],
            typeStep: 3,
          });
        },
        () => complete("상성 정리: 유리하면 피해 증가, 불리하면 감소. 반감 계산이 1 미만이어도 최소 1 피해를 줍니다. 단, 타입 무효(0배)는 피해 0입니다."),
      );
      return;
    }

    fail(
      step === 0
        ? "10만볼트를 라프라스에 사용하세요."
        : step === 1
          ? "화염방사를 라프라스에 사용하세요."
          : "전광석화를 꼬마돌에 사용하세요.",
    );
  }

  function resolveCardDrop(cardId, zone, uid) {
    if (done || animating) return;

    if (lesson.id === "summon" && cardId === "charmander" && zone === "my-field") {
      performSummon();
      return;
    }
    if (lesson.id === "evolve" && cardId === "charmeleon" && zone === "unit-player" && uid === "p1") {
      performEvolve();
      return;
    }
    if (lesson.id === "technique" && cardId === "flamethrower" && zone === "unit-enemy" && uid === "e1") {
      performTechnique();
      return;
    }
    if (lesson.id === "status" && cardId === "icebeam" && zone === "unit-enemy" && uid === "e1") {
      performStatus(uid);
      return;
    }
    if (lesson.id === "weather" && cardId === "sunnyday" && zone) {
      performWeather();
      return;
    }
    if (lesson.id === "type" && zone === "unit-enemy" && uid) {
      performTypeLesson(cardId, uid);
      return;
    }

    fail("카드를 안내된 위치까지 드래그한 뒤 그 위에서 놓아보세요.");
  }

  function onHandPointerDown(e, cardId) {
    if (done || animating || (e.button !== undefined && e.button !== 0)) return;

    dragInfo.current = {
      cardId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };

    const onMove = (ev) => {
      const info = dragInfo.current;
      if (!info) return;
      const distance = Math.hypot(ev.clientX - info.startX, ev.clientY - info.startY);
      if (!info.moved && distance > DRAG_THRESHOLD) {
        info.moved = true;
        setSelectedCard(null);
      }
      if (info.moved) setDragCard({ cardId: info.cardId, x: ev.clientX, y: ev.clientY });
    };

    const onUp = (ev) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const info = dragInfo.current;
      dragInfo.current = null;
      setDragCard(null);
      if (!info?.moved) return;

      suppressClickUntil.current = Date.now() + 250;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const drop = el?.closest("[data-tutorial-drop]");
      resolveCardDrop(info.cardId, drop?.dataset.tutorialDrop || null, drop?.dataset.uid || null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function updateAimLine(x, y) {
    const line = aimLineRef.current;
    const start = aimInfo.current;
    if (!line || !start) return;
    line.setAttribute("x1", start.cx);
    line.setAttribute("y1", start.cy);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
  }

  useEffect(() => {
    if (aimUid && aimInfo.current) updateAimLine(aimInfo.current.x, aimInfo.current.y);
  }, [aimUid]);

  function resolveAttackDrop(uid, zone, targetUid) {
    if (done || animating) return;

    if (lesson.id === "attack") {
      if (zone === "unit-enemy" && targetUid === "e1") performAttack();
      else fail("공격 화살표를 상대 이상해씨까지 끌고 가서 놓으세요.");
      return;
    }

    if (lesson.id === "taunt") {
      if (zone === "enemy-hero") {
        if (!scene.tauntBlockedOnce) {
          setAnimating(true);
          runAttackFx("p1", "hero", null, 0, () => {
            playSfx("buzzer");
            replaceScene({
              tauntBlockedOnce: true,
              logs: [...scene.logs, "직접 공격 실패! 도발 포켓몬이 있어 트레이너를 공격할 수 없다."],
            });
            setCoachText("도발 때문에 직접 공격이 막혔습니다. 이번에는 날쌩마를 라프라스까지 드래그하세요.");
          });
          return;
        }
        fail("라프라스를 먼저 처리해야 합니다.");
        return;
      }
      if (zone === "unit-enemy" && targetUid === "e1" && scene.tauntBlockedOnce) {
        performTauntAttack();
        return;
      }
      fail(scene.tauntBlockedOnce ? "날쌩마를 라프라스 위까지 드래그하세요." : "먼저 상대 트레이너에게 직접 공격을 시도해보세요.");
    }
  }

  function onPlayerUnitPointerDown(value, e) {
    if (done || animating || !playerCanAct || (e.button !== undefined && e.button !== 0)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    aimInfo.current = {
      uid: value.uid,
      startX: e.clientX,
      startY: e.clientY,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };

    const onMove = (ev) => {
      const info = aimInfo.current;
      if (!info) return;
      const distance = Math.hypot(ev.clientX - info.startX, ev.clientY - info.startY);
      if (!info.moved && distance > DRAG_THRESHOLD) {
        info.moved = true;
        setSelectedUnit(null);
        setAimUid(info.uid);
      }
      if (info.moved) {
        info.x = ev.clientX;
        info.y = ev.clientY;
        updateAimLine(ev.clientX, ev.clientY);
      }
    };

    const onUp = (ev) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const info = aimInfo.current;
      aimInfo.current = null;
      setAimUid(null);
      if (!info?.moved) return;

      suppressClickUntil.current = Date.now() + 250;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const drop = el?.closest("[data-tutorial-drop]");
      resolveAttackDrop(info.uid, drop?.dataset.tutorialDrop || null, drop?.dataset.uid || null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function handleHand(cardId) {
    if (done || animating || Date.now() < suppressClickUntil.current) return;
    if (lesson.id === "summon" && cardId === "charmander") {
      fail("이번 연습에서는 파이리를 클릭하지 말고 내 필드까지 드래그해보세요.");
      return;
    }
    if (["evolve", "technique", "status", "weather", "type"].includes(lesson.id)) {
      setSelectedCard(cardId);
      fail("이번 단계는 실제 배틀처럼 카드를 대상까지 드래그해서 사용해보세요.");
      return;
    }
    fail("이번 튜토리얼은 실제 배틀처럼 드래그 조작으로 진행해보세요.");
  }

  function handlePlayerUnit(uid) {
    if (done || animating || Date.now() < suppressClickUntil.current) return;
    if (lesson.id === "attack" || lesson.id === "taunt") {
      setSelectedUnit(uid);
      fail("공격은 포켓몬을 클릭하는 대신 잡아서 상대까지 드래그해보세요.");
      return;
    }
    if (lesson.id === "evolve" && selectedCard === "charmeleon") {
      performEvolve();
      return;
    }
    fail("지금 안내된 드래그 조작을 해보세요.");
  }

  function handleEnemyUnit(uid) {
    if (done || animating || Date.now() < suppressClickUntil.current) return;
    if (lesson.id === "technique" && selectedCard === "flamethrower") {
      performTechnique();
      return;
    }
    if (lesson.id === "status" && selectedCard === "icebeam") {
      performStatus(uid);
      return;
    }
    if (lesson.id === "type" && selectedCard) {
      performTypeLesson(selectedCard, uid);
      return;
    }
    fail("카드나 공격 포켓몬을 대상 위까지 드래그해서 놓아보세요.");
  }

  function handleEnemyHero() {
    if (done || animating || Date.now() < suppressClickUntil.current) return;
    fail("공격할 포켓몬을 잡아 상대 트레이너까지 드래그해서 놓아보세요.");
  }

  function handleEndTurn() {
    if (done || animating || lesson.id !== "turn") return;
    replaceScene({
      mana: 4,
      maxMana: 4,
      logs: [...scene.logs, "턴 종료 → 상대 턴이 지나고 다시 내 턴. 최대 마나가 1 늘고 전부 회복됐다."],
    });
    complete("턴이 돌아오면 최대 마나가 증가하고 다시 채워집니다. 이제 앞서 낸 포켓몬도 공격할 수 있습니다.");
  }

  const draggingCardId = dragCard?.cardId || null;
  const targetEnemy = selectedUnit || selectedCard || draggingCardId || aimUid;
  const typeStep = scene.typeStep || 0;

  return (
    <div className="tutorial-screen tutorial-interactive">
      {dragCard && (
        <div className="tutorial-drag-ghost" style={{ left: dragCard.x, top: dragCard.y }}>
          <HandCard cardId={dragCard.cardId} playable ghost />
        </div>
      )}

      {aimUid && (
        <svg className="tutorial-aim-svg" aria-hidden="true">
          <defs>
            <marker id="tutorial-aim-head" markerWidth="7" markerHeight="7" refX="4.5" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill="#f5c542" />
            </marker>
          </defs>
          <line
            ref={aimLineRef}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            stroke="#f5c542"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="8 6"
            markerEnd="url(#tutorial-aim-head)"
          />
        </svg>
      )}

      {moveFx && (
        <div className="tutorial-fx-layer" aria-hidden="true">
          <div
            key={moveFx.key}
            className={`tutorial-move-line tutorial-move-${moveFx.theme}`}
            style={{
              left: moveFx.x,
              top: moveFx.y,
              width: moveFx.distance,
              transform: `rotate(${moveFx.angle}deg)`,
            }}
          >
            <i className="tutorial-move-glow" />
            <i className="tutorial-move-core" />
            <i className="tutorial-move-head" />
          </div>
        </div>
      )}

      {impactFx && (
        <div className="tutorial-fx-layer" aria-hidden="true">
          <div className="tutorial-impact" style={{ left: impactFx.x, top: impactFx.y }} key={impactFx.key}>
            <i />
            <strong>-{impactFx.amount}</strong>
            {impactFx.label && <span>{impactFx.label}</span>}
          </div>
        </div>
      )}

      <header className="tutorial-live-header">
        <button
          type="button"
          className="btn-ghost tutorial-back"
          onClick={() => {
            playSfx("click");
            onBack();
          }}
        >
          ◀ 메인 메뉴
        </button>
        <div className="tutorial-live-title">
          <span>INTERACTIVE TRAINING</span>
          <strong>실전 튜토리얼</strong>
        </div>
        <div className="tutorial-step-count">{lessonIndex + 1} / {LESSONS.length}</div>
      </header>

      <div className="tutorial-progress-track">
        <i style={{ width: `${progress}%` }} />
      </div>

      <section className="tutorial-coach" aria-live="polite">
        <div className="tutorial-coach-number">{String(lessonIndex + 1).padStart(2, "0")}</div>
        <div className="tutorial-coach-copy">
          <h1>{lesson.title}</h1>
          <p className={done ? "is-success" : ""}>{done ? successText : coachText}</p>
        </div>
        <div className="tutorial-coach-action">
          {done ? (
            lessonIndex < LESSONS.length - 1 ? (
              <button type="button" className="btn-primary" onClick={() => goLesson(lessonIndex + 1)}>
                다음 연습 ▶
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  playSfx("click");
                  onBack();
                }}
              >
                튜토리얼 완료
              </button>
            )
          ) : (
            <span className="tutorial-do-badge">{animating ? "연출 재생 중" : "드래그해서 해보세요"}</span>
          )}
        </div>
      </section>

      <main className="tutorial-stage">
        <div className="tutorial-battle-shell">
          <div className="tutorial-battle-board" data-tutorial-drop="board">
            {weatherFx && (
              <div className="tutorial-weather-fx" aria-hidden="true">
                <div className="tutorial-sun-core" />
                <i className="ray r1" /><i className="ray r2" /><i className="ray r3" /><i className="ray r4" />
                <strong>쾌청!</strong>
              </div>
            )}

            <Hero
              enemy
              hp={scene.enemyHp}
              targetable={lesson.id === "taunt" && !done}
              onClick={handleEnemyHero}
            />

            <div className="field enemy-field tutorial-field" data-tutorial-drop="enemy-field">
              {scene.enemy.length ? (
                scene.enemy.map((value) => {
                  let typeHint = null;
                  if (lesson.id === "type") {
                    if (value.uid === "e1") typeHint = typeStep === 0 ? "전기 1.5×" : typeStep === 1 ? "불꽃 0.5×" : "물 타입";
                    if (value.uid === "e2") typeHint = typeStep >= 2 ? "노말 0.5× · 최소 1" : "바위 타입";
                  }
                  return (
                    <MiniUnit
                      key={value.uid}
                      value={value}
                      targetable={!!targetEnemy && !done}
                      onClick={() => handleEnemyUnit(value.uid)}
                      dropZone="unit-enemy"
                      typeHint={typeHint}
                    />
                  );
                })
              ) : (
                <span className="field-empty">상대 필드</span>
              )}
            </div>

            <div className="mid-bar tutorial-mid-bar" data-tutorial-drop="board">
              <Weather weather={scene.weather} />
              <div className="battle-log tutorial-log">
                {scene.logs.slice(-3).map((entry, index) => (
                  <div key={`${entry}-${index}`}>• {entry}</div>
                ))}
              </div>
              <button
                type="button"
                className={`btn-endturn ${lesson.id === "turn" && !done ? "tutorial-action-pulse" : "disabled"}`}
                onClick={handleEndTurn}
              >
                턴 종료
              </button>
            </div>

            <div
              className={`field my-field tutorial-field ${draggingCardId === "charmander" ? "drop-ready" : ""}`}
              data-tutorial-drop="my-field"
            >
              {scene.player.length ? (
                scene.player.map((value) => (
                  <MiniUnit
                    key={value.uid}
                    value={value}
                    selected={selectedUnit === value.uid || aimUid === value.uid}
                    canAct={playerCanAct && !done}
                    targetable={lesson.id === "evolve" && (selectedCard === "charmeleon" || draggingCardId === "charmeleon")}
                    onClick={() => handlePlayerUnit(value.uid)}
                    onPointerDown={(e) => onPlayerUnitPointerDown(value, e)}
                    dropZone="unit-player"
                    evolveFx={evolveFxUid === value.uid}
                    summonFx={summonFxUid === value.uid}
                  />
                ))
              ) : (
                <span className="field-empty">포켓몬 카드를 여기로 드래그</span>
              )}
            </div>

            <Hero hp={scene.playerHp} />

            <div className="tutorial-hand-zone">
              <div className="tutorial-hand-head">
                <strong>내 손패</strong>
                {lesson.id === "type" && (
                  <span className="tutorial-type-progress">상성 실험 {Math.min(typeStep + 1, 3)} / 3</span>
                )}
                <Mana current={scene.mana} max={scene.maxMana} />
              </div>
              <div className="hand tutorial-hand">
                {scene.hand.length ? (
                  scene.hand.map((cardId, index) => (
                    <div className="tutorial-hand-card-wrap" key={`${cardId}-${index}`}>
                      <HandCard
                        cardId={cardId}
                        playable={!done && !animating}
                        selected={selectedCard === cardId}
                        dragOrigin={draggingCardId === cardId}
                        onClick={() => handleHand(cardId)}
                        onPointerDown={(e) => onHandPointerDown(e, cardId)}
                      />
                    </div>
                  ))
                ) : (
                  <span className="tutorial-empty-hand">손패 없음</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="tutorial-live-footer">
        <button
          type="button"
          className="btn-secondary"
          disabled={lessonIndex === 0 || animating}
          onClick={() => goLesson(lessonIndex - 1)}
        >
          ◀ 이전 연습
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={animating}
          onClick={() => goLesson(lessonIndex)}
        >
          ↻ 이 단계 다시하기
        </button>
      </div>
    </div>
  );
}
