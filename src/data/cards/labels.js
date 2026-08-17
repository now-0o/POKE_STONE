import { ABILITY_TEXT, CARD_MAP } from "../../data/cards.js";

// 기존 카드 ID/효과는 유지하고 화면에 표시되는 이름/설명만 정리한다.
if (CARD_MAP.recover) {
  CARD_MAP.recover.name = "HP회복";
}

if (CARD_MAP.fullrestore) {
  CARD_MAP.fullrestore.text =
    "아군 포켓몬 하나의 체력을 모두 회복하고 상태이상을 해제한다. 트레이너에게 사용하면 체력을 8 회복한다.";
}

if (ABILITY_TEXT.primordialsea) {
  ABILITY_TEXT.primordialsea =
    "하이드로펌프: 나왔을 때 비를 내리고, 상대 포켓몬 전체에게 물 타입 피해 2";
}

const WEATHER_MOVE_TYPE = {
  rain: "물",
  sun: "불꽃",
  sand: "바위",
  hail: "얼음",
  snow: "얼음",
};

function cleanTechniqueText(text) {
  return text
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*타입 상성을 적용한다\.?/g, "")
    .replace(/\s*타입 상성 적용\.?/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

Object.values(CARD_MAP).forEach((card) => {
  if (card?.kind !== "spell" || card.type !== "기술") return;

  if (card.spell?.effect === "weather") {
    const weatherType = WEATHER_MOVE_TYPE[card.spell.weather];
    if (weatherType) card.moveType = weatherType;
  }

  if (typeof card.text === "string") {
    card.text = cleanTechniqueText(card.text);
  }
});

// 기술 카드 설명은 게임 효과와 분리해 플레이어에게 보이는 문구만 관리한다.
const TECHNIQUE_TEXT = {
  hydropump:
    "대량의 물을 세찬 기세로 상대에게 발사하여 피해 4를 입힌다.",
  flamethrower:
    "세찬 불꽃을 상대에게 발사해서 피해 4를 입힌다.",
  solarbeam:
    "빛의 다발을 발사하여 피해 5를 입힌다. 날씨가 맑을 때는 비용이 2 줄어든다.",
  thunderbolt:
    "강한 전격을 상대에게 날려서 피해 4를 입힌다.",
  psychic:
    "강한 염동력을 상대에게 보내어 피해 4를 입힌다.",
  icebeam:
    "냉동빔을 상대에게 발사하여 피해 3을 입히고, 포켓몬이라면 얼음 상태로 만든다.",
  stoneedge:
    "뾰족한 바위를 상대에게 꿰찔러서 피해 4를 입힌다.",
  moonblast:
    "달의 파워를 빌려서 상대를 피해 4를 입힌다.",
  infight:
    "상대 쪽으로 깊숙이 돌격하여 피해 4를 입힌다.",
  shadowball:
    "까만 그림자의 덩어리를 내던져서 피해 4를 입힌다.",
  darkpulse:
    "악의로 가득한 무서운 오라로 피해 4를 입힌다.",
  ironhead:
    "강철과 같은 단단한 머리로 피해 4를 입힌다.",
  dragonclaw:
    "날카롭고 뾰족하며 거대한 발톱으로 상대를 베어 갈라서 피해 4를 입힌다.",
  earthquake:
    "지진의 충격으로 상대 포켓몬에게 피해 4를 입힌다.",
  surf:
    "큰 파도를 일으켜 주위에 있는 상대 포켓몬에게 피해 3을 입힌다.",
  quickattack:
    "눈에 보이지 않는 굉장한 속도로 상대에게 돌진하여 피해 1을 입히고 카드를 한장 뽑는다.",
  raindance:
    "비를 내리게 한다. 비가 내리는 동안 물 포켓몬의 공격력이 1 증가하고 쓱쓱이 발동한다.",
  sunnyday:
    "햇살을 강하게 해 날씨를 쾌청으로 만든다. 쾌청 동안 불꽃 포켓몬의 공격력이 1 증가하고 엽록소·선파워가 발동한다.",
  sandstorm:
    "모래바람을 일으킨다. 매 턴 종료 시 바위, 땅, 강철 타입이 아닌 양쪽 포켓몬 모두에게 피해 1을 입힌다.",
  sheercold:
    "절대영도의 추위로 상대를 공격한다. 맞으면 일격에 기절한다.",
  fissure:
    "땅이 갈라진 곳에 상대를 떨어뜨려 공격한다. 맞으면 일격에 기절한다.",
  horndrill:
    "회전하는 뿔을 상대에게 꿰찔러서 공격한다. 맞으면 일격에 기절한다.",
  guillotine:
    "큰 집게로 상대를 베어 갈라 공격한다. 맞으면 일격에 기절한다.",
  hyperbeam:
    "강한 광선을 상대에게 발사하여 피해 9를 입힌다.",
  fireblast:
    "큰대자의 불꽃으로 피해 7을 입히고 포켓몬이라면 화상 상태로 만든다.",
  blizzardmove:
    "세찬 눈보라를 내뿜어 상대 포켓몬에게 3의 피해를 입히고 40%의 확률로 얼음 상태로 만든다.",
  heatwave:
    "뜨거운 숨결을 내뿜어 상대 포켓몬에게 3의 피해를 입히고 40%의 확률로 화상 상태로 만든다.",
  sludgewave:
    "오물 파도로 상대 포켓몬에게 2의 피해를 입히고 독 상태로 만든다.",
  discharge:
    "눈부신 전격으로 주위에 있는 모두를 공격한다.",
  dracometeor:
    "천공에서 운석을 떨어뜨려 상대 포켓몬에게 4의 피해를 입히고 아군 포켓몬의 공격력을 1 낮춘다.",
  explosionmove:
    "큰 폭발로 모든 포켓몬에게 피해 8을 입힌다.",
  perishsong:
    "노래를 들은 포켓몬은 2턴이 지나면 기절한다.",
  spore:
    "최면 효과가 있는 포자를 훌훌 흩뿌려서 상대를 잠듦 상태로 만든다.",
  willowisp:
    "으스스하고 괴상한 불꽃을 쏘아 상대를 화상 상태로 만든다.",
  thunderwave_move:
    "약한 전격을 날려서 상대를 마비 상태로 만든다.",
  toxic:
    "상대를 독 상태로 만들고 즉시 피해 1을 입힌다.",
  recover:
    "세포를 재생시켜 HP를 6 회복한다.",
  roar:
    "상대를 도망가게 하여 상대 포켓몬을 상대 손으로 반환한다.",
  safeguard:
    "2턴 동안 이상한 힘의 보호를 받아 상태 이상이 되지 않는다.",
  haze:
    "흑안개를 뿜어 배틀에 참가 중인 포켓몬 전원의 공격력을 원래대로 돌린다.",
};

Object.entries(TECHNIQUE_TEXT).forEach(([cardId, text]) => {
  if (CARD_MAP[cardId]) {
    CARD_MAP[cardId].text = text;
  }
});
