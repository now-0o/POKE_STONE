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
    spell: { effect: "tutor_pokemon" },
    text: "덱에서 무작위 포켓몬 1장을 찾아 손으로 가져온다.",
  },
  {
    id: "rogue_porygon_scan",
    spriteSource: "porygon",
    name: "폴리곤 스캔",
    kind: "spell",
    type: "도구",
    cost: 2,
    rarity: "R",
    roguelikeOnly: true,
    spell: { effect: "tutor_pokemon_2" },
    text: "덱을 스캔해 무작위 포켓몬 2장을 손으로 가져온다.",
  },
  {
    id: "rogue_eevee_path",
    spriteSource: "eevee",
    name: "이브이의 가능성",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 2,
    rarity: "E",
    roguelikeOnly: true,
    spell: { effect: "tutor_choose_3" },
    text: "덱의 포켓몬 3장을 확인하고 그중 1장을 선택해 손으로 가져온다.",
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
    spell: { effect: "tutor_choose_3" },
    text: "미래를 읽어 덱의 포켓몬 3장 중 필요한 1장을 선택해 손으로 가져온다.",
  },
  {
    id: "rogue_meowth_pickup",
    spriteSource: "meowth",
    name: "나옹의 줍기",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 1,
    rarity: "R",
    roguelikeOnly: true,
    spell: { effect: "tutor_pokemon" },
    text: "덱에서 무작위 포켓몬 1장을 찾아 손으로 가져온다. 저렴하게 덱을 압축하는 탐색 카드다.",
  },
  {
    id: "rogue_jirachi_wish",
    spriteSource: "jirachi",
    name: "지라치의 소원",
    kind: "spell",
    type: "기술",
    moveType: "에스퍼",
    cost: 3,
    rarity: "E",
    roguelikeOnly: true,
    spell: { effect: "tutor_choose_3" },
    text: "덱의 포켓몬 3장 중 원하는 1장을 선택해 손으로 가져온다.",
  },
  {
    id: "rogue_ditto_copy",
    spriteSource: "ditto",
    name: "메타몽의 탐색",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 2,
    rarity: "E",
    roguelikeOnly: true,
    spell: { effect: "tutor_pokemon_2" },
    text: "덱에서 무작위 포켓몬 2장을 찾아 손으로 가져온다.",
  },
];

for (const card of DEFINITIONS) {
  if (!CARD_MAP[card.id]) CARD_MAP[card.id] = card;
  const sourceDex = DEX[card.spriteSource];
  if (sourceDex != null) DEX[card.id] = sourceDex;
}

export const ROGUELIKE_CARD_IDS = Object.freeze(DEFINITIONS.map((card) => card.id));
