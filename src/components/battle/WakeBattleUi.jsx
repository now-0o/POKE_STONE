import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const SLOT_COUNT = 6;

function readFloodSlots() {
  const raw = Array.isArray(window.__pokeWakeFloodSlots)
    ? window.__pokeWakeFloodSlots
    : String(document.body.dataset.wakeFloodSlots || "")
        .split(",")
        .filter(Boolean)
        .map(Number);

  return [...new Set(raw.map(Number).filter((slot) => Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT))];
}

function syncWakeFieldDom() {
  const field = document.querySelector(
    '.battle.battle-board[data-battlefield="pastoria_gym"] .my-field',
  );
  const active = document.body.dataset.battlefield === "pastoria_gym" && Boolean(field);

  document
    .querySelectorAll('.my-field[data-wake-fixed-field="1"]')
    .forEach((element) => {
      if (element !== field || !active) delete element.dataset.wakeFixedField;
    });

  document
    .querySelectorAll(".field-unit[data-wake-slot]")
    .forEach((element) => delete element.dataset.wakeSlot);

  if (!active || !field) return null;

  field.dataset.wakeFixedField = "1";
  const unitSlots = window.__pokeWakeSlots || {};

  field.querySelectorAll(".field-unit[data-uid]").forEach((element) => {
    const slot = Number(unitSlots[element.dataset.uid]);
    if (Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT) {
      element.dataset.wakeSlot = String(slot);
    }
  });

  const rect = field.getBoundingClientRect();
  const style = window.getComputedStyle(field);
  const padLeft = Number.parseFloat(style.paddingLeft) || 0;
  const padRight = Number.parseFloat(style.paddingRight) || 0;
  const padTop = Number.parseFloat(style.paddingTop) || 0;
  const padBottom = Number.parseFloat(style.paddingBottom) || 0;

  return {
    visible: rect.width > 0 && rect.height > 0,
    left: rect.left + padLeft,
    top: rect.top + padTop,
    width: Math.max(0, rect.width - padLeft - padRight),
    height: Math.max(0, rect.height - padTop - padBottom),
    flooded: readFloodSlots(),
  };
}

function patchWakeGuide() {
  if (document.body.dataset.battlefield !== "pastoria_gym") return;

  const dialog = document.querySelector(".battle-gimmick-dialog");
  const copy = dialog?.querySelector(".battle-gimmick-copy");
  const hint = dialog?.querySelector(".battle-gimmick-hint");
  if (!copy || copy.dataset.wakeFixedRules === "1") return;

  copy.dataset.wakeFixedRules = "1";
  copy.replaceChildren();

  [
    "플레이어 필드는 처음부터 6개의 고정 슬롯으로 유지됩니다.",
    "플레이어의 4·8·12·16번째 턴이 시작될 때 바깥쪽부터 한 칸씩 수몰되어, 최종적으로 4칸이 봉쇄됩니다.",
    "새로 수몰되는 칸에 포켓몬이 있으면 그 포켓몬은 즉시 기절합니다. 이미 수몰된 칸에는 새 포켓몬을 놓을 수 없습니다.",
  ].forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    copy.appendChild(p);
  });

  if (hint) {
    hint.textContent =
      "힌트: 수몰은 양끝에서 중앙 쪽으로 진행됩니다. 4턴 단위로 다음 수몰 위치를 비워 두세요.";
  }
}

function sameView(a, b) {
  if (!a || !b) return a === b;
  return (
    a.visible === b.visible &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height &&
    a.flooded.join(",") === b.flooded.join(",")
  );
}

function WakeFieldOverlay() {
  const [view, setView] = useState(() => syncWakeFieldDom());

  useEffect(() => {
    let frame = null;

    const sync = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const next = syncWakeFieldDom();
        patchWakeGuide();
        setView((current) => (sameView(current, next) ? current : next));
      });
    };

    window.addEventListener("wake-flood-change", sync);
    window.addEventListener("battle-turn-change", sync);
    window.addEventListener("resize", sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-battlefield",
        "data-wake-flood",
        "data-wake-flood-slots",
      ],
    });

    sync();

    return () => {
      window.removeEventListener("wake-flood-change", sync);
      window.removeEventListener("battle-turn-change", sync);
      window.removeEventListener("resize", sync);
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  if (!view?.visible) return null;

  const flooded = new Set(view.flooded);

  return (
    <div
      className="wake-field-slot-overlay"
      style={{
        left: `${view.left}px`,
        top: `${view.top}px`,
        width: `${view.width}px`,
        height: `${view.height}px`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: SLOT_COUNT }, (_, slot) => (
        <span
          key={slot}
          className={`wake-field-slot ${flooded.has(slot) ? "is-flooded" : ""}`}
          data-wake-overlay-slot={slot}
        >
          {flooded.has(slot) && <strong>수몰</strong>}
        </span>
      ))}
    </div>
  );
}

let host = null;
let root = null;

function startWakeBattleUi() {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", startWakeBattleUi, { once: true });
    return;
  }

  host = document.createElement("div");
  host.id = "wake-battle-ui-root";
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<WakeFieldOverlay />);
}

startWakeBattleUi();
