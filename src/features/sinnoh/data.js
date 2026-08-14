import {
  TRAINER_CARDS,
  CARD_MAP,
  DEX,
  ABILITY_TEXT,
} from "../../data/cards.js";
import {
  TRAINERS_BY_REGION,
  TRAINERS,
  TRAINER_MAP,
} from "../../data/trainers.js";

const EXTRA_TRAINER_CARDS = [
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
];

for (const card of EXTRA_TRAINER_CARDS) {
  if (!CARD_MAP[card.id]) {
    TRAINER_CARDS.push(card);
    CARD_MAP[card.id] = card;
  }
}

DEX.sinnoh_maylene_lucario = 448;
DEX.sinnoh_wake_floatzel = 419;

ABILITY_TEXT.maylene_aurasphere =
  "파동탄: 즉시 공격. 이번 턴 자두가 이미 공격한 횟수만큼 이번 공격 피해가 증가한다. 최대 +2.";
ABILITY_TEXT.wake_aquajet =
  "아쿠아제트: 즉시 공격. 현재 수몰된 플레이어 필드칸 하나당 이번 공격 피해 +1.";

const EXTRA_SINNOH_TRAINERS = [
  {
    id: "sinnoh_maylene",
    region: "sinnoh",
    name: "장막시티 관장 자두",
    sprite: "maylene",
    title: "체육관 관장",
    emoji: "🥋",
    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.92,
    reward: 450,
    hp: 54,
    requires: "sinnoh_gardenia",
    gymType: "격투",
    battlefield: "veilstone_dojo",
    gimmick: "dojo_combo",
    signatureCard: "sinnoh_maylene_lucario",
    introLines: [
      "몸도 마음도 단련했어. 연속 공격을 버텨낼 수 있을까?",
      "격투도장의 흐름을 끊지 못하면 점점 더 아플 거야!",
    ],
    winLines: ["공격의 흐름을 놓치면 이렇게 되는 거야!"],
    loseLines: ["내 콤보를 끊어냈네... 정말 강해!"],
    deck: [
      "sinnoh_maylene_lucario",
      "machop",
      "machop",
      "machoke",
      "machoke",
      "machamp",
      "machamp",
      "meditite",
      "meditite",
      "medicham",
      "medicham",
      "riolu",
      "riolu",
      "lucario",
      "lucario",
      "makuhita",
      "makuhita",
      "hariyama",
      "hariyama",
      "tyrogue",
      "tyrogue",
      "hitmonlee",
      "hitmonchan",
      "hitmontop",
      "infight",
      "infight",
      "quickattack",
      "quickattack",
      "superball",
      "hyperball",
    ],
  },
  {
    id: "sinnoh_wake",
    region: "sinnoh",
    name: "들판시티 관장 맥실러",
    sprite: "crasherwake",
    title: "체육관 관장",
    emoji: "🌊",
    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.94,
    reward: 500,
    hp: 56,
    requires: "sinnoh_maylene",
    gymType: "물",
    battlefield: "pastoria_gym",
    gimmick: "rising_tide",
    signatureCard: "sinnoh_wake_floatzel",
    introLines: [
      "들판체육관의 수위는 계속 올라간다!",
      "시간을 끌수록 네가 설 자리는 줄어들 거다!",
    ],
    winLines: ["하하하! 물살을 거스르기엔 늦었군!"],
    loseLines: ["좋다! 수위가 오르기 전에 제대로 밀어붙였군!"],
    deck: [
      "sinnoh_wake_floatzel",
      "magikarp",
      "magikarp",
      "gyarados",
      "gyarados",
      "wooper",
      "wooper",
      "quagsire",
      "quagsire",
      "psyduck",
      "psyduck",
      "golduck",
      "golduck",
      "barboach",
      "barboach",
      "whiscash",
      "whiscash",
      "piplup",
      "piplup",
      "prinplup",
      "prinplup",
      "empoleon",
      "mantyke",
      "mantine",
      "raindance",
      "raindance",
      "hydropump",
      "hydropump",
      "surf",
      "hyperball",
    ],
  },
];

for (const trainer of EXTRA_SINNOH_TRAINERS) {
  if (TRAINER_MAP[trainer.id]) continue;

  TRAINERS_BY_REGION.sinnoh.push(trainer);
  TRAINERS.push(trainer);
  TRAINER_MAP[trainer.id] = trainer;
}
