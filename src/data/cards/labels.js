import { ABILITY_TEXT, CARD_MAP } from "../../data/cards.js";

// 기존 카드 ID/효과는 유지하고 화면에 표시되는 이름/설명만 정리한다.
if (CARD_MAP.recover) {
  CARD_MAP.recover.name = "HP회복";
}

if (ABILITY_TEXT.primordialsea) {
  ABILITY_TEXT.primordialsea =
    "하이드로펌프: 나왔을 때 비를 내리고, 상대 포켓몬 전체에게 물 타입 피해 2";
}

const WEATHER_MOVE_TYPE = {
  rain: "물",
  sun: "불꽃",
  sand: "바위",
  hail: "얼음",
  snow: "얼음",
};

function cleanTechniqueText(text) {
  return text
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*타입 상성을 적용한다\.?/g, "")
    .replace(/\s*타입 상성 적용\.?/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

Object.values(CARD_MAP).forEach((card) => {
  if (card?.kind !== "spell" || card.type !== "기술") return;

  if (card.spell?.effect === "weather") {
    const weatherType = WEATHER_MOVE_TYPE[card.spell.weather];
    if (weatherType) card.moveType = weatherType;
  }

  if (typeof card.text === "string") {
    card.text = cleanTechniqueText(card.text);
  }
});
