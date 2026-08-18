import React, { useMemo, useState } from "react";
import { playSfx } from "../audio.js";
import { CARD_MAP, TYPE_COLORS } from "../data/cards.js";
import { HandCard, Sprite } from "./Card.jsx";

const LESSONS = [
  {
    id: "summon",
    title: "포켓몬을 필드에 내기",
    instruction: "손패의 파이리를 눌러 필드에 내보세요.",
  },
  {
    id: "turn",
    title: "턴을 넘기기",
    instruction: "방금 낸 포켓몬은 보통 바로 공격할 수 없습니다. 턴 종료를 눌러보세요.",
  },
  {
    id: "attack",
    title: "포켓몬으로 공격하기",
    instruction: "파이리를 먼저 누르고, 상대 이상해씨를 눌러 공격하세요.",
  },
  {
    id: "evolve",
    title: "진화하기",
    instruction: "손패의 리자드를 누른 뒤 필드의 파이리를 눌러 진화하세요.",
  },
  {
    id: "technique",
    title: "기술 카드 사용하기",
    instruction: "화염방사를 누른 뒤 상대 이상해풀을 지정하세요.",
  },
  {
    id: "status",
    title: "상태이상 만들기",
    instruction: "냉동빔을 사용해 액스라이즈를 얼려보세요.",
  },
  {
    id: "weather",
    title: "날씨 바꾸기",
    instruction: "쾌청 카드를 사용해 날씨를 바꿔보세요.",
  },
  {
    id: "taunt",
    title: "도발 상대하기",
    instruction: "먼저 상대 트레이너를 직접 공격해보세요. 막히는 이유를 확인할 수 있습니다.",
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

function MiniUnit({ value, selected, targetable, canAct, onClick }) {
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
    >
      {value.status && (
        <div className={`status-overlay status-${value.status}`}>
          <span>{statusLabel(value.status)}</span>
        </div>
      )}
      {card.ability === "taunt" && <div className="taunt-badge">도발</div>}
      <div className="unit-art">
        <Sprite cardId={card.id} emoji={card.emoji} size={50} />
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
          <div key={cardId} className={chosen.includes(cardId) ? "tutorial-deck-picked" : ""}>
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

  const lesson = LESSONS[lessonIndex];
  const progress = ((lessonIndex + (done ? 1 : 0)) / LESSONS.length) * 100;

  const playerCanAct = useMemo(() => lesson.id === "attack" || lesson.id === "taunt", [lesson.id]);

  function replaceScene(next) {
    setScene((prev) => ({ ...prev, ...next }));
  }

  function log(message) {
    setScene((prev) => ({ ...prev, logs: [...prev.logs, message].slice(-5) }));
  }

  function complete(message) {
    playSfx("click");
    setDone(true);
    setSuccessText(message);
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
    setSuccessText("");
    setCoachText(LESSONS[safe].instruction);
  }

  function handleHand(cardId) {
    if (done) return;

    if (lesson.id === "summon" && cardId === "charmander") {
      replaceScene({
        mana: 2,
        hand: [],
        player: [unit("charmander", "p1")],
        logs: [...scene.logs, "파이리를 냈다! 마나 1을 사용했다."],
      });
      complete("좋아요. 기본 포켓몬은 비용만큼 마나를 내고 필드에 소환합니다.");
      return;
    }

    if (lesson.id === "evolve" && cardId === "charmeleon") {
      playSfx("click");
      setSelectedCard(cardId);
      setCoachText("이제 필드의 파이리를 눌러 진화 대상으로 지정하세요.");
      return;
    }

    if (lesson.id === "technique" && cardId === "flamethrower") {
      playSfx("click");
      setSelectedCard(cardId);
      setCoachText("화염방사의 대상을 정해야 합니다. 상대 이상해풀을 눌러보세요.");
      return;
    }

    if (lesson.id === "status" && cardId === "icebeam") {
      playSfx("click");
      setSelectedCard(cardId);
      setCoachText("냉동빔의 대상인 액스라이즈를 눌러보세요.");
      return;
    }

    if (lesson.id === "weather" && cardId === "sunnyday") {
      const boosted = scene.player.map((u) => ({ ...u, atk: u.cardId === "charmander" ? 2 : u.atk }));
      replaceScene({
        mana: 3,
        hand: [],
        weather: "sun",
        player: boosted,
        logs: [...scene.logs, "쾌청! 불꽃 포켓몬의 공격력이 올라갔다."],
      });
      complete("날씨는 양쪽 필드 전체에 영향을 줍니다. 쾌청에서는 불꽃 쪽이 유리해집니다.");
      return;
    }

    fail("지금 빛나는 카드와 포켓몬을 순서대로 눌러보세요.");
  }

  function handlePlayerUnit(uid) {
    if (done) return;

    if (lesson.id === "attack") {
      playSfx("click");
      setSelectedUnit(uid);
      setCoachText("좋습니다. 이제 상대 이상해씨를 눌러 공격하세요.");
      return;
    }

    if (lesson.id === "evolve" && selectedCard === "charmeleon") {
      const damageTaken = 2 - scene.player[0].hp;
      const nextHp = Math.max(1, CARD_MAP.charmeleon.hp - damageTaken);
      replaceScene({
        mana: 2,
        hand: [],
        player: [unit("charmeleon", "p1", nextHp)],
        logs: [...scene.logs, `파이리가 리자드로 진화했다! 받은 피해 ${damageTaken}은 유지된다.`],
      });
      setSelectedCard(null);
      complete("진화해도 이미 받은 피해는 사라지지 않습니다. 최대 체력만 새 진화체 기준으로 바뀝니다.");
      return;
    }

    if (lesson.id === "taunt") {
      playSfx("click");
      setSelectedUnit(uid);
      setCoachText(scene.tauntBlockedOnce ? "이제 도발 포켓몬 라프라스를 공격하세요." : "먼저 상대 트레이너를 눌러 직접 공격을 시도해보세요.");
      return;
    }

    fail("지금 안내된 순서대로 조작해보세요.");
  }

  function handleEnemyUnit(uid) {
    if (done) return;

    if (lesson.id === "attack" && selectedUnit) {
      replaceScene({
        player: [unit("charmander", "p1", 1)],
        enemy: [],
        logs: [...scene.logs, "파이리의 공격! 불꽃 → 풀 약점으로 피해 2. 이상해씨의 반격으로 파이리도 피해 1!"],
      });
      setSelectedUnit(null);
      complete("포켓몬끼리 싸우면 상대도 반격합니다. 타입 약점은 피해를 더 크게 만듭니다.");
      return;
    }

    if (lesson.id === "technique" && selectedCard === "flamethrower") {
      replaceScene({
        mana: 2,
        hand: [],
        enemy: [],
        logs: [...scene.logs, "화염방사! 불꽃 → 풀 약점 ×1.5, 피해 6!"],
      });
      setSelectedCard(null);
      complete("기술 카드도 타입 상성이 적용됩니다. 기술은 포켓몬의 기본 공격과 별개로 사용할 수 있습니다.");
      return;
    }

    if (lesson.id === "status" && selectedCard === "icebeam") {
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
      complete("상태이상은 카드 위에 바로 표시됩니다. 얼음 상태의 포켓몬은 공격할 수 없습니다.");
      return;
    }

    if (lesson.id === "taunt" && selectedUnit && scene.tauntBlockedOnce) {
      replaceScene({
        enemy: [],
        logs: [...scene.logs, "날쌩마가 도발 포켓몬 라프라스를 공격했다! 이제 트레이너 직접 공격 길이 열렸다."],
      });
      setSelectedUnit(null);
      complete("도발 포켓몬이 있으면 그 포켓몬을 먼저 처리해야 상대 트레이너를 직접 공격할 수 있습니다.");
      return;
    }

    fail("먼저 사용할 카드나 공격할 내 포켓몬을 선택하세요.");
  }

  function handleEnemyHero() {
    if (done) return;

    if (lesson.id === "taunt") {
      if (!scene.tauntBlockedOnce) {
        playSfx("buzzer");
        replaceScene({
          tauntBlockedOnce: true,
          logs: [...scene.logs, "직접 공격 실패! 도발 포켓몬이 있어 트레이너를 공격할 수 없다."],
        });
        setCoachText("도발 때문에 막혔습니다. 날쌩마를 누른 뒤 라프라스를 공격하세요.");
        return;
      }
      fail("라프라스를 먼저 처리해야 합니다.");
      return;
    }

    fail("이 연습에서는 상대 포켓몬을 먼저 지정하세요.");
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

  const targetEnemy = selectedUnit || selectedCard;
  const deckMode = lesson.id === "deck";

  return (
    <div className="tutorial-screen tutorial-interactive">
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
        <div>
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
            <span className="tutorial-do-badge">직접 해보세요</span>
          )}
        </div>
      </section>

      {deckMode ? (
        <DeckChallenge chosen={scene.deckChosen || []} onPick={handleDeckPick} />
      ) : (
        <div className="tutorial-battle-shell">
          <div className="tutorial-battle-board">
            <Hero
              enemy
              hp={scene.enemyHp}
              targetable={lesson.id === "taunt" && !done}
              onClick={handleEnemyHero}
            />

            <div className="field enemy-field tutorial-field">
              {scene.enemy.length ? (
                scene.enemy.map((value) => (
                  <MiniUnit
                    key={value.uid}
                    value={value}
                    targetable={!!targetEnemy && !done}
                    onClick={() => handleEnemyUnit(value.uid)}
                  />
                ))
              ) : (
                <span className="field-empty">상대 필드</span>
              )}
            </div>

            <div className="mid-bar tutorial-mid-bar">
              <Weather weather={scene.weather} />
              <div className="battle-log tutorial-log">
                {scene.logs.map((entry, index) => (
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

            <div className="field my-field tutorial-field">
              {scene.player.length ? (
                scene.player.map((value) => (
                  <MiniUnit
                    key={value.uid}
                    value={value}
                    selected={selectedUnit === value.uid}
                    canAct={playerCanAct && !done}
                    targetable={lesson.id === "evolve" && selectedCard === "charmeleon"}
                    onClick={() => handlePlayerUnit(value.uid)}
                  />
                ))
              ) : (
                <span className="field-empty">내 필드</span>
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
                    <HandCard
                      key={`${cardId}-${index}`}
                      cardId={cardId}
                      playable={!done}
                      selected={selectedCard === cardId}
                      onClick={() => handleHand(cardId)}
                    />
                  ))
                ) : (
                  <span className="tutorial-empty-hand">손패 없음</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
