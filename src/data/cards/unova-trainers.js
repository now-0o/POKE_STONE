import {
  TRAINER_CARDS,
  CARD_MAP,
  DEX,
  ABILITY_TEXT,
} from "../cards.js";

const UNOVA_TRAINER_CARDS = [
  {
    id: "unova_elesa_emolga",
    name: "카밀레의 에몽가",
    kind: "pokemon",
    type: "전기",
    cost: 4,
    atk: 5,
    hp: 6,
    rarity: "L",
    stage: 0,
    ability: "elesa_centerstage",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "unova_clay_excadrill",
    name: "야콘의 몰드류",
    kind: "pokemon",
    type: "땅",
    cost: 5,
    atk: 8,
    hp: 8,
    rarity: "L",
    stage: 0,
    ability: "clay_drillliner",
    secondaryAbility: "sandrush",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "unova_skyla_swanna",
    name: "풍란의 스완나",
    kind: "pokemon",
    type: "비행",
    cost: 5,
    atk: 7,
    hp: 8,
    rarity: "L",
    stage: 0,
    ability: "skyla_divebomb",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "unova_brycen_beartic",
    name: "담죽의 툰베어",
    kind: "pokemon",
    type: "얼음",
    cost: 5,
    atk: 8,
    hp: 8,
    rarity: "L",
    stage: 0,
    ability: "brycen_icebreaker",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "unova_drayden_haxorus",
    name: "사간의 액스라이즈",
    kind: "pokemon",
    type: "드래곤",
    cost: 6,
    atk: 9,
    hp: 9,
    rarity: "L",
    stage: 0,
    ability: "drayden_dragonking",
    signature: true,
    trainerOnly: true,
  },
];

for (const card of UNOVA_TRAINER_CARDS) {
  if (CARD_MAP[card.id]) continue;
  TRAINER_CARDS.push(card);
  CARD_MAP[card.id] = card;
}

Object.assign(DEX, {
  unova_elesa_emolga: 587,
  unova_clay_excadrill: 530,
  unova_skyla_swanna: 581,
  unova_brycen_beartic: 614,
  unova_drayden_haxorus: 612,
});

Object.assign(ABILITY_TEXT, {
  elesa_centerstage:
    "센터 스테이지: 스포트라이트를 받으면 이번 턴 공격력 +2. 공격을 마친 뒤 손패에 공간이 있으면 카밀레의 손으로 돌아간다.",
  clay_drillliner:
    "드릴라이너: 전투 공격으로 피해를 주면 광산차를 야콘 쪽으로 2칸 민다.",
  skyla_divebomb:
    "급강하: 이륙 후 다음 풍란 턴 시작에 착륙할 때 무작위 상대 포켓몬에게 비행 피해 4.",
  brycen_icebreaker:
    "빙하깨기: 얼어 있는 포켓몬을 전투 공격할 때 피해 +3.",
  drayden_dragonking:
    "용의 왕: 용의 위압이 3 이상이면 한 턴에 두 번 공격할 수 있다.",
});
