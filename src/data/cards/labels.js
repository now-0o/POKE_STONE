import { CARD_MAP } from "../../data/cards.js";

// 기존 카드 ID/효과는 유지하고 화면에 표시되는 이름만 정리한다.
if (CARD_MAP.recover) {
  CARD_MAP.recover.name = "HP회복";
}
