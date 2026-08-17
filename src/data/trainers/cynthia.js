import {
  TRAINERS_BY_REGION,
  TRAINERS,
  TRAINER_MAP,
} from "../trainers.js";
import { CYNTHIA_SIGNATURE_IDS } from "../cards/cynthia.js";

export const CYNTHIA_TRAINER = {
  id: "sinnoh_cynthia",
  region: "sinnoh",
  name: "신오 챔피언 난천",
  sprite: "cynthia",
  title: "신오 챔피언",
  emoji: "👑",
  aiLevel: 6,
  stableDeck: false,
  reward: 370,
  hp: 72,
  requires: "sinnoh_volkner",
  gymType: null,
  battlefield: "sinnoh_champion_room",
  gimmick: "champion_party",
  signatureCard: "sinnoh_cynthia_garchomp",
  introLines: [
    "포켓몬과 함께 쌓아온 모든 선택이 지금 이 승부에서 드러날 거야.",
    "내 여섯 포켓몬과 네가 어디까지 갈 수 있는지 보여줘.",
  ],
  winLines: [
    "좋은 승부였어. 하지만 챔피언의 파티는 마지막 한 마리까지 끝나지 않아.",
  ],
  loseLines: [
    "훌륭해. 여섯 마리 모두의 가능성을 넘어섰구나. 네가 새로운 챔피언이야.",
  ],
  deck: [...CYNTHIA_SIGNATURE_IDS],
};

if (!TRAINERS_BY_REGION.sinnoh.some((trainer) => trainer.id === CYNTHIA_TRAINER.id)) {
  TRAINERS_BY_REGION.sinnoh.push(CYNTHIA_TRAINER);
}

const trainerIndex = TRAINERS.findIndex((trainer) => trainer.id === CYNTHIA_TRAINER.id);
if (trainerIndex === -1) TRAINERS.push(CYNTHIA_TRAINER);
else TRAINERS[trainerIndex] = CYNTHIA_TRAINER;

TRAINER_MAP[CYNTHIA_TRAINER.id] = CYNTHIA_TRAINER;
