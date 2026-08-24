import { BALL_SPRITES, PACKS } from "../cards.js";

// 5세대 전용 카드팩. 드림볼 스프라이트는
// public/sprites/items/dream-ball.png 경로에 추가하면 자동으로 표시된다.
BALL_SPRITES.dream = "/sprites/items/dream-ball.png";

PACKS.gen5 = {
  id: "gen5",
  name: "포스스톤 GEN V",
  sub: "5세대팩 · 하나도감",
  price: 150,
  weights: { C: 81, R: 15, E: 2.5, L: 1.5 },
  guarantee: "R",
  ball: "dream",
  generation: 5,
};
