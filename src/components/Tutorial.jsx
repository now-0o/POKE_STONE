import React, { useMemo, useRef, useState, useEffect } from "react";
import { playSfx } from "../audio.js";
import { CARD_MAP, TYPE_COLORS } from "../data/cards.js";
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
    id: "deck",
    title: "진화 라인으로 덱 짜기",
    instruction: "리자몽을 실제로 진화시킬 수 있도록 필요한 3장의 진화 라인을 골라보세요.",
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
        enemy: [unit("haxorus", "e1")],
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
        mana: 0,
        maxMana: 0,
        hand: [],
        player: [],
        enemy: [],
        playerHp: 20,
        enemyHp: 20,
        weather: null,
        logs: [],
        deckChosen: [],
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

function MiniUnit({ value, selected, targetable, canAct, onClick, onPointerDown, dropZone }) {
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
      ].join(" ")}
      style={{ "--type-color": TYPE_COLORS[card.type] }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      data-tutorial-drop={dropZone}
      data-uid={value.uid}
    >
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

function DeckChallenge({ chosen, onPick }) {
  const candidates = ["charmander", "charmeleon", "charizard", "flamethrower", "mewtwo"];
  return (
    <div className="tutorial-deck-challenge">
      <div className="tutorial-deck-slots">
        {[0, 1, 2].map((index) => {
          const cardId = chosen[index];
          return (
            <div key={index} className={`tutorial-deck-slot ${cardId ? "filled" : ""}`}>
              {cardId ? CARD_MAP[cardId]?.name : "?"}
            </div>
          );
        })}
      </div>
      <div className="tutorial-deck-candidates">
        {candidates.map((cardId) => (
          <div key={cardId} className={`tutorial-deck-card ${chosen.includes(cardId) ? "tutorial-deck-picked" : ""}`}>
            <HandCard
              cardId={cardId}
              playable={!chosen.includes(cardId)}
              selected={chosen.includes(cardId)}
              onClick={() => onPick(cardId)}
            />
          </div>
        ))}
      </div>
    </div>
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

  const dragInfo = useRef(null);
  const aimInfo = useRef(null);
  const aimLineRef = useRef(null);
  const suppressClickUntil = useRef(0);

  const lesson = LESSONS[lessonIndex];
  const progress = ((lessonIndex + (done ? 1 : 0)) / LESSONS.length) * 100;

  const playerCanAct = useMemo(() => lesson.id === "attack" || lesson.id === "taunt", [lesson.id]);

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

  function goLesson(index) {
    const safe = Math.max(0, Math.min(LESSONS.length - 1, index));
    playSfx("click");
    setLessonIndex(safe);
    setScene(initialScene(safe));
    setDone(false);
    setSelectedCard(null);
    setSelectedUnit(null);
    setDragCard(null);
    setAimUid(null);
    setSuccessText("");
    setCoachText(LESSONS[safe].instruction);
  }

  function performSummon() {
    replaceScene({
      mana: 2,
      hand: [],
      player: [unit("charmander", "p1")],
      logs: [...scene.logs, "파이리를 냈다! 마나 1을 사용했다."],
    });
    complete("좋아요. 기본 포켓몬은 손패에서 필드로 드래그해 소환할 수 있습니다.");
  }

  function performEvolve() {
    const damageTaken = 2 - scene.player[0].hp;
    const nextHp = Math.max(1, CARD_MAP.charmeleon.hp - damageTaken);
    replaceScene({
      mana: 2,
      hand: [],
      player: [unit("charmeleon", "p1", nextHp)],
      logs: [...scene.logs, `파이리가 리자드로 진화했다! 받은 피해 ${damageTaken}은 유지된다.`],
    });
    setSelectedCard(null);
    complete("진화 카드도 진화시킬 포켓몬 위로 직접 드래그할 수 있습니다. 받은 피해는 유지됩니다.");
  }

  function performTechnique() {
    replaceScene({
      mana: 2,
      hand: [],
      enemy: [],
      logs: [...scene.logs, "화염방사! 불꽃 → 풀 약점 ×1.5, 피해 6!"],
    });
    setSelectedCard(null);
    complete("대상이 필요한 기술은 손패에서 원하는 대상 위로 드래그해서 바로 사용할 수 있습니다.");
  }

  function performStatus(uid) {
    const nextEnemy = scene.enemy.map((u) =>
      u.uid === uid ? { ...u, hp: Math.max(1, u.hp - 5), status: "ice" } : u,
    );
    replaceScene({
      mana: 3,
      hand: [],
      enemy: nextEnemy,
      logs: [...scene.logs, "냉동빔! 얼음 → 드래곤 약점으로 피해 5. 액스라이즈가 얼어붙었다!"],
    });
    setSelectedCard(null);
    complete("상태이상도 기술을 대상 위로 드래그해 적용합니다. 얼음 상태의 포켓몬은 공격할 수 없습니다.");
  }

  function performWeather() {
    const boosted = scene.player.map((u) => ({ ...u, atk: u.cardId === "charmander" ? 2 : u.atk }));
    replaceScene({
      mana: 3,
      hand: [],
      weather: "sun",
      player: boosted,
      logs: [...scene.logs, "쾌청! 불꽃 포켓몬의 공격력이 올라갔다."],
    });
    complete("대상이 없는 기술은 배틀 필드로 드래그해 사용합니다. 날씨는 양쪽 필드 전체에 영향을 줍니다.");
  }

  function performAttack() {
    replaceScene({
      player: [unit("charmander", "p1", 1)],
      enemy: [],
      logs: [...scene.logs, "파이리의 공격! 불꽃 → 풀 약점으로 피해 2. 이상해씨의 반격으로 파이리도 피해 1!"],
    });
    setSelectedUnit(null);
    complete("본게임처럼 공격할 포켓몬을 잡아 대상까지 드래그해 놓으면 공격합니다. 포켓몬끼리 싸우면 반격도 받습니다.");
  }

  function performTauntAttack() {
    replaceScene({
      enemy: [],
      logs: [...scene.logs, "날쌩마가 도발 포켓몬 라프라스를 공격했다! 이제 트레이너 직접 공격 길이 열렸다."],
    });
    setSelectedUnit(null);
    complete("도발 포켓몬이 있으면 그 포켓몬을 먼저 처리해야 상대 트레이너를 직접 공격할 수 있습니다.");
  }

  function resolveCardDrop(cardId, zone, uid) {
    if (done) return;

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

    fail("카드를 안내된 위치까지 드래그한 뒤 그 위에서 놓아보세요.");
  }

  function onHandPointerDown(e, cardId) {
    if (done || (e.button !== undefined && e.button !== 0)) return;

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

      if (info.moved) {
        setDragCard({ cardId: info.cardId, x: ev.clientX, y: ev.clientY });
      }
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
    if (aimUid && aimInfo.current) {
      updateAimLine(aimInfo.current.x, aimInfo.current.y);
    }
  }, [aimUid]);

  function resolveAttackDrop(uid, zone, targetUid) {
    if (done) return;

    if (lesson.id === "attack") {
      if (zone === "unit-enemy" && targetUid === "e1") {
        performAttack();
      } else {
        fail("공격 화살표를 상대 이상해씨까지 끌고 가서 놓으세요.");
      }
      return;
    }

    if (lesson.id === "taunt") {
      if (zone === "enemy-hero") {
        if (!scene.tauntBlockedOnce) {
          playSfx("buzzer");
          replaceScene({
            tauntBlockedOnce: true,
            logs: [...scene.logs, "직접 공격 실패! 도발 포켓몬이 있어 트레이너를 공격할 수 없다."],
          });
          setCoachText("도발 때문에 직접 공격이 막혔습니다. 이번에는 날쌩마를 라프라스까지 드래그하세요.");
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
    if (done || !playerCanAct || (e.button !== undefined && e.button !== 0)) return;

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
    if (done || Date.now() < suppressClickUntil.current) return;

    if (lesson.id === "summon" && cardId === "charmander") {
      fail("이번 연습에서는 파이리를 클릭하지 말고 내 필드까지 드래그해보세요.");
      return;
    }

    if (lesson.id === "evolve" && cardId === "charmeleon") {
      playSfx("click");
      setSelectedCard(cardId);
      setCoachText("클릭 방식도 가능하지만, 이번에는 리자드를 파이리 위로 드래그해서 놓아보세요.");
      return;
    }

    if (lesson.id === "technique" && cardId === "flamethrower") {
      playSfx("click");
      setSelectedCard(cardId);
      setCoachText("클릭 선택도 가능하지만, 화염방사를 이상해풀 위로 직접 드래그해보세요.");
      return;
    }

    if (lesson.id === "status" && cardId === "icebeam") {
      playSfx("click");
      setSelectedCard(cardId);
      setCoachText("냉동빔을 액스라이즈 위로 직접 드래그해서 놓아보세요.");
      return;
    }

    if (lesson.id === "weather" && cardId === "sunnyday") {
      fail("쾌청은 대상이 없는 기술입니다. 카드를 배틀 필드 쪽으로 드래그해서 놓아보세요.");
      return;
    }

    fail("이번 튜토리얼은 실제 배틀처럼 드래그 조작으로 진행해보세요.");
  }

  function handlePlayerUnit(uid) {
    if (done || Date.now() < suppressClickUntil.current) return;

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
    if (done || Date.now() < suppressClickUntil.current) return;

    if (lesson.id === "technique" && selectedCard === "flamethrower") {
      performTechnique();
      return;
    }

    if (lesson.id === "status" && selectedCard === "icebeam") {
      performStatus(uid);
      return;
    }

    fail("카드나 공격 포켓몬을 대상 위까지 드래그해서 놓아보세요.");
  }

  function handleEnemyHero() {
    if (done || Date.now() < suppressClickUntil.current) return;
    fail("공격할 포켓몬을 잡아 상대 트레이너까지 드래그해서 놓아보세요.");
  }

  function handleEndTurn() {
    if (done || lesson.id !== "turn") return;
    replaceScene({
      mana: 4,
      maxMana: 4,
      logs: [...scene.logs, "턴 종료 → 상대 턴이 지나고 다시 내 턴. 최대 마나가 1 늘고 전부 회복됐다."],
    });
    complete("턴이 돌아오면 최대 마나가 증가하고 다시 채워집니다. 이제 앞서 낸 포켓몬도 공격할 수 있습니다.");
  }

  function handleDeckPick(cardId) {
    if (done || lesson.id !== "deck") return;
    const required = ["charmander", "charmeleon", "charizard"];
    if (!required.includes(cardId)) {
      fail("리자몽까지 진화하려면 진화 전 단계가 모두 필요합니다.");
      return;
    }
    if (scene.deckChosen?.includes(cardId)) return;

    const next = [...(scene.deckChosen || []), cardId];
    playSfx("click");
    replaceScene({ deckChosen: next });
    if (next.length === 3) {
      complete("정답! 실제 덱은 30장으로 구성하며, 진화 포켓몬을 쓸 때는 필요한 진화 전 카드도 함께 넣어야 합니다.");
    } else {
      setCoachText(`${next.length}/3 선택 완료. 나머지 진화 단계도 골라보세요.`);
    }
  }

  const draggingCardId = dragCard?.cardId || null;
  const targetEnemy = selectedUnit || selectedCard || draggingCardId || aimUid;
  const deckMode = lesson.id === "deck";

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
            <span className="tutorial-do-badge">드래그해서 해보세요</span>
          )}
        </div>
      </section>

      <main className="tutorial-stage">
        {deckMode ? (
          <DeckChallenge chosen={scene.deckChosen || []} onPick={handleDeckPick} />
        ) : (
          <div className="tutorial-battle-shell">
            <div className="tutorial-battle-board" data-tutorial-drop="board">
              <Hero
                enemy
                hp={scene.enemyHp}
                targetable={lesson.id === "taunt" && !done}
                onClick={handleEnemyHero}
              />

              <div className="field enemy-field tutorial-field" data-tutorial-drop="enemy-field">
                {scene.enemy.length ? (
                  scene.enemy.map((value) => (
                    <MiniUnit
                      key={value.uid}
                      value={value}
                      targetable={!!targetEnemy && !done}
                      onClick={() => handleEnemyUnit(value.uid)}
                      dropZone="unit-enemy"
                    />
                  ))
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
                  <Mana current={scene.mana} max={scene.maxMana} />
                </div>
                <div className="hand tutorial-hand">
                  {scene.hand.length ? (
                    scene.hand.map((cardId, index) => (
                      <div className="tutorial-hand-card-wrap" key={`${cardId}-${index}`}>
                        <HandCard
                          cardId={cardId}
                          playable={!done}
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
        )}
      </main>

      <div className="tutorial-live-footer">
        <button
          type="button"
          className="btn-secondary"
          disabled={lessonIndex === 0}
          onClick={() => goLesson(lessonIndex - 1)}
        >
          ◀ 이전 연습
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => goLesson(lessonIndex)}
        >
          ↻ 이 단계 다시하기
        </button>
      </div>
    </div>
  );
}
