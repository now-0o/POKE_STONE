import {
  TRAINER_CARDS,
  CARD_MAP,
  DEX,
  ABILITY_TEXT,
} from "../cards.js";

export const CYNTHIA_SIGNATURE_IDS = [
  "sinnoh_cynthia_spiritomb",
  "sinnoh_cynthia_roserade",
  "sinnoh_cynthia_gastrodon",
  "sinnoh_cynthia_lucario",
  "sinnoh_cynthia_milotic",
  "sinnoh_cynthia_garchomp",
];

export const CYNTHIA_RECALL_CARD_ID = "sinnoh_cynthia_recall";

const CYNTHIA_CARDS = [
  {
    id: "sinnoh_cynthia_spiritomb",
    name: "난천의 화강돌",
    kind: "pokemon",
    type: "고스트",
    cost: 0,
    atk: 5,
    hp: 10,
    rarity: "L",
    stage: 0,
    ability: "cynthia_spite",
    secondaryAbility: "cynthia_pain_split",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_cynthia_roserade",
    name: "난천의 로즈레이드",
    kind: "pokemon",
    type: "풀",
    cost: 0,
    atk: 7,
    hp: 8,
    rarity: "L",
    stage: 0,
    ability: "cynthia_toxic_spikes",
    secondaryAbility: "cynthia_synthesis",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_cynthia_gastrodon",
    name: "난천의 트리토돈",
    kind: "pokemon",
    type: "물",
    cost: 0,
    atk: 5,
    hp: 11,
    rarity: "L",
    stage: 0,
    ability: "cynthia_stockpile",
    secondaryAbility: "cynthia_mirror_coat",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_cynthia_lucario",
    name: "난천의 루카리오",
    kind: "pokemon",
    type: "격투",
    cost: 0,
    atk: 7,
    hp: 8,
    rarity: "L",
    stage: 0,
    ability: "cynthia_extreme_speed",
    secondaryAbility: "cynthia_reversal",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_cynthia_milotic",
    name: "난천의 밀로틱",
    kind: "pokemon",
    type: "물",
    cost: 0,
    atk: 6,
    hp: 11,
    rarity: "L",
    stage: 0,
    ability: "cynthia_competitive",
    secondaryAbility: "cynthia_aqua_ring",
    signature: true,
    trainerOnly: true,
  },
  {
    id: "sinnoh_cynthia_garchomp",
    name: "난천의 한카리아스",
    kind: "pokemon",
    type: "드래곤",
    cost: 0,
    atk: 7,
    hp: 10,
    rarity: "L",
    stage: 0,
    ability: "cynthia_swords_dance",
    secondaryAbility: "cynthia_dragon_rush",
    signature: true,
    trainerOnly: true,
  },
  {
    id: CYNTHIA_RECALL_CARD_ID,
    name: "돌아와!",
    kind: "spell",
    type: "기술",
    cost: 0,
    rarity: "L",
    emoji: "↩️",
    trainerOnly: true,
    spell: {
      effect: "cynthia_recall",
    },
    text: "현재 필드의 포켓몬을 체력을 유지한 채 손으로 되돌리고, 대기 중인 다른 시그니처 포켓몬과 교체한다.",
  },
];

for (const card of CYNTHIA_CARDS) {
  if (CARD_MAP[card.id]) continue;
  TRAINER_CARDS.push(card);
  CARD_MAP[card.id] = card;
}

Object.assign(DEX, {
  sinnoh_cynthia_spiritomb: 442,
  sinnoh_cynthia_roserade: 407,
  sinnoh_cynthia_gastrodon: 423,
  sinnoh_cynthia_lucario: 448,
  sinnoh_cynthia_milotic: 350,
  sinnoh_cynthia_garchomp: 445,
});

Object.assign(ABILITY_TEXT, {
  cynthia_spite:
    "원한: 이 포켓몬이 필드에 있는 동안 플레이어의 기술 카드 비용이 1 증가한다.",
  cynthia_pain_split:
    "아픔나누기: 전투당 1회, 체력이 절반 이하가 되면 플레이어 필드에서 현재 체력이 가장 높은 포켓몬과 현재 체력을 평균으로 맞춘다.",
  cynthia_toxic_spikes:
    "독압정: 처음 필드에 나올 때 플레이어 진영에 독압정 2개를 설치한다. 이후 기본 포켓몬이 새로 나오면 1개를 소모해 독 상태로 만든다.",
  cynthia_synthesis:
    "광합성: 전투당 1회, 돌아와!로 손에 돌아갈 때 체력을 2 회복한다.",
  cynthia_stockpile:
    "비축하기: 돌아와!로 손에 돌아갈 때 +1/+1을 얻는다. 최대 2회이며 재출전 후에도 유지된다.",
  cynthia_mirror_coat:
    "미러코트: 매 플레이어 턴 처음으로 기술 카드 피해를 받으면 플레이어 본체에 피해 2를 되돌린다.",
  cynthia_extreme_speed:
    "신속: 돌진. 돌아와!로 교체 등장한 턴의 첫 공격 피해가 2 증가한다.",
  cynthia_reversal:
    "기사회생: 체력이 절반 이하일 때 공격 피해 +1. 체력이 2 이하라면 대신 +2.",
  cynthia_competitive:
    "승기: 상대 효과로 공격력이 감소하면 즉시 공격력 +2. 최대 2회 발동한다.",
  cynthia_aqua_ring:
    "아쿠아링: 난천의 턴 종료 시 이 포켓몬이 필드에 있으면 체력을 1 회복한다.",
  cynthia_swords_dance:
    "칼춤: 처음 필드에 나올 때 이미 기절한 난천의 포켓몬 수에 따라 공격력이 증가한다.\n2~3마리 기절: 공격력 +1\n4마리 기절: 공격력 +2\n5마리 기절: 공격력 +3",
  cynthia_dragon_rush:
    "드래곤다이브: 마지막 포켓몬으로 등장하면 즉시 공격할 수 있다. 첫 공격 피해 +2. 그 공격을 버틴 포켓몬은 다음 턴에 공격할 수 없다.",
});
