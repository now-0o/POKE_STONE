import {
  TRAINER_CARDS,
  CARD_MAP,
  DEX,
  ABILITY_TEXT,
} from "../cards.js";

const SINNOH_TRAINER_CARDS = [
  {
    id: "sinnoh_maylene_lucario",
    name: "자두의 루카리오",
    kind: "pokemon",
    type: "격투",
    cost: 5,
    atk: 7,
    hp: 8,
    rarity: "L",
    stage: 0,
    ability: "maylene_aurasphere",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_wake_floatzel",
    name: "맥실러의 플로젤",
    kind: "pokemon",
    type: "물",
    cost: 5,
    atk: 7,
    hp: 7,
    rarity: "L",
    stage: 0,
    ability: "wake_aquajet",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_fantina_mismagius",
    name: "멜리사의 무우마직",
    kind: "pokemon",
    type: "고스트",
    cost: 5,
    atk: 6,
    hp: 8,
    rarity: "L",
    stage: 0,
    ability: "fantina_drain",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_byron_bastiodon",
    name: "동관의 바리톱스",
    kind: "pokemon",
    type: "강철",
    cost: 5,
    atk: 4,
    hp: 10,
    rarity: "L",
    stage: 0,
    ability: "byron_ironwall",
    secondaryAbility: "taunt",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_candice_abomasnow",
    name: "무청의 눈설왕",
    kind: "pokemon",
    type: "얼음",
    cost: 5,
    atk: 6,
    hp: 9,
    rarity: "L",
    stage: 0,
    ability: "candice_snow_warning",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_volkner_luxray",
    name: "전진의 렌트라",
    kind: "pokemon",
    type: "전기",
    cost: 5,
    atk: 7,
    hp: 8,
    rarity: "L",
    stage: 0,
    ability: "volkner_charge",
    signature: true,
    trainerOnly: true,
  },
];

for (const card of SINNOH_TRAINER_CARDS) {
  if (CARD_MAP[card.id]) continue;
  TRAINER_CARDS.push(card);
  CARD_MAP[card.id] = card;
}

Object.assign(DEX, {
  sinnoh_maylene_lucario: 448,
  sinnoh_wake_floatzel: 419,
  sinnoh_fantina_mismagius: 429,
  sinnoh_byron_bastiodon: 411,
  sinnoh_candice_abomasnow: 460,
  sinnoh_volkner_luxray: 405,
});

Object.assign(ABILITY_TEXT, {
  maylene_aurasphere:
    "파동탄: 즉시 공격. 이번 턴 자두가 이미 공격한 횟수만큼 이번 공격 피해가 증가한다. 최대 +2.",
  wake_aquajet:
    "아쿠아제트: 즉시 공격. 현재 수몰된 플레이어 필드칸 하나당 이번 공격 피해 +1.",
  fantina_drain:
    "흡수: 플레이어의 유령이 자연 소멸할 때 그 기운을 흡수해 +1/+1을 얻는다. 최대 3회.",
  byron_ironwall:
    "철벽: 방어도 2로 등장한다. 자신의 턴 종료 시 방어도 +1(최대 2). 방어도가 공격으로 완전히 파괴될 때마다 메탈버스트로 공격자에게 피해 1.",
  byron_sturdy:
    "옹골참: 방어도와 체력을 합친 총내구가 한 번에 모두 소진될 때 체력 1을 남기고 버틴다.",
  candice_snow_warning:
    "눈퍼뜨리기: 이 포켓몬이 살아 있는 동안 매 플레이어 턴 화이트아웃 대상이 2곳에서 3곳으로 증가한다.",
  volkner_charge:
    "충전: 전진의 턴 종료 시 마나가 2 이상 남아 있다면 +1/+1을 얻는다. 최대 3회.",
});
