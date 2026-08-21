import {
  TRAINERS_BY_REGION,
  TRAINERS,
  TRAINER_MAP,
} from "../trainers.js";

// BW 최종전의 N 파티를 포케스톤식으로 재구성한다.
// 레시라무/제크로무는 덱에 넣지 않고 2·3페이즈 진입 시 강제 합류한다.
//
// 3.2 강화 방향:
// - 원작 최종전의 늑골라 / 아케오스 / 배바닐라 / 기기기어르 계열은 유지한다.
// - 소미안 → 엘풍의 짓궂은마음으로 비공격 기술을 찾아 상태이상 압박을 이어간다.
// - 상태이상인 포켓몬이 공격하면 N 친밀도 기믹의 추가 감소 조건이 발동하므로,
//   단순 화력보다 '공격할지 말지'를 고민하게 만드는 컨트롤 덱으로 강화한다.
const N_DECK = [
  // 원작 N 핵심 파티
  "tirtouga", "tirtouga", "carracosta", "carracosta",
  "archen", "archen", "archeops", "archeops",
  "vanillite", "vanillite", "vanillish", "vanilluxe",
  "klink", "klink", "klang", "klinklang",

  // 상태 기술을 찾아오는 컨트롤 엔진
  "cottonee", "cottonee", "whimsicott", "whimsicott",

  // 친밀도 압박용 상태이상 기술
  "spore", "spore",
  "toxic", "toxic",
  "willowisp",
  "thunderwave_move",
  "sludgewave",

  // 에이스 강화 / 마무리 / 유지력
  "shellsmash",
  "geargrind",
  "fullrestore",
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
