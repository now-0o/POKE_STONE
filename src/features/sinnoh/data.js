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
];

for (const card of EXTRA_TRAINER_CARDS) {
  if (!CARD_MAP[card.id]) {
    TRAINER_CARDS.push(card);
    CARD_MAP[card.id] = card;
  }
}

DEX.sinnoh_maylene_lucario = 448;
DEX.sinnoh_wake_floatzel = 419;
DEX.sinnoh_fantina_mismagius = 429;
DEX.sinnoh_byron_bastiodon = 411;

ABILITY_TEXT.maylene_aurasphere =
  "파동탄: 즉시 공격. 이번 턴 자두가 이미 공격한 횟수만큼 이번 공격 피해가 증가한다. 최대 +2.";
ABILITY_TEXT.wake_aquajet =
  "아쿠아제트: 즉시 공격. 현재 수몰된 플레이어 필드칸 하나당 이번 공격 피해 +1.";
ABILITY_TEXT.fantina_drain =
  "흡수: 플레이어의 유령이 자연 소멸할 때 그 기운을 흡수해 +1/+1을 얻는다. 최대 3회.";
ABILITY_TEXT.byron_ironwall =
  "철벽: 방어도 2로 등장한다. 자신의 턴 종료 시 방어도 +1(최대 2). 방어도가 공격으로 완전히 파괴될 때마다 메탈버스트로 공격자에게 피해 1.";

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
  {
    id: "sinnoh_fantina",
    region: "sinnoh",
    name: "연고시티 관장 멜리사",
    sprite: "fantina",
    title: "체육관 관장",
    emoji: "👻",
    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.95,
    reward: 550,
    hp: 58,
    requires: "sinnoh_wake",
    gymType: "고스트",
    battlefield: "old_chateau",
    gimmick: "haunted_echoes",
    signatureCard: "sinnoh_fantina_mismagius",
    introLines: [
      "쓰러졌다고 끝이라고 생각했니? 이곳의 영혼은 쉽게 떠나지 않아.",
      "숲의 양옥집에서는 사라진 포켓몬도 다시 무대에 남는답니다!",
    ],
    winLines: ["후후... 유령들이 네 필드를 완전히 붙잡았네."],
    loseLines: ["아름다워! 영혼의 흐름까지 읽어냈구나!"],
    deck: [
      "sinnoh_fantina_mismagius",
      "misdreavus",
      "misdreavus",
      "mismagius",
      "mismagius",
      "drifloon",
      "drifloon",
      "drifblim",
      "drifblim",
      "duskull",
      "duskull",
      "dusclops",
      "dusclops",
      "dusknoir",
      "dusknoir",
      "gastly",
      "gastly",
      "haunter",
      "haunter",
      "gengar",
      "gengar",
      "rotom",
      "rotom",
      "mimikyu",
      "shadowball",
      "shadowball",
      "darkpulse",
      "darkpulse",
      "superball",
      "hyperball",
    ],
  },
  {
    id: "sinnoh_byron",
    region: "sinnoh",
    name: "운하시티 관장 동관",
    sprite: "byron",
    title: "체육관 관장",
    emoji: "🛡️",
    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.96,
    reward: 600,
    hp: 60,
    requires: "sinnoh_fantina",
    gymType: "강철",
    battlefield: "fuego_ironworks",
    gimmick: "foundry_armor",
    signatureCard: "sinnoh_byron_bastiodon",
    introLines: [
      "강철은 두드릴수록 단단해진다! 내 방어를 뚫어봐라!",
      "골풀무제철소의 강철벽을 부술 힘이 있는지 보자!",
    ],
    winLines: ["하하하! 그 정도 공격으론 강철벽에 흠집도 못 낸다!"],
    loseLines: ["훌륭하다! 내 강철 방어를 정면으로 뚫었군!"],
    deck: [
      "sinnoh_byron_bastiodon",
      "shieldon",
      "shieldon",
      "bastiodon",
      "bastiodon",
      "bronzor",
      "bronzor",
      "bronzong",
      "bronzong",
      "onix",
      "onix",
      "steelix",
      "steelix",
      "skarmory",
      "skarmory",
      "magnemite",
      "magnemite",
      "magneton",
      "magneton",
      "magnezone",
      "magnezone",
      "scyther",
      "scizor",
      "ironhead",
      "ironhead",
      "earthquake",
      "earthquake",
      "superball",
      "hyperball",
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

// 신오는 호연처럼 HP/AI 수치를 계속 올리는 대신,
// 기존 체육관 기믹이 안정적으로 작동하도록 덱의 질만 한 단계 보정한다.
// 각 교체는 1:1이므로 덱 장수는 그대로 30장을 유지한다.
const SINNOH_DECK_UPGRADES = {
  sinnoh_roark: [
    ["pokeball", "hyperball"],
    ["sandstorm", "fullrestore"],
  ],
  sinnoh_gardenia: [
    ["pokeball", "hyperball"],
    ["pokeball", "fullrestore"],
    ["cherrim", "lifeorb"],
  ],
  sinnoh_maylene: [
    ["superball", "hyperball"],
    ["quickattack", "lifeorb"],
    ["hitmontop", "focussash"],
  ],
  sinnoh_wake: [
    ["quagsire", "hyperball"],
    ["golduck", "fullrestore"],
  ],
  sinnoh_fantina: [
    ["superball", "hyperball"],
    ["darkpulse", "fullrestore"],
  ],
  sinnoh_byron: [
    ["superball", "fullrestore"],
    ["ironhead", "focussash"],
  ],
};

for (const [trainerId, replacements] of Object.entries(SINNOH_DECK_UPGRADES)) {
  const trainer = TRAINER_MAP[trainerId];
  if (!trainer?.deck) continue;

  replacements.forEach(([fromCardId, toCardId]) => {
    const index = trainer.deck.indexOf(fromCardId);
    if (index !== -1) trainer.deck[index] = toCardId;
  });
}
