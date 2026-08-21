import {
  TRAINERS_BY_REGION,
  TRAINERS,
  TRAINER_MAP,
} from "../trainers.js";

// BW 최종전의 N 파티를 포케스톤식으로 재구성한다.
// 레시라무/제크로무는 덱에 넣지 않고 2·3페이즈 진입 시 강제 합류한다.
const N_DECK = [
  "tirtouga", "tirtouga", "carracosta", "carracosta",
  "archen", "archen", "archeops", "archeops",
  "vanillite", "vanillite", "vanillish", "vanillish", "vanilluxe", "vanilluxe",
  "klink", "klink", "klang", "klang", "klinklang", "klinklang",
  "geargrind", "geargrind",
  "stoneedge", "stoneedge",
  "icebeam", "icebeam",
  "reflect", "lightscreen", "hyperball", "fullrestore",
];

export const UNOVA_N = {
  id: "unova_n",
  region: "unova",
  name: "N",
  sprite: "n",
  title: "플라스마단의 왕",
  emoji: "♟️",
  aiLevel: 7,
  stableDeck: true,
  consistencyAssist: 0.6,
  reward: 620,
  hp: 96,
  requires: "unova_drayden",
  gymType: "변화",
  battlefield: "n_castle",
  gimmick: "n_bond",
  introLines: [
    "나는 포켓몬의 목소리를 들을 수 있어. 네 포켓몬은 정말 너와 함께 싸우길 원할까?",
    "상처 입은 마음을 계속 몰아붙인다면, 그 아이는 스스로 내 쪽을 선택할 거야.",
  ],
  winLines: [
    "들리지 않아? 포켓몬들이 자유를 원하고 있어.",
  ],
  loseLines: [
    "포켓몬과 인간이 함께하는 답도... 존재하는 걸까.",
  ],
  deck: N_DECK,
};

if (!TRAINERS_BY_REGION.unova) TRAINERS_BY_REGION.unova = [];
const regionalIndex = TRAINERS_BY_REGION.unova.findIndex(
  (entry) => entry.id === UNOVA_N.id,
);
if (regionalIndex === -1) TRAINERS_BY_REGION.unova.push(UNOVA_N);
else TRAINERS_BY_REGION.unova[regionalIndex] = UNOVA_N;

const trainerIndex = TRAINERS.findIndex((entry) => entry.id === UNOVA_N.id);
if (trainerIndex === -1) TRAINERS.push(UNOVA_N);
else TRAINERS[trainerIndex] = UNOVA_N;

TRAINER_MAP[UNOVA_N.id] = UNOVA_N;
