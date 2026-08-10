import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  CARD_MAP,
  TYPE_COLORS,
  ABILITY_TEXT,
  RARITY_NAME,
  spriteUrl,
  trainerSpriteUrl,
} from "../data/cards.js";
import { effectiveCost, effectiveAtk } from "../engine/engine.js";

// ---- 3D 틸트 훅: 마우스 위치 -> CSS 변수 직접 갱신 (리렌더 없음) ----
const MAX_TILT = 13;

export function useTilt() {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty(
      "--rx",
      ((0.5 - py) * 2 * MAX_TILT).toFixed(2) + "deg",
    );
    el.style.setProperty(
      "--ry",
      ((px - 0.5) * 2 * MAX_TILT).toFixed(2) + "deg",
    );
    el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
    el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

// ---- 스프라이트 (실패 시 이모지 폴백) ----
export function Sprite({
  cardId,
  mega,
  emoji,
  size,
  busted = false,
  spriteId = null,
}) {
  const [failed, setFailed] = useState(false);

  const url = spriteUrl(cardId, mega, busted, spriteId);

  if (!url || failed) {
    return (
      <div className="card-emoji" style={{ fontSize: size * 0.7 }}>
        {emoji}
      </div>
    );
  }

  return (
    <img
      className="card-sprite"
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

// ---- 트레이너 스프라이트 (실패 시 이모지 폴백) ----
export function TrainerSprite({ spriteKey, emoji, size = 64 }) {
  const [failed, setFailed] = useState(false);
  if (!spriteKey || failed) {
    return (
      <span className="trainer-emoji" style={{ fontSize: size * 0.62 }}>
        {emoji}
      </span>
    );
  }
  return (
    <img
      className="trainer-sprite"
      src={trainerSpriteUrl(spriteKey)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

const STAGE_LABEL = { 1: "1단계 진화", 2: "2단계 진화" };

const DEOXYS_SPRITE_IDS = {
  normal: 386,
  attack: 10001,
  defense: 10002,
  speed: 10003,
};

// ---- 꾹 눌러 크게 보기 공용 훅 (컬렉션/카드팩 등) ----
export function useInspect(delay = 250) {
  const [inspect, setInspect] = useState(null);
  const timer = useRef(null);
  const suppressUntil = useRef(0);

  const press = (payload) => (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const sx = e.clientX,
      sy = e.clientY;
    let fired = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fired = true;
      setInspect(payload);
    }, delay);
    const onMove = (ev) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) cancel();
    };
    const cancel = () => {
      clearTimeout(timer.current);
      if (fired) suppressUntil.current = Date.now() + 400; // 보기 직후 클릭 오발 방지
      setInspect(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cancel);
      window.removeEventListener("pointercancel", cancel);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cancel);
    window.addEventListener("pointercancel", cancel);
  };

  const clickSuppressed = () => Date.now() < suppressUntil.current;
  return { inspect, press, clickSuppressed };
}

function AutoScrollCardText({ text }) {
  const boxRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;

    if (!box || !inner) return;

    let animationId = null;
    let timeoutId = null;
    let direction = 1;
    let lastTime = null;
    let disposed = false;

    const SPEED = 10;
    const TOP_WAIT = 500;
    const BOTTOM_WAIT = 800;

    const stop = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const animate = (time) => {
      if (disposed) return;

      const maxScroll = box.scrollHeight - box.clientHeight;

      console.log("[CARD SCROLL]", text, {
        scrollHeight: box.scrollHeight,
        clientHeight: box.clientHeight,
        maxScroll,
      });

      if (maxScroll <= 1) {
        box.scrollTop = 0;
        return;
      }

      if (lastTime === null) {
        lastTime = time;
      }

      const delta = (time - lastTime) / 1000;

      lastTime = time;

      box.scrollTop += direction * SPEED * delta;

      if (direction === 1 && box.scrollTop >= maxScroll - 0.5) {
        box.scrollTop = maxScroll;

        direction = -1;
        lastTime = null;

        timeoutId = setTimeout(() => {
          animationId = requestAnimationFrame(animate);
        }, BOTTOM_WAIT);

        return;
      }

      if (direction === -1 && box.scrollTop <= 0.5) {
        box.scrollTop = 0;

        direction = 1;
        lastTime = null;

        timeoutId = setTimeout(() => {
          animationId = requestAnimationFrame(animate);
        }, TOP_WAIT);

        return;
      }

      animationId = requestAnimationFrame(animate);
    };

    const start = () => {
      if (disposed) return;

      stop();

      box.scrollTop = 0;
      direction = 1;
      lastTime = null;

      const maxScroll = box.scrollHeight - box.clientHeight;

      if (maxScroll <= 1) {
        return;
      }

      timeoutId = setTimeout(() => {
        animationId = requestAnimationFrame(animate);
      }, TOP_WAIT);
    };

    // 최초 렌더 후 측정
    const startFrame = requestAnimationFrame(start);

    // 박스 크기 + 실제 글 높이 둘 다 감시
    const observer = new ResizeObserver(start);

    observer.observe(box);
    observer.observe(inner);

    // 커스텀 폰트 로딩 완료 후 다시 측정
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!disposed) {
          start();
        }
      });
    }

    return () => {
      disposed = true;

      cancelAnimationFrame(startFrame);

      observer.disconnect();
      stop();
    };
  }, [text]);

  return (
    <div ref={boxRef} className="card-text">
      <div ref={innerRef} className="card-text-inner">
        {text}
      </div>
    </div>
  );
}

// ---- 손패 카드 (TCG 프레임) ----
export function HandCard({
  cardId,
  game,
  playable,
  selected,
  onClick,
  onPointerDown,
  dragOrigin,
  ghost,
  unit,
}) {
  const card = CARD_MAP[cardId];
  const cost = game ? effectiveCost(card, game) : card.cost;
  const discounted = cost < card.cost;
  const shownAbility = unit ? unit.ability : card.ability;
  const shownSecondaryAbility = unit
    ? unit.secondaryAbility
    : card.secondaryAbility;
  const abilityTexts = [
    shownAbility ? ABILITY_TEXT[shownAbility] : "",
    shownSecondaryAbility ? ABILITY_TEXT[shownSecondaryAbility] : "",
  ].filter(Boolean);
  const abilityText =
    abilityTexts.length > 0 ? abilityTexts.join("\n") : card.text || "";
  const shownName = unit ? unit.name : card.name;
  const shownAtk = unit ? unit.atk : card.atk;
  const shownHp = unit ? unit.hp : card.hp;
  const { ref, onMouseMove, onMouseLeave } = useTilt();
  const holo = card.rarity !== "C";
  const isPokemon = card.kind === "pokemon";

  return (
    <div
      ref={ref}
      className={[
        "hand-card",
        `rarity-card-${card.rarity}`,
        playable ? "playable" : "unplayable",
        selected ? "selected" : "",
        holo ? "holo" : "",
        dragOrigin ? "drag-origin" : "",
        ghost ? "ghost-card" : "",
      ].join(" ")}
      style={{ "--type-color": TYPE_COLORS[card.type] }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      title={abilityText}
    >
      <div className={`card-cost ${discounted ? "discounted" : ""}`}>
        {cost}
      </div>

      <div className="card-topline">
        <span className="card-name">{shownName}</span>
      </div>

      {isPokemon && (
        <div className="card-stageline">
          {card.evolvesFrom
            ? `${STAGE_LABEL[card.stage] || "진화"} · ${
                CARD_MAP[card.evolvesFrom]?.name
              }에서`
            : "이전 진화 없음"}
        </div>
      )}

      <div className="card-art">
        <Sprite
          cardId={card.id}
          mega={unit ? unit.mega : false}
          spriteId={
            unit?.cardId === "deoxys" && unit?.deoxysForm
              ? DEOXYS_SPRITE_IDS[unit.deoxysForm]
              : unit?.megaSpriteId
          }
          emoji={card.emoji}
          size={56}
          busted={unit?.cardId === "mimikyu" && unit.sturdyUsed}
        />
      </div>

      <div className="card-typeline">
        <span className="card-typebadge">
          {card.kind === "mega"
            ? "메가스톤"
            : card.kind === "item"
              ? "도구"
              : card.kind === "spell" && card.type === "도구"
                ? "도구"
                : card.kind === "spell"
                  ? `기술 · ${card.moveType || "보조"}`
                  : `${card.type} 포켓몬`}
        </span>
      </div>

      {abilityText && <AutoScrollCardText text={abilityText} />}

      {isPokemon && (
        <>
          <div className="hcard-orb orb-atk">{shownAtk}</div>
          <div className="hcard-orb orb-hp">{shownHp}</div>
        </>
      )}
      <div className={`card-rarity-gem gem-${card.rarity}`} />

      {holo && <div className="holo-layer" aria-hidden="true" />}
    </div>
  );
}

// ---- 필드 유닛 (미니 TCG 프레임) ----
export function FieldUnit({
  unit,
  game,
  canAct,
  selected,
  targetable,
  onClick,
  onPointerDown,
  dropZone,
  fx,
  fxKey,
  lunge,
  hit,
}) {
  const atk = effectiveAtk(unit, game);
  const buffed = atk > unit.atk;
  const hurt = unit.hp < unit.maxHp;

  const hasTaunt =
    !unit._tauntDisabled &&
    (unit.ability === "taunt" ||
      unit.secondaryAbility === "taunt" ||
      unit.ability === "deoxys_defense" ||
      unit.secondaryAbility === "deoxys_defense" ||
      unit.ability === "fortress" ||
      unit.secondaryAbility === "fortress" ||
      unit.ability === "brock_rockwall" ||
      unit.secondaryAbility === "brock_rockwall" ||
      unit.ability === "jasmine_autotomize" ||
      unit.secondaryAbility === "jasmine_autotomize");

  const abilityTexts = [
    unit.ability ? ABILITY_TEXT[unit.ability] : "",

    unit.secondaryAbility &&
    !(unit._tauntDisabled && unit.secondaryAbility === "taunt")
      ? ABILITY_TEXT[unit.secondaryAbility]
      : "",
  ].filter(Boolean);

  if (unit._tauntDisabled) {
    abilityTexts.push("도발 효과가 해제되었습니다.");
  }

  const abilityText = abilityTexts.join("\n");

  return (
    <div className="unit-pop">
      <div
        className={[
          "field-unit",
          canAct ? "can-act" : "",
          selected ? "selected" : "",
          targetable ? "targetable" : "",
          unit.frozen > 0 || unit.status ? "frozen" : "",
          unit.mega ? "mega" : "",
          hasTaunt ? "taunt" : "",
          lunge ? `lunge-${lunge}` : "",
          hit ? "hit-flash" : "",
        ].join(" ")}
        style={{ "--type-color": TYPE_COLORS[unit.type] }}
        onClick={onClick}
        onPointerDown={onPointerDown}
        title={abilityText}
        data-drop={dropZone}
        data-uid={unit.uid}
      >
        {fx === "evolve" && <div className="fx-overlay fx-evo" key={fxKey} />}
        {fx === "mega" && (
          <div className="fx-overlay fx-mega-burst" key={fxKey} />
        )}
        {hasTaunt && <div className="taunt-badge">도발</div>}
        {(unit.frozen > 0 || unit.status) && (
          <div className={`status-overlay status-${unit.status || "ice"}`}>
            <span>
              {unit.status === "sleep"
                ? "Zzz"
                : unit.status === "para"
                  ? "마비"
                  : unit.status === "burn"
                    ? "화상"
                    : unit.status === "poison"
                      ? "독"
                      : "얼음"}
            </span>
          </div>
        )}
        <div className="unit-art">
          <Sprite
            cardId={unit.cardId}
            mega={unit.mega}
            spriteId={
              unit.cardId === "deoxys" && unit.deoxysForm
                ? DEOXYS_SPRITE_IDS[unit.deoxysForm]
                : unit.megaSpriteId
            }
            emoji={unit.emoji}
            size={48}
            busted={unit.cardId === "mimikyu" && unit.sturdyUsed}
          />
        </div>
        <div className="unit-name">{unit.name}</div>
        <div className={`unit-orb orb-atk ${buffed ? "buffed" : ""}`}>
          {atk}
        </div>
        <div className={`unit-orb orb-hp ${hurt ? "hurt" : ""}`}>{unit.hp}</div>
      </div>
    </div>
  );
}
