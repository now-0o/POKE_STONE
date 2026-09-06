import { CARD_MAP, DEX } from "../cards.js";

// 로그라이크 전용 카드.
// CARDS에는 넣지 않아 팩/도감/일반 컬렉션 풀에는 절대 섞이지 않는다.
// CARD_MAP에만 등록해 로그라이크 런 덱과 Battle 엔진에서 사용할 수 있게 한다.
const DEFINITIONS = [
  {
    id: "rogue_rotom_dex",
    spriteSource: "rotom",
    name: "로토무도감",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "R",
    roguelikeOnly: true,
    spell: { effect: "rogue_search_pokemon" },
    text: "덱에서 무작위 포켓몬 1장을 찾아 손으로 가져온다.",
  },
  {
    id: "rogue_porygon_scan",
    spriteSource: "porygon",
    name: "폴리곤 스캔",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "R",
    roguelikeOnly: true,
    spell: { effect: "rogue_search_support" },
    text: "덱에서 포켓몬이 아닌 카드 1장을 찾아 손으로 가져온다.",
  },
  {
    id: "rogue_eevee_path",
    spriteSource: "eevee",
    name: "이브이의 가능성",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 1,
    rarity: "E",
    roguelikeOnly: true,
    spell: { effect: "rogue_search_evolution" },
    text: "덱에서 진화 포켓몬 1장을 찾아 손으로 가져온다.",
  },
  {
    id: "rogue_alakazam_future",
    spriteSource: "alakazam",
    name: "후딘의 예지",
    kind: "spell",
    type: "기술",
    moveType: "에스퍼",
    cost: 2,
    rarity: "E",
    roguelikeOnly: true,
    spell: { effect: "rogue_search_high_cost" },
    text: "덱에서 비용이 가장 높은 카드 1장을 찾아 손으로 가져온다.",
  },
  {
    id: "rogue_meowth_pickup",
    spriteSource: "meowth",
    name: "나옹의 줍기",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 2,
    rarity: "R",
    roguelikeOnly: true,
    spell: { effect: "rogue_draw_two" },
    text: "카드를 2장 뽑는다.",
  },
  {
    id: "rogue_jirachi_wish",
    spriteSource: "jirachi",
    name: "지라치의 소원",
    kind: "spell",
    type: "기술",
    moveType: "에스퍼",
    cost: 2,
    rarity: "E",
    roguelikeOnly: true,
    spell: { effect: "rogue_search_pair" },
    text: "덱에서 포켓몬 1장과 포켓몬이 아닌 카드 1장을 각각 찾아 손으로 가져온다.",
  },
  {
    id: "rogue_ditto_copy",
    spriteSource: "ditto",
    name: "메타몽의 복제",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 1,
    rarity: "E",
    roguelikeOnly: true,
    spell: { effect: "rogue_search_duplicate" },
    text: "현재 손에 있는 카드와 같은 카드 1장을 덱에서 찾아 손으로 가져온다. 없으면 1장 뽑는다.",
  },
];

for (const card of DEFINITIONS) {
  if (!CARD_MAP[card.id]) CARD_MAP[card.id] = card;
  const sourceDex = DEX[card.spriteSource];
  if (sourceDex != null) DEX[card.id] = sourceDex;
}

export const ROGUELIKE_CARD_IDS = Object.freeze(DEFINITIONS.map((card) => card.id));
