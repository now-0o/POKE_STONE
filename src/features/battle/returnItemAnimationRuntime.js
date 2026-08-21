import { CARD_MAP } from "../../data/cards.js";

let previous = null;
const running = new Set();

function handCounts(game, side) {
  const counts = new Map();
  for (const entry of game?.players?.[side]?.hand || []) {
    const name = CARD_MAP[entry.cardId]?.name;
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return counts;
}

function takeSnapshot(game) {
  return {
    player: handCounts(game, "player"),
    enemy: handCounts(game, "enemy"),
  };
}

function returnReason(game) {
  // game.log는 60줄에서 오래된 로그를 밀어내므로 길이 비교 대신
  // 방금 발생한 로그 꼬리만 확인한다. 필드->손패 증가 조건도 함께 보므로
  // 이전 레드카드/탈출버튼 로그가 남아 있어도 오작동하지 않는다.
  const text = (game?.log || []).slice(-8).join("\n");
  if (text.includes("탈출버튼")) return "eject";
  if (text.includes("레드카드")) return "redcard";
  return null;
}

function handIncreased(game, side, name) {
  const now = handCounts(game, side).get(name) || 0;
  const before = previous?.[side]?.get(name) || 0;
  return previous ? now > before : now > 0;
}

function destination(side, boardRect) {
  if (side === "player") {
    const handRect = document
      .querySelector(".battle-board > .hand")
      ?.getBoundingClientRect();
    if (handRect?.width) {
      return {
        x: handRect.left + handRect.width / 2,
        y: handRect.top + handRect.height * 0.65,
      };
    }
    return {
      x: boardRect.left + boardRect.width * 0.65,
      y: boardRect.bottom - 36,
    };
  }
  return {
    x: boardRect.left + boardRect.width * 0.65,
    y: boardRect.top + 36,
  };
}

function playReturnAnimation(element, side, reason) {
  const uid = element.dataset.uid;
  if (!uid || running.has(uid)) return;

  const rect = element.getBoundingClientRect();
  const boardRect = element.closest(".battle-board")?.getBoundingClientRect();
  if (!boardRect || !rect.width || !rect.height) return;

  running.add(uid);
  const ghost = element.cloneNode(true);
  ghost.removeAttribute("data-uid");
  ghost.removeAttribute("data-drop");
  ghost.classList.remove("can-act", "selected", "targetable", "hit-flash");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    pointerEvents: "none",
    zIndex: "3600",
    transformOrigin: "center center",
    filter:
      reason === "redcard"
        ? "drop-shadow(0 0 14px rgba(255,70,70,.92)) brightness(1.12)"
        : "drop-shadow(0 0 14px rgba(95,205,255,.95)) brightness(1.12)",
  });

  const tag = document.createElement("div");
  tag.className = `return-item-tag ${reason}`;
  tag.textContent = reason === "redcard" ? "레드카드" : "탈출버튼";
  Object.assign(tag.style, {
    position: "absolute",
    left: "50%",
    top: "-18px",
    transform: "translateX(-50%)",
    padding: "3px 8px",
    borderRadius: "999px",
    whiteSpace: "nowrap",
    fontSize: "10px",
    fontWeight: "900",
    color: "white",
    background:
      reason === "redcard" ? "rgba(160,24,32,.95)" : "rgba(25,98,148,.95)",
    boxShadow: "0 3px 10px rgba(0,0,0,.38)",
  });
  ghost.appendChild(tag);
  document.body.appendChild(ghost);

  const target = destination(side, boardRect);
  const dx = target.x - (rect.left + rect.width / 2);
  const dy = target.y - (rect.top + rect.height / 2);
  const rotate = side === "player" ? 14 : -14;

  const animation = ghost.animate(
    [
      { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
      {
        transform: `translate3d(${dx * 0.16}px,${dy * 0.05 - 18}px,0) scale(1.08) rotate(${rotate * 0.3}deg)`,
        opacity: 1,
        offset: 0.22,
      },
      {
        transform: `translate3d(${dx}px,${dy}px,0) scale(.28) rotate(${rotate}deg)`,
        opacity: 0.15,
      },
    ],
    {
      duration: 560,
      easing: "cubic-bezier(.22,.8,.25,1)",
      fill: "forwards",
    },
  );

  const cleanup = () => {
    ghost.remove();
    running.delete(uid);
  };
  animation.addEventListener("finish", cleanup, { once: true });
  window.setTimeout(cleanup, 760);
}

function onState(event) {
  const game = event.detail?.game;
  if (!game?.players) return;

  const reason = returnReason(game);
  if (reason) {
    const live = new Set([
      ...(game.players.player?.field || []).map((unit) => unit.uid),
      ...(game.players.enemy?.field || []).map((unit) => unit.uid),
    ]);

    document
      .querySelectorAll(".battle-board .field-unit[data-uid]")
      .forEach((element) => {
        if (live.has(element.dataset.uid)) return;
        const side = element.dataset.drop === "unit-enemy" ? "enemy" : "player";
        const name = element.querySelector(".unit-name")?.textContent?.trim();
        if (!name || !handIncreased(game, side, name)) return;
        playReturnAnimation(element, side, reason);
      });
  }

  previous = takeSnapshot(game);
}

if (typeof window !== "undefined") {
  window.addEventListener("unova-legendary-state-change", onState);
  const game = window.__pokeUnovaLegendaryState?.game;
  if (game) previous = takeSnapshot(game);
}
