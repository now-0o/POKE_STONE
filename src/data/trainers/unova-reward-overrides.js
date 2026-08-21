import { TRAINERS_BY_REGION, TRAINERS, TRAINER_MAP } from "../trainers.js";

// 하나지방은 난이도 상승폭에 비해 승리 보상이 과도하게 높아
// 신오 이후의 성장감은 유지하되 전체 보상량은 완만하게 조정한다.
const UNOVA_REWARDS = {
  unova_striaton: 300,
  unova_lenora: 330,
  unova_burgh: 360,
  unova_elesa: 390,
  unova_clay: 420,
  unova_skyla: 450,
  unova_brycen: 480,
  unova_drayden: 520,
};

for (const [id, reward] of Object.entries(UNOVA_REWARDS)) {
  const mapped = TRAINER_MAP[id];
  if (mapped) mapped.reward = reward;

  const trainer = TRAINERS.find((entry) => entry.id === id);
  if (trainer) trainer.reward = reward;

  const regional = TRAINERS_BY_REGION.unova?.find((entry) => entry.id === id);
  if (regional) regional.reward = reward;
}
