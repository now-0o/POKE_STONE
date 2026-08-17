import { ABILITY_TEXT, CARD_MAP } from "../../data/cards.js";

// 기존 카드 ID/효과는 유지하고 화면에 표시되는 이름만 정리한다.
if (CARD_MAP.recover) {
  CARD_MAP.recover.name = "HP회복";
}

if (ABILITY_TEXT.primordialsea) {
  ABILITY_TEXT.primordialsea =
    "하이드로펌프: 나왔을 때 비를 내리고, 상대 포켓몬 전체에게 물 타입 피해 2";
}
