import { ABILITY_TEXT, CARD_MAP } from "../cards.js";

const LEGENDARY_ABILITIES = {
  cobalion: {
    ability: "quickguard",
    text: "퍼스트가드: 상대 턴마다 처음으로 다른 아군 포켓몬이 기본 공격 또는 단일 대상 기술의 대상이 되면 대신 대상이 되고, 그 피해를 2 줄인다.",
  },
  terrakion: {
    ability: "retaliate",
    text: "원수갚기: 이 카드가 손에 있을 때 아군 포켓몬이 기절하면 다음 내 턴 동안 비용 -3, 돌진을 얻는다.",
  },
  virizion: {
    ability: "worryseed",
    text: "고민씨: 나왔을 때 상대 포켓몬 하나를 선택한다. 비리디온이 필드에 있는 동안 그 포켓몬의 특성을 비활성화한다.",
  },
  tornadus: {
    ability: "tailwind",
    text: "순풍: 필드에 있는 동안 매 내 턴 처음 내는 다른 포켓몬의 비용 -2. 그 포켓몬은 그 턴 즉시 공격할 수 있다.",
  },
  thundurus: {
    ability: "charge",
    text: "충전: 내 턴 종료 시 남은 에너지를 최대 3 저장한다. 다음 내 턴 시작 시 저장한 만큼 추가 에너지를 얻는다.",
  },
  landorus: {
    ability: "gravity",
    text: "중력: 필드에 있는 동안 상대 카드의 비용은 원래 비용보다 낮아질 수 없다. 아군의 땅 타입 공격은 비행·부유·풍선의 땅 면역을 무시한다.",
  },
  kyurem: {
    ability: "glaciate",
    text: "얼어붙은세계: 나왔을 때 상대 손패를 공개하고 카드 2장을 선택해 봉인한다. 큐레무가 필드에 있는 동안 봉인된 카드는 사용할 수 없다.",
  },
};

for (const [cardId, config] of Object.entries(LEGENDARY_ABILITIES)) {
  const card = CARD_MAP[cardId];
  if (!card) continue;
  card.ability = config.ability;
  ABILITY_TEXT[config.ability] = config.text;
}

if (CARD_MAP.discharge) {
  CARD_MAP.discharge.text =
    "상대 포켓몬 전체에게 전기 타입 피해 2를 준다. 각각 50% 확률로 마비 상태이상.";
}

if (CARD_MAP.dracometeor?.spell) {
  CARD_MAP.dracometeor.spell.amount = 6;
  CARD_MAP.dracometeor.text =
    "상대 포켓몬 전체에게 드래곤 피해 6. 사용 후 내 포켓몬 전체 공격력 -1.";
}

if (CARD_MAP.fireblast?.spell) {
  CARD_MAP.fireblast.spell.target = "enemy-any";
  CARD_MAP.fireblast.text =
    "상대 하나에게 불꽃 피해 7. 대상이 포켓몬이면 화상 상태로 만든다.";
}
