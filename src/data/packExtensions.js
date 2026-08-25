import { BALL_SPRITES, PACKS } from "./cards.js";

// 독 · 악 · 고스트 전용 레전드 테마팩.
// 볼 이미지는 public/sprites/items/dusk-ball.png를 사용한다.
// 실제 이미지 파일은 별도로 추가하면 된다.
BALL_SPRITES.dusk = "/sprites/items/dusk-ball.png";

PACKS.dusk = {
  id: "dusk",
  name: "포스스톤 DUSK",
  sub: "황혼팩 · 독·악·고스트 전용",
  price: 550,
  weights: { C: 55, R: 33, E: 8, L: 4 },
  guarantee: "E",
  ball: "dusk",
  typePool: ["독", "악", "고스트"],
  legendPool: ["giratina", "darkrai"],
};
