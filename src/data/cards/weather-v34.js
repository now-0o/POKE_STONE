import { CARDS, CARD_MAP, ITEM_SPRITE } from "../cards.js";

const WEATHER_TEXT = {
  raindance:
    "날씨를 5턴 동안 비로 바꾼다. (물 포켓몬 공격력 +1, 쓱쓱 발동)",
  sunnyday:
    "날씨를 5턴 동안 쾌청으로 바꾼다. (불꽃 포켓몬 공격력 +1, 엽록소·선파워 발동)",
  sandstorm:
    "날씨를 3턴 동안 모래바람으로 바꾼다. (매 턴 종료 시 바위/땅/강철이 아닌 포켓몬 전체에게 피해 1)",
};

Object.entries(WEATHER_TEXT).forEach(([cardId, text]) => {
  if (CARD_MAP[cardId]) CARD_MAP[cardId].text = text;
});

if (!CARD_MAP.hail) {
  const hail = {
    id: "hail",
    name: "싸라기눈",
    kind: "spell",
    type: "기술",
    moveType: "얼음",
    cost: 2,
    rarity: "C",
    emoji: "🌨️",
    animation: {
      type: "weather",
      theme: "ice",
      scope: "board",
      startup: 300,
      duration: 720,
    },
    spell: { effect: "weather", weather: "hail" },
    text: "날씨를 3턴 동안 싸라기눈으로 바꾼다. (매 턴 종료 시 얼음 타입이 아닌 포켓몬 전체에게 기본 얼음 피해 1, 상성 적용)",
  };

  CARDS.push(hail);
  CARD_MAP[hail.id] = hail;
}

ITEM_SPRITE.hail = "tm-ice";
