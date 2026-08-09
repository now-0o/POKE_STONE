// ============================================================
// 포스스톤 카드 데이터베이스 (v0.4 대규모 리밸런스)
// 228장 = 포켓몬 201 + 기술 22 + 메가스톤 5
// 밸런스 기준: 바닐라 스탯합 = 2*코스트+2, 특성 -1, 진화 +2
// ============================================================

export const RARITY_NAME = { C: "커먼", R: "레어", E: "에픽", L: "레전드" };
export const RARITY_REFUND = { C: 5, R: 20, E: 40, L: 100 };
export const MAX_COPIES = { C: 2, R: 2, E: 2, L: 1 };

export const TYPE_COLORS = {
  노말: "#A8A77A",
  불꽃: "#EE8130",
  물: "#6390F0",
  전기: "#F7D02C",
  풀: "#7AC74C",
  얼음: "#96D9D6",
  격투: "#C22E28",
  독: "#A33EA1",
  땅: "#E2BF65",
  비행: "#A98FF3",
  에스퍼: "#F95587",
  벌레: "#A6B91A",
  바위: "#B6A136",
  고스트: "#735797",
  드래곤: "#6F35FC",
  악: "#705746",
  강철: "#B7B7CE",
  페어리: "#D685AD",
  기술: "#7a5ea8",
  도구: "#4a9b8e",
};

export const TYPE_CHART = {
  노말: { 바위: 0.5, 강철: 0.5, 고스트: 0 },
  불꽃: {
    풀: 1.5,
    얼음: 1.5,
    벌레: 1.5,
    강철: 1.5,
    불꽃: 0.5,
    물: 0.5,
    바위: 0.5,
    드래곤: 0.5,
  },
  물: { 불꽃: 1.5, 땅: 1.5, 바위: 1.5, 물: 0.5, 풀: 0.5, 드래곤: 0.5 },
  풀: {
    물: 1.5,
    땅: 1.5,
    바위: 1.5,
    불꽃: 0.5,
    풀: 0.5,
    독: 0.5,
    비행: 0.5,
    벌레: 0.5,
    드래곤: 0.5,
    강철: 0.5,
  },
  전기: { 물: 1.5, 비행: 1.5, 풀: 0.5, 전기: 0.5, 드래곤: 0.5, 땅: 0 },
  얼음: {
    풀: 1.5,
    땅: 1.5,
    비행: 1.5,
    드래곤: 1.5,
    불꽃: 0.5,
    물: 0.5,
    얼음: 0.5,
    강철: 0.5,
  },
  격투: {
    노말: 1.5,
    얼음: 1.5,
    바위: 1.5,
    악: 1.5,
    강철: 1.5,
    독: 0.5,
    비행: 0.5,
    에스퍼: 0.5,
    벌레: 0.5,
    페어리: 0.5,
    고스트: 0,
  },
  독: {
    풀: 1.5,
    페어리: 1.5,
    독: 0.5,
    땅: 0.5,
    바위: 0.5,
    고스트: 0.5,
    강철: 0,
  },
  땅: {
    불꽃: 1.5,
    전기: 1.5,
    독: 1.5,
    바위: 1.5,
    강철: 1.5,
    풀: 0.5,
    벌레: 0.5,
    비행: 0,
  },
  비행: { 풀: 1.5, 격투: 1.5, 벌레: 1.5, 전기: 0.5, 바위: 0.5, 강철: 0.5 },
  에스퍼: { 격투: 1.5, 독: 1.5, 에스퍼: 0.5, 강철: 0.5, 악: 0 },
  벌레: {
    풀: 1.5,
    에스퍼: 1.5,
    악: 1.5,
    불꽃: 0.5,
    격투: 0.5,
    독: 0.5,
    비행: 0.5,
    고스트: 0.5,
    강철: 0.5,
    페어리: 0.5,
  },
  바위: {
    불꽃: 1.5,
    얼음: 1.5,
    비행: 1.5,
    벌레: 1.5,
    격투: 0.5,
    땅: 0.5,
    강철: 0.5,
  },
  고스트: { 에스퍼: 1.5, 고스트: 1.5, 악: 0.5, 노말: 0 },
  드래곤: { 드래곤: 1.5, 강철: 0.5, 페어리: 0 },
  악: { 에스퍼: 1.5, 고스트: 1.5, 격투: 0.5, 악: 0.5, 페어리: 0.5 },
  강철: {
    얼음: 1.5,
    바위: 1.5,
    페어리: 1.5,
    불꽃: 0.5,
    물: 0.5,
    전기: 0.5,
    강철: 0.5,
  },
  페어리: { 격투: 1.5, 드래곤: 1.5, 악: 1.5, 불꽃: 0.5, 독: 0.5, 강철: 0.5 },
};

export const SAND_IMMUNE_TYPES = ["바위", "땅", "강철"];

export const ABILITY_TEXT = {
  // 핀치 계열
  torrent: "급류: 체력이 절반 이하면 공격력 +2",
  blaze: "맹화: 체력이 절반 이하면 공격력 +2",
  overgrow: "심록: 체력이 절반 이하면 공격력 +2",
  guts: "근성: 체력이 절반 이하면 공격력 +2",
  // 날씨/필드
  swiftswim: "쓱쓱: 비가 내리는 동안 돌진을 얻는다",
  chlorophyll: "엽록소: 쾌청일 때 비용이 1 줄어든다",
  solarpower: "선파워: 쾌청일 때 공격력 +2",
  drizzle: "잔비: 나왔을 때 날씨를 비로 만든다",
  drought: "가뭄: 나왔을 때 날씨를 쾌청으로 만든다",
  sandstream: "모래날림: 나왔을 때 날씨를 모래바람으로 만든다",
  airlock: "에어록: 나왔을 때 모든 날씨를 없앤다",
  sandveil: "모래숨기: 모래바람일 때 받는 피해 1 감소",
  sandforce:
  "모래의힘: 모래바람 동안 공격력 +2",
  // 방어/생존
  originpulse:
    "근원의파동: 나올 때 폭우 발동. 상대 전체 물 피해 3 + 무작위 1마리를 얼린다",
  icebeamdance:
    "오로라빔: 나올 때 상대 전체 얼음 피해 2 + 1마리에게 얼음 상태이상",
  skydive: "불사르기: 나올 때 불꽃 피해 3을 무작위로 3회 입힌다",
  burningfall:
    "분화: 나올 때 적 전체 불꽃 피해 3. 쾌청이면 피해 +2",
  thunderwave:
    "천둥차기: 나올 때 적 전체 전기 피해 3. 무작위 1마리에게 마비 상태이상",
  thunderfang:
    "와일드볼트: 나올 때 무작위 상대에게 전기 피해 4 + 마비 상태이상",
  precipiceblades:
    "단애의칼: 나올 때 쾌청 발동. 상대 전체 땅 피해 4",
  frostedgale:
    "얼어붙는시선: 나올 때 상대 전체 얼음 피해 2 + 전부 얼음 상태이상",
  icelock:
    "눈보라: 나올 때 상대 전체에게 얼음 상태이상 + 얼음 피해 1",
  leafstorm:
    "리프스톰: 나올 때 상대 전체 풀 피해 2 + 아군 전체 회복 2 + 카드 1장 드로우",
  aeroblast:
    "에어로블라스트: 나올 때 상대 전체 비행 피해 3. 멀티스케일(풀피 시 피해 절반) 유지",
  rockblast:
    "스톤에지: 나올 때 상대에게 바위 피해 2를 무작위로 4회 입힌다",
  mistball:
    "미스트볼: 나올 때 무작위 상대에게 드래곤 피해 4. 아군 드래곤 포켓몬 공격력 +1",
  dragonascent:
    "화룡점정: 나올 때 날씨 초기화. 상대 전체 드래곤 피해 3",
  irondefense:
    "철벽: 나올 때 도발로 모든 공격을 자신에게 유도하고 체력 +3을 얻는다",
  taunt: "도발: 상대는 이 포켓몬을 먼저 공격해야 한다",
  sturdy: "옹골참: 체력이 가득 찼을 때 치명적인 피해를 버티고 체력 1이 남는다",
  disguise: "탈: 몸을 덮는 탈로 1번 공격을 막고 1의 피해를 입는다.",
  levitate: "부유: 땅 타입의 기술을 받지 않는다",
  thickfat: "두꺼운지방: 불꽃/얼음 타입에게 받는 피해 1 감소",
  waterabsorb: "저수: 물 타입 공격을 받으면 피해 대신 체력을 1 회복한다",
  voltabsorb: "축전: 전기 타입 공격을 받으면 피해 대신 체력을 1 회복한다",
  flashfire: "타오르는불꽃: 불꽃 타입 피해를 받지 않는다",
  multiscale: "멀티스케일: 체력이 가득일 때 받는 피해가 절반이 된다",
  regenerator: "재생력: 내 턴 종료 시 이 포켓몬의 체력을 1 회복한다",
  fortress: "바디프레스: 도발. 공격할 수 없지만, 반격 피해는 현재 체력과 같다",
  // 반격
  static: "정전기: 접촉 시 피해 1 + 40% 확률로 상대에게 마비 상태이상",
  poisonbarb: "독가시: 공격당할 때 30% 확률로 상대에게 독 상태이상",
  poisonpoint: "독침: 공격할 때 30% 확률로 상대에게 독 상태이상",
  flamebody: "불꽃몸: 공격당할 때 30% 확률로 상대에게 화상 상태이상",
  icebody: "냉동몸: 공격당할 때 20% 확률로 상대에게 얼음 상태이상",
  freezedry: "프리즈드라이: 공격할 때 25% 확률로 상대에게 얼음 상태이상",
  serenegrace:
    "천진: 상태이상기 발동 확률 2배 (이 포켓몬이 공격할 때 상태이상을 걸 확률 2배)",
  bigchance: "대운: 이 포켓몬이 공격할 때 피해를 1.5배로 입힌다",
  roughskin: "까칠한피부: 이 포켓몬을 공격한 상대에게 피해 2",
  // 공격 패턴
  rush: "돌진: 낸 턴에 바로 공격할 수 있다",
  skilllink: "스킬링크: 한 턴에 두 번 공격할 수 있다",
  noguard: "노가드: 도발을 무시하고 아무 대상이나 공격할 수 있다",
  moldbreaker:
    "틀깨기: 나올 때 상대 도발 포켓몬 하나를 골라 도발을 없애고 벌레 타입 피해 2를 입힌다",
  truant: "게으름: 공격한 다음 턴에는 쉬어야 한다",
  moxie: "자기과신: 상대 포켓몬을 쓰러뜨리면 공격력 +1",
  // 등장 효과
  intimidate: "위협: 나왔을 때 무작위 상대의 공격력을 2 낮춘다",
  keeneye: "예리한눈: 나왔을 때 카드를 1장 뽑는다",
  teleport: "텔레포트: 나왔을 때 카드를 1장 뽑는다",
  foresight: "예지: 나왔을 때 카드를 2장 뽑는다",
  metronome:
    "변신: 나올 때 상대 포켓몬 1마리를 선택해 그 공격력을 복사하고, 덱에서 포켓몬 1장을 손으로 가져온다",
  download: "다운로드: 나왔을 때 자신이 +1/+1을 얻는다",
  transform: "변신: 나왔을 때 무작위 상대 포켓몬의 능력치와 타입을 복사한다",
  sleeppowder: "수면가루: 나왔을 때 무작위 상대에게 잠듦 상태이상",
  hypnosis: "최면술: 나왔을 때 무작위 상대에게 잠듦 상태이상",
  sing: "자장가: 나왔을 때 무작위 상대에게 잠듦 상태이상",
  lovelykiss: "악마의키스: 나왔을 때 무작위 상대에게 잠듦 상태이상",
  moonlight: "달빛: 나왔을 때 아군 포켓몬 전체의 체력을 2 회복한다",
  purify: "정화: 나왔을 때 아군 전체의 체력을 2 회복하고 상태이상을 해제한다",
  sacredflame: "성스러운불꽃: 나왔을 때 아군 포켓몬 전체의 체력을 3 회복한다",
  healer: "치유의마음: 내 턴 종료 시 양옆 아군 포켓몬의 체력을 1 회복한다",
  timetravel: "자연회복: 나왔을 때 아군 전체 체력 2 회복, 카드 1장 뽑기",
  supremeoverlord:
    "총대장: 나왔을 때 다른 아군 포켓몬을 모두 희생하고, 1마리당 +1/+1을 얻는다",
  // 등장 피해
  thunderstrike: "번개: 나왔을 때 상대 포켓몬 전체에게 전기 타입 피해 2",
  psystrike:
    "사이코브레이크: 나왔을 때 상대 포켓몬 전체에게 에스퍼 타입 피해 3",
  flamesiege: "불대문자: 나왔을 때 무작위 상대 포켓몬에게 불꽃 타입 피해 3",
  earthpower: "대지의힘: 나왔을 때 무작위 상대 포켓몬에게 땅 타입 피해 3",
  eruption: "분화: 나왔을 때 상대 포켓몬 전체에게 불꽃 타입 피해 2",
  muddywater: "탁류: 나왔을 때 상대 포켓몬 전체에게 물 타입 피해 1",
  blizzard:
    "눈보라: 나왔을 때 상대 전체에게 얼음 타입 피해 1, 무작위 하나에게 얼음 상태이상",
  primordialsea:
    "시작의바다: 나왔을 때 비를 내리고, 상대 포켓몬 전체에게 물 타입 피해 2",
  desolateland:
    "끝의대지: 나왔을 때 쾌청을 만들고, 상대 포켓몬 전체에게 땅 타입 피해 2",
  freezer: "냉동빔: 나왔을 때 무작위 상대에게 얼음 상태이상",
  explode: "대폭발: 기절하면 무작위 상대에게 피해 2",
  deathdraw: "예지몽: 이 포켓몬이 쓰러지면 카드를 1장 뽑는다",
  // 오라
  aura_grass: "꽃향기: 필드에 있는 동안 다른 아군 풀 포켓몬 공격력 +1",
  aura_electric: "라이트: 필드에 있는 동안 다른 아군 전기 포켓몬 공격력 +1",
  aura_fighting: "파동: 필드에 있는 동안 다른 아군 격투 포켓몬 공격력 +1",
  aura_dragon: "용의숨결: 필드에 있는 동안 다른 아군 드래곤 포켓몬 공격력 +1",

    // ============================================================
  // v6 확장 신규 특성
  // ============================================================

  pickup:
    "픽업: 나왔을 때 덱에서 메가스톤을 제외한 도구 카드 1장을 무작위로 손으로 가져온다",

  technician:
    "테크니션: 자신의 공격력이 3 이하라면 공격 피해 +2",

  clearbody:
    "클리어바디: 상대 효과로 공격력이 감소하지 않는다",

  oblivious:
    "둔감: 잠듦과 상대의 공격력 감소 효과에 면역",

  hypercutter:
    "괴력집게: 상대 효과로 공격력이 감소하지 않는다",

  rockhead:
    "돌머리: 자신의 공격이나 특성으로 발생하는 반동 피해를 받지 않는다",

  shellarmor:
    "조가비갑옷: 한 번의 공격으로 받는 피해가 최대 4를 넘지 않는다",

  aromatherapy:
    "아로마테라피: 내 턴 종료 시 상태이상인 아군 포켓몬 1마리의 상태이상을 해제한다",

  sheerforce:
    "우격다짐: 상태이상이 없는 포켓몬을 공격할 때 피해 +1",

  webtrap:
    "거미집: 나왔을 때 무작위 상대 포켓몬의 공격력 -1 및 독 상태이상",

  counter:
    "카운터: 전투 공격으로 피해를 받으면 받은 피해의 절반(올림)을 공격자에게 되돌린다",

  speedboost:
    "가속: 내 턴 종료마다 공격력 +1. 최대 +3",

  raindish:
    "젖은접시: 비가 내릴 때 내 턴 종료 시 체력 1 회복",

  effectspore:
    "포자: 공격당할 때 30% 확률로 공격자에게 독·마비·잠듦 중 하나를 건다",

  wonderguard:
    "불가사의부적: 약점 타입의 직접 공격이 아니면 피해를 받지 않는다. 상태이상·날씨 등 간접 피해는 받는다",

  waterveil:
    "수의베일: 화상 상태이상에 걸리지 않는다",

  marvelscale:
    "이상한비늘: 상태이상이 걸려 있으면 받는 피해 2 감소",

  forecast:
    "기분파: 날씨에 따라 자신의 타입이 변한다. 비=물, 쾌청=불꽃, 모래바람=바위, 날씨 없음=노말",

  colorchange:
    "변색: 타입 공격을 받으면 자신의 타입을 그 공격 타입으로 변경한다",

  cursedbody:
    "저주받은바디: 공격당하면 공격자의 공격력 -1",

  lusterpurge:
    "라스터퍼지: 나왔을 때 공격력이 가장 높은 상대 포켓몬에게 에스퍼 피해 4를 주고 공격력 -1",

  wishmaker:
    "소원메이커: 나왔을 때 아군 전체 체력 2 회복. 카드 1장 드로우",

  formchange:
    "폼체인지: 소환할 때 노말·어택·디펜스·스피드 폼 중 하나를 선택한다. 선택한 폼은 배틀 동안 고정된다",

  pressure:
    "프레셔: 필드에 있는 동안 상대 기술 카드의 비용이 1 증가한다",

  deoxys_attack:
    "어택폼: 소환 즉시 공격 가능. 첫 공격 피해 +5 및 반격 피해를 받지 않는다. 첫 공격 후 공격력 -3",

  deoxys_defense:
    "디펜스폼: 도발. 받는 피해 2 감소",

  deoxys_speed:
    "스피드폼: 소환 즉시 공격 가능. 한 턴에 두 번 공격할 수 있다",

  // 메가진화 전용
  megalauncher:
    "메가런처: 공격할 때 대상 양옆의 상대 포켓몬에게도 피해 1",

  toughclaws:
    "단단한발톱: 기본 공격 피해 +2",

  adaptability:
    "적응력: 상성 우위로 공격할 때 추가 피해 +2",

  trace:
    "트레이스: 메가진화할 때 무작위 상대 포켓몬의 특성을 복사한다",

  parentalbond:
    "부자유친: 공격 후 같은 대상에게 추가 피해 2",

  hugepower:
    "천하장사: 공격할 때 자신의 공격력을 2배로 계산한다",

  filter:
    "필터: 약점 타입으로 받는 피해 2 감소",

  pixilate:
    "페어리스킨: 기본 공격을 페어리 타입으로 취급하고 피해 +1",

  magicbounce:
    "매직미러: 자신에게 걸리는 상태이상을 건 상대에게 되돌린다",

  // ============================================================
  // 관동 트레이너 시그니처
  // ============================================================
  surge_overdrive:
    "스파크: 나왔을 때 공격력이 가장 높은 상대 포켓몬에게 전기 피해 1을 주고 마비시킨다.",
  sabrina_futureblade:
    "사이코커터: 나왔을 때 공격력이 가장 높은 상대 포켓몬의 공격력 -2.",
  erika_flowerdance:
    "그래스필드: 나왔을 때 쾌청. 필드에 있는 동안 다른 아군 풀 포켓몬 공격력 +1.",
  janine_toxicdust:
    "독가루: 나왔을 때 공격력이 가장 높은 상대 포켓몬을 독 상태로 만들고 공격력 -1.",
  misty_miraclestar:
    "물의파동: 나왔을 때 비. 비가 오는 동안 공격력 +2, 턴 종료 시 체력 1 회복.",
  brock_rockwall: "스톤에지: 도발. 받는 피해 2 감소.",
  blaine_eruption:
    "히트스탬프: 나왔을 때 쾌청. 상대 포켓몬 전체에게 불꽃 피해 2.",
  blue_hurricane:
    "폭풍: 소환 즉시 공격 가능. 매 턴 첫 공격 후 한 번 더 공격할 수 있다.",
  red_volttackle: "볼트태클: 나왔을 때 +4/+4. 공격할 때마다 반동으로 피해 2.",

  // ============================================================
  // 성도 트레이너 시그니처
  // ============================================================
  falkner_roost:
  "날개쉬기: 공격 후 체력 1 회복. 체력이 가득 차 있으면 대신 공격력 +1.",
  bugsy_furycutter:
  "연속자르기: 공격할 때마다 공격력 +1. 최대 +3.",
  whitney_rollout:
  "구르기: 공격할 때마다 다음 공격의 피해 +1. 피해를 받으면 중첩이 초기화된다.",
  morty_curse:
  "저주: 나왔을 때 공격력이 가장 높은 상대 포켓몬을 저주한다. 저주받은 포켓몬은 턴 종료마다 피해 1.",
  chuck_dynamicpunch:
  "폭발펀치: 공격으로 피해를 준 상대 포켓몬의 공격력 -1.",
  jasmine_autotomize:
  "바디퍼지: 도발. 피해를 받을 때마다 공격력 +1. 최대 +3.",
  pryce_iceshard:
  "얼음뭉치: 얼어 있는 포켓몬을 공격하면 피해 +2.",
  clair_dragonpulse:
  "용의파동: 상성으로 받는 추가 피해를 받지 않는다. 공격할 때마다 상대 트레이너에게 피해 1.",
  lance_thunder:
  "번개: 나왔을 때 공격력이 가장 높은 상대 포켓몬에게 전기 피해 2를 주고 마비시킨다.",
  lance_extremespeed:
  "신속: 소환된 턴에도 즉시 공격할 수 있다. 소환된 턴 첫 공격은 상대의 전투 반격 피해를 받지 않는다.",
  lance_outrage:
  "역린: 공격할 때 공격력 +2. 공격 후 자신이 피해 1을 받는다.",
  
};

const P = (id, name, type, cost, atk, hp, rarity, opts = {}) => ({
  id,
  name,
  kind: "pokemon",
  type,
  cost,
  atk,
  hp,
  rarity,
  stage: opts.stage || 0,
  ...opts,
});

export const CARDS = [
  // ============ 물 (20) ============
  P("mudkip", "물짱이", "물", 1, 1, 2, "C", { ability: "torrent" }),
  P("marshtomp", "늪짱이", "물", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "mudkip",
    ability: "torrent",
  }),
  P("swampert", "대짱이", "물", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "marshtomp",
    ability: "muddywater",
  }),
  P("magikarp", "잉어킹", "물", 1, 0, 2, "C", {
    ability: "swiftswim",
    flavor: "튀어오르는 것 말고는 아무것도 못 한다.",
  }),
  P("gyarados", "갸라도스", "물", 6, 9, 6, "E", {
    stage: 1,
    evolvesFrom: "magikarp",
    ability: "intimidate",
  }),
  P("lapras", "라프라스", "물", 4, 2, 7, "R", { ability: "taunt" }),
  P("vaporeon", "샤미드", "물", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "eevee",
    ability: "waterabsorb",
  }),
  P("politoed", "왕구리", "물", 4, 3, 6, "R", {
    stage: 2,
    evolvesFrom: "poliwhirl",
    ability: "drizzle",
  }),
  P("kyogre", "가이오가", "물", 8, 8, 9, "L", { ability: "originpulse" }),
  P("psyduck", "고라파덕", "물", 1, 1, 2, "C", {}),
  P("golduck", "골덕", "물", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "psyduck",
    ability: "swiftswim",
  }),
  P("horsea", "쏘드라", "물", 1, 1, 1, "C", {}),
  P("seadra", "시드라", "물", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "horsea",
  }),
  P("staryu", "별가사리", "물", 2, 1, 3, "C", { ability: "regenerator" }),
  P("starmie", "아쿠스타", "물", 4, 5, 6, "R", {
    stage: 1,
    evolvesFrom: "staryu",
    ability: "regenerator",
  }),
  P("mantyke", "타만타", "물", 1, 1, 2, "C", {}),
  P("mantine", "만타인", "물", 4, 2, 9, "R", {
    stage: 1,
    evolvesFrom: "mantyke",
    ability: "waterabsorb",
  }),
  P("barboach", "미꾸리", "물", 1, 1, 2, "C", {}),
  P("whiscash", "메깅", "물", 4, 5, 7, "R", {
    stage: 1,
    evolvesFrom: "barboach",
  }),
  P("carvanha", "샤프니아", "물", 2, 3, 1, "C", { ability: "roughskin" }),
  P("sharpedo", "샤크니아", "물", 4, 7, 4, "R", {
    stage: 1,
    evolvesFrom: "carvanha",
    ability: "roughskin",
  }),
  P("suicune", "스이쿤", "물", 7, 6, 9, "L", { ability: "icebeamdance" }),

  // ============ 불꽃 (12) ============
  P("charmander", "파이리", "불꽃", 1, 1, 2, "C", { ability: "blaze" }),
  P("charmeleon", "리자드", "불꽃", 3, 5, 3, "R", {
    stage: 1,
    evolvesFrom: "charmander",
    ability: "blaze",
  }),
  P("charizard", "리자몽", "불꽃", 5, 9, 6, "E", {
    stage: 2,
    evolvesFrom: "charmeleon",
    ability: "solarpower",
  }),
  P("flareon", "부스터", "불꽃", 3, 6, 3, "R", {
    stage: 1,
    evolvesFrom: "eevee",
    ability: "guts",
  }),
  P("vulpix", "식스테일", "불꽃", 1, 1, 1, "C", { ability: "flashfire" }),
  P("ninetales", "나인테일", "불꽃", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "vulpix",
    ability: "drought",
  }),
  P("ponyta", "포니타", "불꽃", 2, 2, 2, "C", { ability: "rush" }),
  P("rapidash", "날쌩마", "불꽃", 4, 6, 5, "R", {
    stage: 1,
    evolvesFrom: "ponyta",
    ability: "flamebody",
  }),
  P("magmar", "마그마", "불꽃", 4, 4, 5, "R", { ability: "flamebody" }),
  P("moltres", "파이어", "불꽃", 8, 9, 8, "L", { ability: "skydive" }),
  P("entei", "앤테이", "불꽃", 7, 7, 8, "L", { ability: "burningfall" }),
  P("hooh", "칠색조", "불꽃", 8, 8, 9, "L", { ability: "sacredflame" }),

  // ============ 풀 (15) ============
  P("bulbasaur", "이상해씨", "풀", 1, 1, 2, "C", { ability: "overgrow" }),
  P("ivysaur", "이상해풀", "풀", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "bulbasaur",
    ability: "overgrow",
  }),
  P("venusaur", "이상해꽃", "풀", 5, 6, 9, "E", {
    stage: 2,
    evolvesFrom: "ivysaur",
    ability: "aura_grass",
  }),
  P("chikorita", "치코리타", "풀", 1, 1, 2, "C", { ability: "overgrow" }),
  P("exeggutor", "나시", "풀", 4, 4, 5, "R", { ability: "chlorophyll" }),
  P("bellsprout", "모다피", "풀", 1, 0, 1, "C", { ability: "chlorophyll" }),
  P("weepinbell", "우츠동", "풀", 2, 2, 4, "C", {
    stage: 1,
    evolvesFrom: "bellsprout",
    ability: "chlorophyll",
  }),
  P("victreebel", "우츠보트", "풀", 4, 7, 6, "R", {
    stage: 2,
    evolvesFrom: "weepinbell",
    ability: "chlorophyll",
  }),
  P("tangela", "덩쿠리", "풀", 2, 1, 4, "C", { ability: "taunt" }),
  P("treecko", "나무지기", "풀", 1, 1, 2, "C", { ability: "overgrow" }),
  P("grovyle", "나무돌이", "풀", 3, 5, 3, "R", {
    stage: 1,
    evolvesFrom: "treecko",
    ability: "overgrow",
  }),
  P("sceptile", "나무킹", "풀", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "grovyle",
    ability: "moxie",
  }),
  P("sunkern", "해너츠", "풀", 1, 0, 2, "C", { ability: "chlorophyll" }),
  P("sunflora", "해루미", "풀", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "sunkern",
    ability: "chlorophyll",
  }),
  P("tropius", "트로피우스", "풀", 4, 2, 7, "R", { ability: "taunt" }),
  P("parasect", "파라섹트", "벌레", 3, 2, 5, "C", { ability: "taunt" }),

  // ============ 전기 (12) ============
  P("pikachu", "피카츄", "전기", 1, 1, 1, "C", { ability: "static" }),
  P("raichu", "라이츄", "전기", 3, 6, 3, "R", {
    stage: 1,
    evolvesFrom: "pikachu",
    ability: "static",
  }),
  P("magnemite", "코일", "전기", 1, 0, 2, "C", { ability: "sturdy" }),
  P("magneton", "레어코일", "전기", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "magnemite",
    ability: "sturdy",
  }),
  P("elekid", "에레키드", "전기", 1, 1, 1, "C", { ability: "static" }),
  P("electabuzz", "에레브", "전기", 4, 5, 6, "R", {
    stage: 1,
    evolvesFrom: "elekid",
    ability: "static",
  }),
  P("voltorb", "붐볼", "전기", 2, 2, 3, "C", { ability: "explode" }),
  P("mareep", "메리프", "전기", 1, 0, 1, "C", { ability: "static" }),
  P("flaaffy", "보송송", "전기", 2, 2, 4, "C", {
    stage: 1,
    evolvesFrom: "mareep",
    ability: "static",
  }),
  P("ampharos", "전룡", "전기", 5, 6, 9, "E", {
    stage: 2,
    evolvesFrom: "flaaffy",
    ability: "aura_electric",
  }),
  P("zapdos", "썬더", "전기", 8, 9, 8, "L", { ability: "thunderwave" }),
  P("raikou", "라이코", "전기", 7, 8, 7, "L", { ability: "thunderfang" }),

  // ============ 땅 (9) ============
  P("diglett", "디그다", "땅", 1, 1, 1, "C", { ability: "rush" }),
  P("dugtrio", "닥트리오", "땅", 3, 5, 3, "R", {
    stage: 1,
    evolvesFrom: "diglett",
    ability: "skilllink",
  }),
  P("sandslash", "고지", "땅", 3, 3, 5, "C", {}),
  P("rhyhorn", "뿔카노", "땅", 1, 1, 1, "C", {}),
  P("rhydon", "코뿌리", "땅", 4, 2, 8, "R", {
    stage: 1,
    evolvesFrom: "rhyhorn",
    ability: "taunt",
  }),
  P("rhyperior", "거대코뿌리", "땅", 7, 9, 11, "E", {
    stage: 2,
    evolvesFrom: "rhydon",
  }),
  P("gligar", "글라이거", "땅", 3, 2, 5, "C", { ability: "sandveil" }),
  P("trapinch", "톱치", "땅", 1, 1, 1, "C", {}),
  P("vibrava", "비브라바", "땅", 3, 4, 4, "R", {
    stage: 1,
    evolvesFrom: "trapinch",
    ability: "levitate",
  }),
  P("flygon", "플라이곤", "땅", 5, 7, 8, "E", {
    stage: 2,
    evolvesFrom: "vibrava",
    ability: "levitate",
  }),
  P("groudon", "그란돈", "땅", 8, 8, 9, "L", { ability: "precipiceblades" }),

  // ============ 비행 (9) ============
  P("pidgey", "구구", "비행", 1, 1, 1, "C", {}),
  P("pidgeotto", "피죤", "비행", 2, 3, 4, "C", {
    stage: 1,
    evolvesFrom: "pidgey",
  }),
  P("pidgeot", "피죤투", "비행", 4, 7, 6, "R", {
    stage: 2,
    evolvesFrom: "pidgeotto",
    ability: "keeneye",
  }),
  P("spearow", "깨비참", "비행", 1, 1, 1, "C", { ability: "rush" }),
  P("fearow", "깨비드릴조", "비행", 3, 6, 3, "R", {
    stage: 1,
    evolvesFrom: "spearow",
    ability: "keeneye",
  }),
  P("doduo", "두두", "비행", 2, 3, 2, "C", {}),
  P("dodrio", "두트리오", "비행", 4, 7, 4, "R", {
    stage: 1,
    evolvesFrom: "doduo",
    ability: "moxie",
  }),
  P("farfetchd", "파오리", "비행", 2, 3, 2, "C", {
    ability: "keeneye",
    flavor: "대파는 소중하다.",
  }),
  P("tauros", "켄타로스", "노말", 4, 6, 3, "R", { ability: "rush" }),

  // ============ 노말 (13) ============
  P("rattata", "꼬렛", "노말", 1, 1, 2, "C", {}),
  P("raticate", "레트라", "노말", 2, 5, 3, "C", {
    stage: 1,
    evolvesFrom: "rattata",
  }),
  P("eevee", "이브이", "노말", 1, 1, 2, "C", {
    flavor:
      "샤미드, 쥬피썬더, 부스터, 블래키, 에브이, 님피아, 리피아, 글레이시아로 진화할 수 있다."
  }),
  P("snorlax", "잠만보", "노말", 6, 3, 10, "E", { ability: "taunt" }),
  P("chansey", "럭키", "노말", 3, 1, 6, "R", { ability: "healer" }),
  P("kangaskhan", "캥카", "노말", 4, 4, 6, "R", {}),
  P("slakoth", "게을로", "노말", 1, 0, 1, "C", { ability: "truant" }),
  P("vigoroth", "발바로", "노말", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "slakoth",
  }),
  P("slaking", "게을킹", "노말", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "vigoroth",
    ability: "truant",
  }),
  P("miltank", "밀탱크", "노말", 4, 3, 6, "R", { ability: "thickfat" }),
  P("porygon", "폴리곤", "노말", 2, 2, 3, "C", { ability: "download" }),
  P("dunsparce", "노고치", "노말", 2, 2, 3, "C", { ability: "sturdy" }),

  // ============ 벌레 (9) ============
  P("caterpie", "캐터피", "벌레", 1, 1, 2, "C", {}),
  P("butterfree", "버터플", "벌레", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "caterpie",
    ability: "sleeppowder",
  }),
  P("scyther", "스라크", "벌레", 4, 5, 3, "R", { ability: "rush" }),
  P("weedle", "뿔충이", "벌레", 1, 1, 1, "C", {}),
  P("kakuna", "딱충이", "벌레", 2, 0, 4, "C", {
    stage: 1,
    evolvesFrom: "weedle",
    ability: "sturdy",
  }),
  P("beedrill", "독침붕", "벌레", 4, 8, 5, "R", {
    stage: 2,
    evolvesFrom: "kakuna",
    ability: "guts",
  }),
  P("heracross", "헤라크로스", "벌레", 4, 5, 4, "R", { ability: "moxie" }),
  P("pinsir", "쁘사이저", "벌레", 4, 5, 4, "R", { ability: "moldbreaker" }),
  P("ledyba", "레디바", "벌레", 1, 1, 2, "C", {}),
  P("ledian", "레디안", "벌레", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "ledyba",
    ability: "skilllink",
  }),

  // ============ 얼음 (9) ============
  P("seel", "쥬쥬", "얼음", 2, 2, 3, "C", {}),
  P("dewgong", "쥬레곤", "얼음", 4, 5, 6, "R", {
    stage: 1,
    evolvesFrom: "seel",
    ability: "thickfat",
  }),
  P("articuno", "프리져", "얼음", 8, 7, 10, "L", { ability: "frostedgale" }),
  P("jynx", "루주라", "얼음", 4, 4, 5, "R", { ability: "lovelykiss" }),
  P("shellder", "셀러", "얼음", 1, 1, 1, "C", { ability: "icebody" }),
  P("cloyster", "파르셀", "얼음", 4, 5, 6, "R", {
    stage: 1,
    evolvesFrom: "shellder",
    ability: "freezedry",
  }),
  P("swinub", "꾸꾸리", "얼음", 1, 1, 2, "C", {}),
  P("piloswine", "메꾸리", "얼음", 4, 5, 6, "R", {
    stage: 1,
    evolvesFrom: "swinub",
    ability: "thickfat",
  }),
  P("regice", "레지아이스", "얼음", 7, 5, 10, "L", { ability: "icelock" }),

  // ============ 격투 (13) ============
  P("machop", "알통몬", "격투", 1, 1, 2, "C", { ability: "guts" }),
  P("machoke", "근육몬", "격투", 3, 4, 4, "R", {
    stage: 1,
    evolvesFrom: "machop",
    ability: "guts",
  }),
  P("machamp", "괴력몬", "격투", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "machoke",
    ability: "noguard",
  }),
  P("mankey", "망키", "격투", 1, 1, 1, "C", { ability: "rush" }),
  P("primeape", "성원숭", "격투", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "mankey",
    ability: "guts",
  }),
  P("hitmonlee", "시라소몬", "격투", 4, 6, 3, "R", { ability: "rush" }),
  P("hitmonchan", "홍수몬", "격투", 4, 4, 5, "R", { ability: "skilllink" }),
  P("makuhita", "마크탕", "격투", 1, 1, 2, "C", { ability: "guts" }),
  P("hariyama", "하리뭉", "격투", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "makuhita",
    ability: "guts",
  }),
  P("meditite", "요가랑", "격투", 1, 1, 2, "C", {}),
  P("medicham", "요가램", "격투", 3, 5, 5, "R", {
    stage: 1,
    evolvesFrom: "meditite",
  }),
  P("riolu", "리오르", "격투", 1, 1, 1, "C", { ability: "rush" }),
  P("lucario", "루카리오", "격투", 5, 6, 7, "E", {
    stage: 1,
    evolvesFrom: "riolu",
    ability: "aura_fighting",
  }),

  // ============ 독 (11) ============
  P("grimer", "질퍽이", "독", 2, 2, 3, "C", {}),
  P("muk", "질뻐기", "독", 4, 5, 7, "R", {
    stage: 1,
    evolvesFrom: "grimer",
    ability: "poisonbarb",
  }),
  P("weezing", "또도가스", "독", 3, 3, 4, "R", { ability: "poisonbarb" }),
  P("ekans", "아보", "독", 1, 2, 1, "C", {}),
  P("arbok", "아보크", "독", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "ekans",
    ability: "intimidate",
  }),
  P("nidoranm", "니드런♂", "독", 1, 1, 1, "C", {}),
  P("nidorino", "니드리노", "독", 2, 4, 3, "C", {
    stage: 1,
    evolvesFrom: "nidoranm",
  }),
  P("nidoking", "니드킹", "독", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "nidorino",
    ability: "earthpower",
  }),
  P("nidoranf", "니드런♀", "독", 1, 1, 1, "C", {}),
  P("nidorina", "니드리나", "독", 2, 3, 4, "C", {
    stage: 1,
    evolvesFrom: "nidoranf",
  }),
  P("nidoqueen", "니드퀸", "독", 5, 6, 9, "E", {
    stage: 2,
    evolvesFrom: "nidorina",
    ability: "moxie",
  }),
  P("zubat", "주뱃", "독", 1, 1, 1, "C", {}),
  P("golbat", "골뱃", "독", 2, 4, 3, "C", { stage: 1, evolvesFrom: "zubat" }),
  P("crobat", "크로뱃", "독", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "golbat",
    ability: "poisonpoint",
  }),

  // ============ 에스퍼 (15) ============
  P("abra", "캐이시", "에스퍼", 1, 0, 1, "C", { ability: "teleport" }),
  P("kadabra", "윤겔라", "에스퍼", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "abra",
  }),
  P("alakazam", "후딘", "에스퍼", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "kadabra",
    ability: "foresight",
  }),
  P("celebi", "세레비", "에스퍼", 6, 5, 8, "L", { ability: "leafstorm" }),
  P("mewtwo", "뮤츠", "에스퍼", 9, 10, 9, "L", { ability: "psystrike" }),
  P("drowzee", "슬리프", "에스퍼", 1, 1, 2, "C", {}),
  P("hypno", "슬리퍼", "에스퍼", 4, 5, 6, "R", {
    stage: 1,
    evolvesFrom: "drowzee",
    ability: "hypnosis",
  }),
  P("ralts", "랄토스", "에스퍼", 1, 0, 1, "C", { ability: "teleport" }),
  P("kirlia", "킬리아", "에스퍼", 2, 2, 4, "C", {
    stage: 1,
    evolvesFrom: "ralts",
    ability: "teleport",
  }),
  P("gardevoir", "가디안", "에스퍼", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "kirlia",
    ability: "moonlight",
  }),
  P("natu", "네이티", "에스퍼", 1, 1, 1, "C", { ability: "keeneye" }),
  P("xatu", "네이티오", "에스퍼", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "natu",
    ability: "keeneye",
  }),
  P("espeon", "에브이", "에스퍼", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "eevee",
    ability: "teleport",
  }),
  P("mew", "뮤", "에스퍼", 7, 7, 8, "L", { ability: "metronome" }),
  P("lugia", "루기아", "에스퍼", 9, 8, 11, "L", { ability: "aeroblast" }),

  // ============ 바위 (10) ============
  P("onix", "롱스톤", "바위", 3, 2, 4, "C", { ability: "taunt" }),
  P("aerodactyl", "프테라", "바위", 5, 6, 5, "R", { ability: "rush" }),
  P("larvitar", "애버라스", "바위", 2, 2, 2, "C", {}),
  P("pupitar", "데기라스", "바위", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "larvitar",
    ability: "sturdy",
    flavor: "드디어 합류했다. 오래 기다렸지.",
  }),
  P("tyranitar", "마기라스", "바위", 6, 9, 8, "E", {
    stage: 2,
    evolvesFrom: "pupitar",
    ability: "sandstream",
  }),
  P("geodude", "꼬마돌", "바위", 1, 0, 2, "C", { ability: "sturdy" }),
  P("graveler", "데구리", "바위", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "geodude",
    ability: "sturdy",
  }),
  P("golem", "딱구리", "바위", 5, 7, 8, "E", {
    stage: 2,
    evolvesFrom: "graveler",
    ability: "explode",
  }),
  P("nosepass", "코코파스", "바위", 2, 1, 4, "C", { ability: "sturdy" }),
  P("lunatone", "루나톤", "바위", 3, 3, 4, "R", { ability: "levitate" }),
  P("regirock", "레지락", "바위", 7, 6, 9, "L", { ability: "rockblast" }),

  // ============ 고스트 (5) ============
  P("gastly", "고오스", "고스트", 1, 0, 1, "C", { ability: "levitate" }),
  P("haunter", "고우스트", "고스트", 3, 5, 3, "R", {
    stage: 1,
    evolvesFrom: "gastly",
    ability: "levitate",
  }),
  P("gengar", "팬텀", "고스트", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "haunter",
    ability: "hypnosis",
  }),
  P("misdreavus", "무우마", "고스트", 2, 2, 3, "C", { ability: "levitate" }),
  P("mimikyu", "따라큐", "고스트", 3, 3, 4, "R", { ability: "disguise" }),

  // ============ 드래곤 (11) ============
  P("dratini", "미뇽", "드래곤", 1, 1, 1, "C", {}),
  P("dragonair", "신뇽", "드래곤", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "dratini",
  }),
  P("dragonite", "망나뇽", "드래곤", 6, 9, 8, "E", {
    stage: 2,
    evolvesFrom: "dragonair",
    ability: "multiscale",
  }),
  P("kingdra", "킹드라", "드래곤", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "seadra",
    ability: "swiftswim",
  }),
  P("swablu", "파비코", "드래곤", 1, 1, 2, "C", {}),
  P("altaria", "파비코리", "드래곤", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "swablu",
    ability: "regenerator",
  }),
  P("bagon", "아공이", "드래곤", 1, 1, 1, "C", {}),
  P("shelgon", "쉘곤", "드래곤", 3, 2, 6, "R", {
    stage: 1,
    evolvesFrom: "bagon",
    ability: "sturdy",
  }),
  P("salamence", "보만다", "드래곤", 6, 9, 8, "E", {
    stage: 2,
    evolvesFrom: "shelgon",
    ability: "intimidate",
  }),
  P("latias", "라티아스", "드래곤", 7, 6, 9, "L", { ability: "mistball" }),
  P("rayquaza", "레쿠쟈", "드래곤", 10, 11, 10, "L", {
    ability: "dragonascent",
  }),

  // ============ 악 (9) ============
  P("umbreon", "블래키", "악", 3, 2, 7, "R", {
    stage: 1,
    evolvesFrom: "eevee",
    ability: "taunt",
  }),
  P("houndour", "델빌", "악", 1, 2, 1, "C", {}),
  P("houndoom", "헬가", "악", 4, 6, 5, "R", {
    stage: 1,
    evolvesFrom: "houndour",
    ability: "flashfire",
  }),
  P("sableye", "깜까미", "악", 2, 2, 3, "C", { ability: "keeneye" }),
  P("pawniard", "자망칼", "악", 1, 1, 1, "C", {}),
  P("bisharp", "절각참", "악", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "pawniard",
  }),
  P("kingambit", "대도각참", "악", 6, 8, 9, "E", {
    stage: 2,
    evolvesFrom: "bisharp",
    ability: "supremeoverlord",
  }),
  P("absol", "앱솔", "악", 3, 5, 2, "R", { ability: "deathdraw" }),

  // ============ 강철 (10) ============
  P("skarmory", "무장조", "강철", 4, 3, 6, "R", { ability: "sturdy" }),
  P("steelix", "강철톤", "강철", 6, 3, 12, "E", {
    stage: 1,
    evolvesFrom: "onix",
    ability: "taunt",
  }),
  P("scizor", "핫삼", "강철", 5, 8, 5, "R", {
    stage: 1,
    evolvesFrom: "scyther",
    ability: "roughskin",
  }),
  P("magnezone", "자포코일", "강철", 5, 7, 8, "E", {
    stage: 2,
    evolvesFrom: "magneton",
    ability: "sturdy",
  }),
  P("rookidee", "파라꼬", "비행", 1, 1, 1, "C", {}),
  P("corvisquire", "파크로우", "비행", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "rookidee",
  }),
  P("corviknight", "아머까오", "강철", 4, 0, 7, "E", {
    stage: 2,
    evolvesFrom: "corvisquire",
    ability: "fortress",
  }),
  P("registeel", "레지스틸", "강철", 7, 3, 12, "L", { ability: "irondefense" }),
  P("beldum", "메탕", "강철", 1, 1, 1, "C", {}),
  P("metang", "메탕구", "강철", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "beldum",
  }),
  P("metagross", "메타그로스", "강철", 6, 8, 9, "E", {
    stage: 2,
    evolvesFrom: "metang",
    ability: "foresight",
  }),

  // ============ 페어리 (10) ============
  P("clefairy", "삐삐", "페어리", 2, 2, 3, "C", {}),
  P("clefable", "픽시", "페어리", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "clefairy",
    ability: "moonlight",
  }),
  P("marill", "마릴", "페어리", 1, 1, 1, "C", { ability: "thickfat" }),
  P("azumarill", "마릴리", "페어리", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "marill",
    ability: "thickfat",
  }),
  P("jigglypuff", "푸린", "페어리", 2, 1, 3, "C", { ability: "sing" }),
  P("wigglytuff", "푸크린", "페어리", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "jigglypuff",
    ability: "sing",
  }),
  P("togepi", "토게피", "페어리", 1, 0, 2, "C", { ability: "healer" }),
  P("togetic", "토게틱", "페어리", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "togepi",
    ability: "healer",
  }),
  P("granbull", "그랑블루", "페어리", 4, 5, 4, "R", { ability: "intimidate" }),
  P("sylveon", "님피아", "페어리", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "eevee",
    ability: "moonlight",
  }),

  // ============ v5 신규 포켓몬 (타입 보강) ============
  // 고스트
  P("duskull", "해골몽", "고스트", 1, 1, 1, "C", {}),
  P("dusclops", "미라몽", "고스트", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "duskull",
  }),
  P("dusknoir", "야느와르몽", "고스트", 5, 7, 8, "E", {
    stage: 2,
    evolvesFrom: "dusclops",
    ability: "levitate",
  }),
  P("rotom", "로토무", "전기", 3, 3, 4, "R", { ability: "voltabsorb" }),
  // 비행
  P("hoothoot", "부우부", "비행", 1, 1, 2, "C", {}),
  P("noctowl", "야부엉", "비행", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "hoothoot",
    ability: "keeneye",
  }),
  P("wingull", "갈모매", "비행", 1, 1, 2, "C", {}),
  P("pelipper", "패리퍼", "비행", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "wingull",
    ability: "drizzle",
  }),
  P("taillow", "테일로", "비행", 1, 1, 1, "C", { ability: "rush" }),
  P("swellow", "스왈로", "비행", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "taillow",
    ability: "rush",
  }),
  P("hoppip", "통통코", "비행", 1, 1, 1, "C", {}),
  P("skiploom", "두코", "비행", 2, 2, 5, "C", {
    stage: 1,
    evolvesFrom: "hoppip",
  }),
  P("jumpluff", "솜솜코", "비행", 4, 5, 8, "R", {
    stage: 2,
    evolvesFrom: "skiploom",
    ability: "sleeppowder",
  }),
  P("starly", "찌르꼬", "비행", 1, 1, 1, "C", {}),
  P("staravia", "찌르버드", "비행", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "starly",
  }),
  P("staraptor", "찌르호크", "비행", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "staravia",
    ability: "moxie",
  }),
  // 얼음
  P("snorunt", "눈꼬마", "얼음", 1, 1, 2, "C", { ability: "icebody" }),
  P("glalie", "얼음귀신", "얼음", 3, 4, 6, "R", {
    stage: 1,
    evolvesFrom: "snorunt",
    ability: "freezedry",
  }),
  // 악
  P("poochyena", "포챠나", "악", 1, 1, 2, "C", {}),
  P("mightyena", "그라에나", "악", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "poochyena",
    ability: "intimidate",
  }),
  // 강철
  P("bronzor", "동미러", "강철", 1, 1, 2, "C", {}),
  P("bronzong", "동탁군", "강철", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "bronzor",
    ability: "levitate",
  }),
  // 땅
  P("numel", "둔타", "땅", 1, 1, 2, "C", {}),
  P("camerupt", "폭타", "땅", 3, 4, 6, "R", { stage: 1, evolvesFrom: "numel" }),
  P("phanpy", "코코리", "땅", 1, 2, 1, "C", {}),
  P("donphan", "코리갑", "땅", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "phanpy",
    ability: "rush",
  }),
  P("wooper", "우파", "땅", 1, 1, 2, "C", {}),
  P("quagsire", "누오", "땅", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "wooper",
    ability: "waterabsorb",
  }),
  // 노말
  P("sentret", "꼬리선", "노말", 1, 1, 2, "C", {}),
  P("furret", "다꼬리", "노말", 2, 4, 3, "C", {
    stage: 1,
    evolvesFrom: "sentret",
    ability: "rush",
  }),
  P("teddiursa", "깜지곰", "노말", 1, 2, 1, "C", {}),
  P("ursaring", "링곰", "노말", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "teddiursa",
    ability: "guts",
  }),
  P("bidoof", "비버니", "노말", 1, 1, 2, "C", {}),
  P("bibarel", "비버통", "노말", 2, 5, 3, "C", {
    stage: 1,
    evolvesFrom: "bidoof",
  }),
  // 풀
  P("oddish", "뚜벅쵸", "풀", 1, 1, 1, "C", {}),
  P("gloom", "냄새꼬", "풀", 2, 3, 4, "C", { stage: 1, evolvesFrom: "oddish" }),
  P("vileplume", "라플레시아", "풀", 4, 6, 7, "R", {
    stage: 2,
    evolvesFrom: "gloom",
    ability: "sleeppowder",
  }),
  P("turtwig", "모부기", "풀", 1, 1, 2, "C", { ability: "overgrow" }),
  P("grotle", "수풀부기", "풀", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "turtwig",
    ability: "overgrow",
  }),
  P("torterra", "토대부기", "풀", 5, 7, 8, "E", {
    stage: 2,
    evolvesFrom: "grotle",
    ability: "sturdy",
  }),
  // 불꽃
  P("growlithe", "가디", "불꽃", 1, 1, 2, "C", { ability: "flamebody" }),
  P("arcanine", "윈디", "불꽃", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "growlithe",
    ability: "rush",
  }),
  P("chimchar", "불꽃숭이", "불꽃", 1, 1, 2, "C", { ability: "blaze" }),
  P("monferno", "파이숭이", "불꽃", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "chimchar",
    ability: "blaze",
  }),
  P("infernape", "초염몽", "불꽃", 5, 7, 8, "E", {
    stage: 2,
    evolvesFrom: "monferno",
    ability: "moxie",
  }),
  // 물
  P("piplup", "팽도리", "물", 1, 1, 2, "C", { ability: "torrent" }),
  P("prinplup", "팽태자", "물", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "piplup",
    ability: "torrent",
  }),
  P("empoleon", "엠페르트", "물", 5, 7, 8, "E", {
    stage: 2,
    evolvesFrom: "prinplup",
    ability: "intimidate",
  }),
  // 드래곤
  P("gible", "딥상어동", "드래곤", 1, 1, 1, "C", {}),
  P("gabite", "한바이트", "드래곤", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "gible",
  }),
  P("garchomp", "한카리아스", "드래곤", 5, 8, 7, "E", {
    stage: 2,
    evolvesFrom: "gabite",
    ability: "roughskin",
  }),
  // 전기
  P("shinx", "꼬링크", "전기", 1, 1, 1, "C", {}),
  P("luxio", "럭시오", "전기", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "shinx",
  }),
  P("luxray", "렌트라", "전기", 5, 7, 8, "E", {
    stage: 2,
    evolvesFrom: "luxio",
    ability: "intimidate",
  }),

  // ============================================================
  // v6: 1~3세대 대규모 확장
  // ============================================================

  // ---------- 1세대 ----------

  P("squirtle", "꼬부기", "물", 1, 1, 2, "C", {
    ability: "torrent",
  }),

  P("wartortle", "어니부기", "물", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "squirtle",
    ability: "torrent",
  }),

  P("blastoise", "거북왕", "물", 5, 6, 8, "E", {
    stage: 2,
    evolvesFrom: "wartortle",
    ability: "torrent",
  }),

  P("meowth", "나옹", "노말", 1, 1, 2, "C", {
    ability: "pickup",
  }),

  P("persian", "페르시온", "노말", 3, 4, 4, "R", {
    stage: 1,
    evolvesFrom: "meowth",
    ability: "technician",
  }),

  P("poliwag", "발챙이", "물", 1, 1, 2, "C", {
    ability: "swiftswim",
  }),

  P("poliwhirl", "슈륙챙이", "물", 2, 2, 4, "C", {
    stage: 1,
    evolvesFrom: "poliwag",
    ability: "swiftswim",
  }),

  P("poliwrath", "강챙이", "격투", 4, 6, 5, "R", {
    stage: 2,
    evolvesFrom: "poliwhirl",
    ability: "guts",
  }),

  P("tentacool", "왕눈해", "독", 2, 2, 3, "C", {
    ability: "poisonpoint",
  }),

  P("tentacruel", "독파리", "독", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "tentacool",
    ability: "clearbody",
  }),

  P("slowpoke", "야돈", "에스퍼", 1, 1, 3, "C", {
    ability: "oblivious",
  }),

  P("slowbro", "야도란", "에스퍼", 4, 3, 8, "R", {
    stage: 1,
    evolvesFrom: "slowpoke",
    ability: "regenerator",
  }),

  P("krabby", "크랩", "물", 1, 2, 1, "C", {
    ability: "hypercutter",
  }),

  P("kingler", "킹크랩", "물", 4, 7, 4, "R", {
    stage: 1,
    evolvesFrom: "krabby",
    ability: "hypercutter",
  }),

  P("cubone", "탕구리", "땅", 1, 1, 2, "C", {
    ability: "rockhead",
  }),

  P("marowak", "텅구리", "땅", 4, 6, 5, "R", {
    stage: 1,
    evolvesFrom: "cubone",
    ability: "rockhead",
  }),

  P("jolteon", "쥬피썬더", "전기", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "eevee",
    ability: "voltabsorb",
  }),

  P("omanyte", "암나이트", "바위", 2, 2, 4, "C", {
    ability: "shellarmor",
  }),

  P("omastar", "암스타", "바위", 4, 5, 7, "R", {
    stage: 1,
    evolvesFrom: "omanyte",
    ability: "shellarmor",
  }),


  // ---------- 2세대 ----------

  P("bayleef", "베이리프", "풀", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "chikorita",
    ability: "overgrow",
  }),

  P("meganium", "메가니움", "풀", 5, 5, 9, "E", {
    stage: 2,
    evolvesFrom: "bayleef",
    ability: "aromatherapy",
  }),

  P("cyndaquil", "브케인", "불꽃", 1, 2, 1, "C", {
    ability: "blaze",
  }),

  P("quilava", "마그케인", "불꽃", 3, 4, 4, "R", {
    stage: 1,
    evolvesFrom: "cyndaquil",
    ability: "blaze",
  }),

  P("typhlosion", "블레이범", "불꽃", 5, 7, 6, "E", {
    stage: 2,
    evolvesFrom: "quilava",
    ability: "burningfall",
  }),

  P("totodile", "리아코", "물", 1, 2, 2, "C", {
    ability: "torrent",
  }),

  P("croconaw", "엘리게이", "물", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "totodile",
    ability: "torrent",
  }),

  P("feraligatr", "장크로다일", "물", 5, 7, 7, "E", {
    stage: 2,
    evolvesFrom: "croconaw",
    ability: "sheerforce",
  }),

  P("spinarak", "페이검", "벌레", 1, 1, 2, "C", {
    ability: "poisonpoint",
  }),

  P("ariados", "아리아도스", "벌레", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "spinarak",
    ability: "webtrap",
  }),

  P("chinchou", "초라기", "전기", 1, 1, 3, "C", {
    ability: "voltabsorb",
  }),

  P("lanturn", "랜턴", "전기", 4, 3, 8, "R", {
    stage: 1,
    evolvesFrom: "chinchou",
    ability: "voltabsorb",
    secondaryAbility: "waterabsorb",
  }),

  P("sudowoodo", "꼬지모", "바위", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "bonsly",
    ability: "sturdy",
    secondaryAbility: "taunt",
  }),

  P("aipom", "에이팜", "노말", 1, 2, 1, "C", {
    ability: "pickup",
  }),

  P("wobbuffet", "마자용", "에스퍼", 4, 0, 10, "R", {
    ability: "counter",
  }),

  P("pineco", "피콘", "벌레", 1, 0, 3, "C", {
    ability: "sturdy",
  }),

  P("forretress", "쏘콘", "벌레", 4, 2, 8, "R", {
    stage: 1,
    evolvesFrom: "pineco",
    ability: "sturdy",
    secondaryAbility: "explode",
  }),

  P("porygon2", "폴리곤2", "노말", 4, 4, 7, "R", {
    stage: 1,
    evolvesFrom: "porygon",
    ability: "download",
  }),


  // ---------- 3세대 ----------

  P("torchic", "아차모", "불꽃", 1, 2, 2, "C", {
    ability: "blaze",
  }),

  P("combusken", "영치코", "격투", 3, 4, 4, "R", {
    stage: 1,
    evolvesFrom: "torchic",
    ability: "blaze",
  }),

  P("blaziken", "번치코", "격투", 5, 7, 6, "E", {
    stage: 2,
    evolvesFrom: "combusken",
    ability: "speedboost",
  }),

  P("lotad", "연꽃몬", "물", 1, 1, 2, "C", {
    ability: "raindish",
  }),

  P("lombre", "로토스", "물", 3, 3, 5, "R", {
    stage: 1,
    evolvesFrom: "lotad",
    ability: "raindish",
  }),

  P("ludicolo", "로파파", "물", 5, 5, 7, "E", {
    stage: 2,
    evolvesFrom: "lombre",
    ability: "raindish",
    secondaryAbility: "swiftswim",
  }),

  P("shroomish", "버섯꼬", "풀", 1, 1, 2, "C", {
    ability: "effectspore",
  }),

  P("breloom", "버섯모", "격투", 4, 6, 5, "R", {
    stage: 1,
    evolvesFrom: "shroomish",
    ability: "effectspore",
  }),

  P("nincada", "토중몬", "벌레", 1, 1, 2, "C", {}),

  P("ninjask", "아이스크", "벌레", 3, 4, 4, "R", {
    stage: 1,
    evolvesFrom: "nincada",
    ability: "speedboost",
  }),

  P("shedinja", "껍질몬", "고스트", 3, 3, 1, "R", {
    stage: 1,
    evolvesFrom: "nincada",
    ability: "wonderguard",
  }),

  P("mawile", "입치트", "강철", 4, 4, 6, "R", {
    ability: "intimidate",
  }),

  P("aron", "가보리", "강철", 1, 1, 3, "C", {
    ability: "sturdy",
  }),

  P("lairon", "갱도라", "강철", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "aron",
    ability: "sturdy",
  }),

  P("aggron", "보스로라", "강철", 5, 5, 9, "E", {
    stage: 2,
    evolvesFrom: "lairon",
    ability: "sturdy",
  }),

  P("electrike", "썬더라이", "전기", 1, 2, 1, "C", {
    ability: "static",
  }),

  P("manectric", "썬더볼트", "전기", 4, 6, 5, "R", {
    stage: 1,
    evolvesFrom: "electrike",
    ability: "static",
  }),

  P("wailmer", "고래왕자", "물", 2, 1, 5, "C", {
    ability: "waterveil",
  }),

  P("wailord", "고래왕", "물", 6, 4, 12, "E", {
    stage: 1,
    evolvesFrom: "wailmer",
    ability: "waterveil",
  }),

  P("cacnea", "선인왕", "풀", 1, 2, 1, "C", {
    ability: "sandveil",
  }),

  P("cacturne", "밤선인", "악", 4, 6, 5, "R", {
    stage: 1,
    evolvesFrom: "cacnea",
    ability: "sandveil",
  }),

  P("feebas", "빈티나", "물", 1, 0, 2, "C", {}),

  P("milotic", "밀로틱", "물", 5, 4, 9, "E", {
    stage: 1,
    evolvesFrom: "feebas",
    ability: "marvelscale",
  }),

  P("castform", "캐스퐁", "노말", 4, 4, 5, "R", {
    ability: "forecast",
  }),

  P("kecleon", "켈리몬", "노말", 3, 3, 5, "R", {
    ability: "colorchange",
  }),

  P("shuppet", "어둠대신", "고스트", 1, 2, 1, "C", {
    ability: "cursedbody",
  }),

  P("banette", "다크펫", "고스트", 4, 6, 5, "R", {
    stage: 1,
    evolvesFrom: "shuppet",
    ability: "cursedbody",
  }),

  P("latios", "라티오스", "드래곤", 7, 8, 7, "L", {
    ability: "lusterpurge",
  }),

  P("jirachi", "지라치", "강철", 7, 6, 8, "L", {
    ability: "wishmaker",
  }),

  P("deoxys", "테오키스", "에스퍼", 8, 8, 8, "L", {
    ability: "formchange",
    flavor: "소환할 때 4가지 폼 중 하나를 선택한다.",
  }),

  // ============ 기술 카드 (22) ============
  {
    id: "hydropump",
    name: "하이드로펌프",
    kind: "spell",
    type: "기술",
    moveType: "물",
    cost: 3,
    rarity: "R",
    emoji: "🌊",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (물 타입, 상성 적용 / 비: +1, 쾌청: -1)",
  },
  {
    id: "flamethrower",
    name: "화염방사",
    kind: "spell",
    type: "기술",
    moveType: "불꽃",
    cost: 3,
    rarity: "R",
    emoji: "🔥",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (불꽃 타입, 상성 적용 / 쾌청: +1, 비: -1)",
  },
  {
    id: "solarbeam",
    name: "솔라빔",
    kind: "spell",
    type: "기술",
    moveType: "풀",
    cost: 4,
    rarity: "R",
    emoji: "☀️",
    spell: { effect: "damage", amount: 5, target: "enemy-any" },
    text: "피해 5를 입힌다. (풀 타입, 상성 적용 / 쾌청이면 비용 -2)",
  },
  {
    id: "thunderbolt",
    name: "10만볼트",
    kind: "spell",
    type: "기술",
    moveType: "전기",
    cost: 3,
    rarity: "R",
    emoji: "⚡",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (전기 타입, 상성 적용 / 땅 타입에겐 무효)",
  },
  {
    id: "psychic",
    name: "사이코키네시스",
    kind: "spell",
    type: "기술",
    moveType: "에스퍼",
    cost: 3,
    rarity: "R",
    emoji: "🔮",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (에스퍼 타입, 상성 적용 / 악 타입에겐 무효)",
  },
  {
    id: "icebeam",
    name: "냉동빔",
    kind: "spell",
    type: "기술",
    moveType: "얼음",
    cost: 3,
    rarity: "R",
    emoji: "❄️",
    spell: { effect: "damage_freeze", amount: 3, target: "enemy-any" },
    text: "피해 3을 입히고, 포켓몬이라면 얼음 상태이상. (얼음 타입, 상성 적용)",
  },
  {
    id: "stoneedge",
    name: "스톤에지",
    kind: "spell",
    type: "기술",
    moveType: "바위",
    cost: 3,
    rarity: "R",
    emoji: "🪨",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (바위 타입, 상성 적용)",
  },
  {
    id: "moonblast",
    name: "문포스",
    kind: "spell",
    type: "기술",
    moveType: "페어리",
    cost: 3,
    rarity: "R",
    emoji: "🌙",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (페어리 타입, 상성 적용 / 드래곤에게 효과 굉장!)",
  },
  {
    id: "infight",
    name: "인파이트",
    kind: "spell",
    type: "기술",
    moveType: "격투",
    cost: 3,
    rarity: "R",
    emoji: "👊",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (격투 타입, 상성 적용 / 고스트에겐 무효)",
  },
  {
    id: "shadowball",
    name: "섀도볼",
    kind: "spell",
    type: "기술",
    moveType: "고스트",
    cost: 3,
    rarity: "R",
    emoji: "🟣",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (고스트 타입, 상성 적용 / 노말에겐 무효)",
  },
  {
    id: "darkpulse",
    name: "악의파동",
    kind: "spell",
    type: "기술",
    moveType: "악",
    cost: 3,
    rarity: "R",
    emoji: "🌑",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (악 타입, 상성 적용 / 에스퍼·고스트에게 효과 굉장!)",
  },
  {
    id: "ironhead",
    name: "아이언헤드",
    kind: "spell",
    type: "기술",
    moveType: "강철",
    cost: 3,
    rarity: "R",
    emoji: "🔩",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (강철 타입, 상성 적용 / 페어리에게 효과 굉장!)",
  },
  {
    id: "dragonclaw",
    name: "드래곤크루",
    kind: "spell",
    type: "기술",
    moveType: "드래곤",
    cost: 3,
    rarity: "R",
    emoji: "🐉",
    spell: { effect: "damage", amount: 4, target: "enemy-any" },
    text: "피해 4를 입힌다. (드래곤 타입, 상성 적용 / 페어리에겐 무효)",
  },
  {
    id: "earthquake",
    name: "지진",
    kind: "spell",
    type: "기술",
    moveType: "땅",
    cost: 5,
    rarity: "E",
    emoji: "🌋",
    spell: { effect: "aoe", amount: 4, target: "enemy-board" },
    text: "적 포켓몬 전체에게 피해 4. (땅 타입, 비행/부유에게 무효)",
  },
  {
    id: "surf",
    name: "파도타기",
    kind: "spell",
    type: "기술",
    moveType: "물",
    cost: 4,
    rarity: "R",
    emoji: "🏄",
    spell: { effect: "aoe", amount: 3, target: "enemy-board" },
    text: "적 포켓몬 전체에게 피해 3. (물 타입, 상성 적용)",
  },
  {
    id: "quickattack",
    name: "전광석화",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 1,
    rarity: "C",
    emoji: "💨",
    spell: { effect: "damage_draw", amount: 1, target: "enemy-any" },
    text: "피해 1을 입히고 카드 1장을 드로우한다.",
  },
  {
    id: "raindance",
    name: "비바라기",
    kind: "spell",
    type: "기술",
    cost: 2,
    rarity: "C",
    emoji: "🌧️",
    spell: { effect: "weather", weather: "rain" },
    text: "날씨를 비로 바꾼다. (물 포켓몬 공격력 +1, 쓱쓱 발동)",
  },
  {
    id: "sunnyday",
    name: "쾌청",
    kind: "spell",
    type: "기술",
    cost: 2,
    rarity: "C",
    emoji: "☀️",
    spell: { effect: "weather", weather: "sun" },
    text: "날씨를 쾌청으로 바꾼다. (불꽃 포켓몬 공격력 +1, 엽록소·선파워 발동)",
  },
  {
    id: "sandstorm",
    name: "모래바람",
    kind: "spell",
    type: "기술",
    cost: 2,
    rarity: "C",
    emoji: "🏜️",
    spell: { effect: "weather", weather: "sand" },
    text: "날씨를 모래바람으로 바꾼다. (매 턴 종료 시 바위/땅/강철이 아닌 포켓몬 전체에게 피해 1)",
  },
  {
    id: "potion",
    name: "상처약",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "C",
    emoji: "🧪",
    spell: { effect: "heal", amount: 3, target: "friendly-pokemon" },
    text: "아군 포켓몬 하나의 체력을 3 회복한다.",
  },
  {
    id: "fullrestore",
    name: "풀회복약",
    kind: "spell",
    type: "도구",
    cost: 3,
    rarity: "R",
    emoji: "💊",
    spell: { effect: "fullheal", target: "friendly-pokemon" },
    text: "아군 포켓몬 하나의 체력을 모두 회복하고 상태이상을 해제한다.",
  },
  {
    id: "pokeball",
    name: "몬스터볼",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "C",
    emoji: "⚪",
    spell: { effect: "tutor_pokemon" },
    text: "내 덱에서 무작위 포켓몬 1장을 손으로 가져온다.",
  },

    // ============================================================
  // v6 신규 기술 카드
  // ============================================================

  {
    id: "sheercold",
    name: "절대영도",
    kind: "spell",
    type: "기술",
    moveType: "얼음",
    cost: 5,
    rarity: "L",
    emoji: "🥶",
    spell: {
      effect: "execute",
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 1마리를 즉시 기절시킨다. 상대 트레이너는 지정할 수 없다.",
  },

  {
    id: "fissure",
    name: "땅가르기",
    kind: "spell",
    type: "기술",
    moveType: "땅",
    cost: 5,
    rarity: "L",
    emoji: "🌋",
    spell: {
      effect: "execute",
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 1마리를 즉시 기절시킨다. 상대 트레이너는 지정할 수 없다.",
  },

  {
    id: "horndrill",
    name: "뿔드릴",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 5,
    rarity: "L",
    emoji: "🦏",
    spell: {
      effect: "execute",
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 1마리를 즉시 기절시킨다. 상대 트레이너는 지정할 수 없다.",
  },

  {
    id: "guillotine",
    name: "가위자르기",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 5,
    rarity: "L",
    emoji: "✂️",
    spell: {
      effect: "execute",
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 1마리를 즉시 기절시킨다. 상대 트레이너는 지정할 수 없다.",
  },

  {
    id: "hyperbeam",
    name: "파괴광선",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 7,
    rarity: "E",
    emoji: "💥",
    spell: {
      effect: "damage",
      amount: 9,
      target: "enemy-any",
    },
    text: "상대 하나에게 노말 피해 9. 타입 상성을 적용한다.",
  },

  {
    id: "fireblast",
    name: "불대문자",
    kind: "spell",
    type: "기술",
    moveType: "불꽃",
    cost: 6,
    rarity: "E",
    emoji: "🔥",
    spell: {
      effect: "damage_status",
      amount: 7,
      status: "burn",
      chance: 1,
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 하나에게 불꽃 피해 7을 주고 화상 상태로 만든다.",
  },

  {
    id: "blizzardmove",
    name: "눈보라",
    kind: "spell",
    type: "기술",
    moveType: "얼음",
    cost: 8,
    rarity: "E",
    emoji: "🌨️",
    spell: {
      effect: "aoe_status",
      amount: 3,
      status: "ice",
      chance: 0.4,
      target: "enemy-field",
    },
    text: "상대 포켓몬 전체에게 얼음 피해 3. 각각 40% 확률로 얼음 상태이상.",
  },

  {
    id: "heatwave",
    name: "열풍",
    kind: "spell",
    type: "기술",
    moveType: "불꽃",
    cost: 7,
    rarity: "E",
    emoji: "♨️",
    spell: {
      effect: "aoe_status",
      amount: 3,
      status: "burn",
      chance: 0.4,
      target: "enemy-field",
    },
    text: "상대 포켓몬 전체에게 불꽃 피해 3. 각각 40% 확률로 화상 상태이상.",
  },

  {
    id: "sludgewave",
    name: "오물웨이브",
    kind: "spell",
    type: "기술",
    moveType: "독",
    cost: 7,
    rarity: "E",
    emoji: "☣️",
    spell: {
      effect: "aoe_status",
      amount: 2,
      status: "poison",
      chance: 1,
      target: "enemy-field",
    },
    text: "상대 포켓몬 전체에게 독 피해 2를 주고 전부 독 상태로 만든다.",
  },

  {
    id: "discharge",
    name: "방전",
    kind: "spell",
    type: "기술",
    moveType: "전기",
    cost: 6,
    rarity: "E",
    emoji: "⚡",
    spell: {
      effect: "aoe_status",
      amount: 2,
      status: "para",
      chance: 0.5,
      target: "enemy-field",
    },
    text: "상대 포켓몬 전체에게 전기 피해 2. 각각 50% 확률로 마비 상태이상.",
  },

  {
    id: "dracometeor",
    name: "용성군",
    kind: "spell",
    type: "기술",
    moveType: "드래곤",
    cost: 8,
    rarity: "E",
    emoji: "☄️",
    spell: {
      effect: "aoe_self_debuff",
      amount: 4,
      selfAtkDelta: -1,
      target: "enemy-field",
    },
    text: "상대 포켓몬 전체에게 드래곤 피해 4. 사용 후 내 포켓몬 전체 공격력 -1.",
  },

  {
    id: "explosionmove",
    name: "대폭발",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 10,
    rarity: "L",
    emoji: "💣",
    spell: {
      effect: "all_field_damage",
      amount: 8,
      target: "board",
    },
    text: "양쪽 필드의 모든 포켓몬에게 피해 8.",
  },

  {
    id: "perishsong",
    name: "멸망의노래",
    kind: "spell",
    type: "기술",
    moveType: "고스트",
    cost: 7,
    rarity: "L",
    emoji: "🎵",
    spell: {
      effect: "perish_song",
      countdown: 2,
      target: "board",
    },
    text: "양쪽 필드의 모든 포켓몬에게 멸망 카운트 2. 두 번째 턴 종료 시 기절한다.",
  },

  {
    id: "spore",
    name: "버섯포자",
    kind: "spell",
    type: "기술",
    moveType: "풀",
    cost: 4,
    rarity: "R",
    emoji: "🍄",
    spell: {
      effect: "apply_status",
      status: "sleep",
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 하나를 잠듦 상태로 만든다.",
  },

  {
    id: "willowisp",
    name: "도깨비불",
    kind: "spell",
    type: "기술",
    moveType: "불꽃",
    cost: 3,
    rarity: "R",
    emoji: "👻",
    spell: {
      effect: "apply_status",
      status: "burn",
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 하나를 화상 상태로 만든다.",
  },

  {
    id: "thunderwave_move",
    name: "전기자석파",
    kind: "spell",
    type: "기술",
    moveType: "전기",
    cost: 3,
    rarity: "R",
    emoji: "📡",
    spell: {
      effect: "apply_status",
      status: "para",
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 하나를 마비 상태로 만든다.",
  },

  {
    id: "toxic",
    name: "맹독",
    kind: "spell",
    type: "기술",
    moveType: "독",
    cost: 4,
    rarity: "R",
    emoji: "☠️",
    spell: {
      effect: "apply_status",
      status: "poison",
      immediateDamage: 1,
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 하나를 독 상태로 만들고 즉시 피해 1.",
  },

  {
    id: "recover",
    name: "회복",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 4,
    rarity: "R",
    emoji: "✨",
    spell: {
      effect: "heal",
      amount: 6,
      target: "friendly-pokemon",
    },
    text: "아군 포켓몬 하나의 체력을 6 회복한다.",
  },

  {
    id: "roar",
    name: "울부짖기",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 5,
    rarity: "E",
    emoji: "📣",
    spell: {
      effect: "bounce_enemy",
      target: "enemy-pokemon",
    },
    text: "상대 포켓몬 하나를 상대 손으로 되돌린다.",
  },

  {
    id: "safeguard",
    name: "신비의부적",
    kind: "spell",
    type: "기술",
    moveType: "노말",
    cost: 4,
    rarity: "R",
    emoji: "🛡️",
    spell: {
      effect: "team_status_guard",
      turns: 2,
      target: "friendly-field",
    },
    text: "내 포켓몬 전체가 2턴 동안 새 상태이상에 걸리지 않는다.",
  },

  {
    id: "haze",
    name: "흑안개",
    kind: "spell",
    type: "기술",
    moveType: "얼음",
    cost: 4,
    rarity: "R",
    emoji: "🌫️",
    spell: {
      effect: "reset_attack",
      target: "board",
    },
    text: "필드의 모든 포켓몬 공격력을 카드의 기본 공격력으로 되돌린다.",
  },

  // ============ 도구 (4) ============
  {
    id: "everstone",
    name: "진화의 휘석",
    kind: "item",
    type: "도구",
    cost: 1,
    rarity: "R",
    emoji: "💎",
    item: { effect: "everstone", hpBonus: 2 },
    text: "장착: 체력 +2. 이 포켓몬은 더 이상 진화할 수 없다.",
  },
  {
    id: "lifeorb",
    name: "생명의 구슬",
    kind: "item",
    type: "도구",
    cost: 1,
    rarity: "R",
    emoji: "🔴",
    item: { effect: "lifeorb", atkBonus: 2 },
    text: "장착: 공격력 +2. 내 턴이 끝날 때마다 체력이 1 줄어든다.",
  },
  {
    id: "focussash",
    name: "기합의 띠",
    kind: "item",
    type: "도구",
    cost: 2,
    rarity: "R",
    emoji: "🎗️",
    item: { effect: "focussash" },
    text: "장착: 옹골참(치명적인 피해를 1회 버팀)을 얻는다.",
  },
  {
    id: "shellbell",
    name: "조개껍질방울",
    kind: "item",
    type: "도구",
    cost: 2,
    rarity: "R",
    emoji: "🐚",
    item: { effect: "shellbell" },
    text: "장착: 공격으로 피해를 입힐 때마다 체력을 1 회복한다.",
  },

  // ============ 4세대 추가 (v1.5) ============
  // 풀
  P("budew", "꼬몽울", "풀", 1, 1, 1, "C", { ability: "sleeppowder" }),
  P("roserade", "로즈레이드", "풀", 4, 5, 7, "R", {
    stage: 1,
    evolvesFrom: "budew",
    ability: "poisonpoint",
  }),
  P("cherubi", "체리버", "풀", 1, 1, 1, "C", {}),
  P("cherrim", "체리꼬", "풀", 3, 4, 5, "R", {
    stage: 1,
    evolvesFrom: "cherubi",
    ability: "drought",
  }),
  P("carnivine", "무스틈니", "풀", 4, 5, 5, "R", { ability: "sleeppowder" }),
  P("leafeon", "리피아", "풀", 4, 6, 5, "R", {
    stage: 1,
    evolvesFrom: "eevee",
    ability: "rush",
  }),
  // 물
  P("buizel", "브이젤", "물", 1, 2, 1, "C", { ability: "rush" }),
  P("floatzel", "플로젤", "물", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "buizel",
    ability: "rush",
  }),
  P("gastrodon", "트리토돈", "물", 4, 4, 6, "R", { ability: "waterabsorb" }),
  // 전기
  P("pachirisu", "파치리스", "전기", 2, 2, 4, "C", { ability: "static" }),
  // 얼음
  P("snover", "눈쓰개", "얼음", 2, 2, 3, "C", {}),
  P("abomasnow", "눈설왕", "얼음", 4, 5, 6, "R", {
    stage: 1,
    evolvesFrom: "snover",
    ability: "blizzard",
  }),
  P("glaceon", "글레이시아", "얼음", 4, 5, 6, "R", {
    stage: 1,
    evolvesFrom: "eevee",
    ability: "freezedry",
  }),
  // 바위
  P("cranidos", "두개도스", "바위", 2, 4, 2, "C", {}),
  P("rampardos", "램펄드", "바위", 4, 7, 4, "R", {
    stage: 1,
    evolvesFrom: "cranidos",
    ability: "moldbreaker",
  }),
  P("bonsly", "꼬지지", "바위", 1, 1, 2, "C", {}),
  // 강철
  P("shieldon", "방패톱스", "강철", 1, 0, 3, "C", { ability: "sturdy" }),
  P("bastiodon", "바리톱스", "강철", 3, 0, 8, "R", {
    stage: 1,
    evolvesFrom: "shieldon",
    ability: "fortress",
  }),
  // 벌레
  P("burmy", "도롱충이", "벌레", 1, 1, 2, "C", {}),
  P("wormadam", "도롱마담", "벌레", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "burmy",
    ability: "levitate",
  }),
  P("mothim", "나메일", "벌레", 3, 5, 3, "R", {
    stage: 1,
    evolvesFrom: "burmy",
    ability: "rush",
  }),
  P("combee", "세꿀버리", "벌레", 1, 1, 2, "C", {}),
  P("vespiquen", "비퀸", "벌레", 4, 3, 8, "R", {
    stage: 1,
    evolvesFrom: "combee",
    ability: "healer",
  }),
  // 독
  P("stunky", "스컹뿡", "독", 1, 2, 2, "C", { ability: "poisonpoint" }),
  P("skuntank", "스컹탱크", "독", 3, 5, 5, "R", {
    stage: 1,
    evolvesFrom: "stunky",
    ability: "poisonpoint",
  }),
  P("skorupi", "스콜피", "독", 1, 2, 2, "C", { ability: "poisonbarb" }),
  P("drapion", "드래피온", "독", 4, 5, 7, "R", {
    stage: 1,
    evolvesFrom: "skorupi",
    ability: "poisonbarb",
  }),
  P("croagunk", "삐딱구리", "독", 1, 2, 1, "C", { ability: "poisonpoint" }),
  P("toxicroak", "독개굴", "독", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "croagunk",
    ability: "poisonpoint",
  }),
  // 고스트
  P("drifloon", "흔들풍손", "고스트", 1, 1, 2, "C", { ability: "levitate" }),
  P("drifblim", "둥실라이드", "고스트", 3, 3, 6, "R", {
    stage: 1,
    evolvesFrom: "drifloon",
    ability: "levitate",
  }),
  // 노말
  P("buneary", "이어롤", "노말", 1, 2, 2, "C", {}),
  P("lopunny", "이어롭", "노말", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "buneary",
    ability: "rush",
  }),
  P("glameow", "냐옹마", "노말", 1, 2, 2, "C", {}),
  P("purugly", "몬냥이", "노말", 3, 5, 4, "R", {
    stage: 1,
    evolvesFrom: "glameow",
    ability: "intimidate",
  }),
  P("ambipom", "겟핸보숭", "노말", 3, 3, 4, "R", {
    stage: 1,
    evolvesFrom: "aipom",
    ability: "skilllink",
  }),
  // 에스퍼
  P("mimejr", "흉내내", "에스퍼", 1, 1, 2, "C", {}),
  // 격투
  P("hippopotas", "히포포타스", "땅", 1, 1, 2, "C", {}),
  P("hippowdon", "하마돈", "땅", 4, 5, 7, "R", {
    stage: 1,
    evolvesFrom: "hippopotas",
    ability: "taunt",
  }),
  // 페어리
  P("togekiss", "토게키스", "페어리", 5, 5, 7, "E", {
    stage: 2,
    evolvesFrom: "togetic",
    ability: "bigchance",
  }),
  // 악
  P("sneasel", "포푸니", "악", 2, 3, 2, "C", { ability: "rush" }),
  P("weavile", "포푸니라", "악", 4, 7, 4, "R", {
    stage: 1,
    evolvesFrom: "sneasel",
  }),

  // ============ 도구 추가 (v1.5) ============
  {
    id: "superball",
    name: "슈퍼볼",
    kind: "spell",
    type: "도구",
    cost: 2,
    rarity: "R",
    emoji: "🔵",
    spell: { effect: "tutor_pokemon_2" },
    text: "덱에서 무작위 포켓몬 2장을 손으로 가져온다.",
  },
  {
    id: "hyperball",
    name: "하이퍼볼",
    kind: "spell",
    type: "도구",
    cost: 3,
    rarity: "R",
    emoji: "🟡",
    spell: { effect: "tutor_choose_3" },
    text: "덱에서 포켓몬 3장을 보여준다. 1장을 선택해 손으로 가져오고 나머지 2장은 덱으로 돌려보낸다.",
  },
  {
    id: "paralyzeheal",
    name: "마비치료제",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "C",
    emoji: "⚡",
    spell: {
      effect: "cure_status",
      statusType: "para",
      target: "friendly-pokemon",
    },
    text: "아군 포켓몬의 마비 상태이상을 낫게 한다.",
  },
  {
    id: "burnheal",
    name: "화상치료제",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "C",
    emoji: "🔥",
    spell: {
      effect: "cure_status",
      statusType: "burn",
      target: "friendly-pokemon",
    },
    text: "아군 포켓몬의 화상 상태이상을 낫게 한다.",
  },
  {
    id: "antidote",
    name: "해독제",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "C",
    emoji: "🟢",
    spell: {
      effect: "cure_status",
      statusType: "poison",
      target: "friendly-pokemon",
    },
    text: "아군 포켓몬의 독 상태이상을 낫게 한다.",
  },
  {
    id: "awakening",
    name: "잠깨는약",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "C",
    emoji: "🌙",
    spell: {
      effect: "cure_status",
      statusType: "sleep",
      target: "friendly-pokemon",
    },
    text: "아군 포켓몬의 잠듦 상태이상을 낫게 한다.",
  },
  {
    id: "iceheal",
    name: "얼음상태치료제",
    kind: "spell",
    type: "도구",
    cost: 1,
    rarity: "C",
    emoji: "❄️",
    spell: {
      effect: "cure_status",
      statusType: "ice",
      target: "friendly-pokemon",
    },
    text: "아군 포켓몬의 얼음 상태이상을 낫게 한다.",
  },
  {
    id: "fullheal",
    name: "만병통치약",
    kind: "spell",
    type: "도구",
    cost: 2,
    rarity: "R",
    emoji: "💊",
    spell: { effect: "cure_all_status", target: "friendly-pokemon" },
    text: "아군 포켓몬의 모든 상태이상을 낫게 한다.",
  },

  // ============ 메가스톤 (20) ============
  {
    id: "swampertite",
    name: "대짱이나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "swampert",
    mega: { atk: 2, hp: 2, ability: "swiftswim" },
    text: "대짱이 전용. +2/+2, 특성이 쓱쓱이 된다. 비가 내리고 있다면 즉시 돌진을 얻는다. (게임당 메가진화 1회)",
  },
  {
    id: "charizarditey",
    name: "리자몽나이트Y",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "charizard",
    mega: { atk: 3, hp: 1, ability: "drought", battlecryWeather: "sun" },
    text: "리자몽 전용. +3/+1, 가뭄 발동 - 날씨가 쾌청이 된다. (게임당 메가진화 1회)",
  },
  {
    id: "gyaradosite",
    name: "갸라도스나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "gyarados",
    mega: { atk: 2, hp: 2, ability: "intimidate", reIntimidate: true },
    text: "갸라도스 전용. +2/+2, 위협이 다시 발동한다 - 무작위 적의 공격력 -2. (게임당 메가진화 1회)",
  },
  {
    id: "gengarite",
    name: "팬텀나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "gengar",
    mega: { atk: 2, hp: 2, ability: "hypnosis", reBattlecry: true },
    text: "팬텀 전용. +2/+2, 최면술이 다시 발동한다 - 무작위 상대에게 잠듦 상태이상. (게임당 메가진화 1회)",
  },
  {
    id: "salamencite",
    name: "보만다나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "salamence",
    mega: { atk: 3, hp: 2, ability: "intimidate", reBattlecry: true },
    text: "보만다 전용. +3/+2, 위협이 다시 발동한다 - 무작위 적의 공격력 -2. (게임당 메가진화 1회)",
  },
    // ---------- v6 추가 메가스톤 ----------

  {
    id: "blastoisinite",
    name: "거북왕나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "blastoise",
    megaSpriteId: 10036,
    mega: {
      atk: 2,
      hp: 3,
      ability: "megalauncher",
    },
    text: "거북왕 전용. +2/+3, 메가런처를 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "venusaurite",
    name: "이상해꽃나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "venusaur",
    megaSpriteId: 10033,
    mega: {
      atk: 2,
      hp: 4,
      ability: "thickfat",
    },
    text: "이상해꽃 전용. +2/+4, 두꺼운지방을 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "charizarditex",
    name: "리자몽나이트X",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "charizard",
    megaSpriteId: 10034,
    mega: {
      atk: 3,
      hp: 2,
      ability: "toughclaws",
      type: "드래곤",
    },
    text: "리자몽 전용. +3/+2, 드래곤 타입으로 변하고 단단한발톱을 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "beedrillite",
    name: "독침붕나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "beedrill",
    megaSpriteId: 10090,
    mega: {
      atk: 4,
      hp: 1,
      ability: "adaptability",
    },
    text: "독침붕 전용. +4/+1, 적응력을 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "alakazite",
    name: "후딘나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "alakazam",
    megaSpriteId: 10037,
    mega: {
      atk: 4,
      hp: 1,
      ability: "trace",
    },
    text: "후딘 전용. +4/+1, 메가진화 시 상대 특성 하나를 복사한다. (게임당 메가진화 1회)",
  },

  {
    id: "kangaskhanite",
    name: "캥카나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "kangaskhan",
    megaSpriteId: 10039,
    mega: {
      atk: 2,
      hp: 3,
      ability: "parentalbond",
    },
    text: "캥카 전용. +2/+3, 부자유친을 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "ampharosite",
    name: "전룡나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "ampharos",
    megaSpriteId: 10045,
    mega: {
      atk: 3,
      hp: 3,
      ability: "voltabsorb",
      type: "드래곤",
    },
    text: "전룡 전용. +3/+3, 드래곤 타입으로 변하고 축전을 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "tyranitarite",
    name: "마기라스나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "tyranitar",
    megaSpriteId: 10049,
    mega: {
      atk: 3,
      hp: 4,
      ability: "sandstream",
      secondaryAbility: "sandforce",
      battlecryWeather: "sand",
    },
    text: "마기라스 전용. +3/+4, 모래바람을 다시 일으키고 모래바람 동안 공격력 +2. (게임당 메가진화 1회)",
  },

  {
    id: "blazikenite",
    name: "번치코나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "blaziken",
    megaSpriteId: 10050,
    mega: {
      atk: 3,
      hp: 2,
      ability: "speedboost",
    },
    text: "번치코 전용. +3/+2, 가속을 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "gardevoirite",
    name: "가디안나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "gardevoir",
    megaSpriteId: 10051,
    mega: {
      atk: 3,
      hp: 2,
      ability: "pixilate",
      type: "페어리",
    },
    text: "가디안 전용. +3/+2, 페어리 타입으로 변하고 페어리스킨을 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "mawilite",
    name: "입치트나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "mawile",
    megaSpriteId: 10052,
    mega: {
      atk: 2,
      hp: 3,
      ability: "hugepower",
    },
    text: "입치트 전용. +2/+3, 천하장사를 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "aggronite",
    name: "보스로라나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "aggron",
    megaSpriteId: 10053,
    mega: {
      atk: 2,
      hp: 5,
      ability: "filter",
      secondaryAbility: "taunt",
    },
    text: "보스로라 전용. +2/+5, 필터와 도발을 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "manectite",
    name: "썬더볼트나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "manectric",
    megaSpriteId: 10055,
    mega: {
      atk: 3,
      hp: 2,
      ability: "intimidate",
      secondaryAbility: "voltabsorb",
      reIntimidate: true,
    },
    text: "썬더볼트 전용. +3/+2, 위협이 다시 발동하고 축전을 함께 얻는다. (게임당 메가진화 1회)",
  },

  {
    id: "banettite",
    name: "다크펫나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "banette",
    megaSpriteId: 10056,
    mega: {
      atk: 4,
      hp: 1,
      ability: "cursedbody",
      curseStrongest: true,
    },
    text: "다크펫 전용. +4/+1, 저주받은바디를 얻고 가장 강한 상대 포켓몬을 저주한다. (게임당 메가진화 1회)",
  },

  {
    id: "absolite",
    name: "앱솔나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",
    megaFor: "absol",
    megaSpriteId: 10057,
    mega: {
      atk: 4,
      hp: 1,
      ability: "magicbounce",
    },
    text: "앱솔 전용. +4/+1, 매직미러를 얻는다. (게임당 메가진화 1회)",
  },
];

// ============================================================
// 관동 트레이너 전용 시그니처 카드
// CARDS에는 넣지 않는다.
// → 팩 / 컬렉션 / 관리자 지급 대상에서 제외
// ============================================================
export const TRAINER_CARDS = [
  P("surge_raichu", "마티스의 라이츄", "전기", 3, 4, 4, "L", {
    ability: "surge_overdrive",
    signature: true,
    trainerOnly: true,
  }),

  P("sabrina_gallade", "초련의 엘레이드", "에스퍼", 4, 5, 6, "L", {
    ability: "sabrina_futureblade",
    signature: true,
    trainerOnly: true,
  }),

  P("erika_bellossom", "민화의 아르코", "풀", 4, 4, 7, "L", {
    ability: "erika_flowerdance",
    signature: true,
    trainerOnly: true,
  }),

  P("janine_venomoth", "도희의 도나리", "독", 4, 5, 6, "L", {
    ability: "janine_toxicdust",
    signature: true,
    trainerOnly: true,
  }),

  P("misty_starmie", "이슬의 아쿠스타", "물", 4, 5, 7, "L", {
    ability: "misty_miraclestar",
    signature: true,
    trainerOnly: true,
  }),

  P("brock_onix", "웅이의 롱스톤", "바위", 5, 5, 10, "L", {
    ability: "brock_rockwall",
    signature: true,
    trainerOnly: true,
  }),

  P("blaine_camerupt", "강연의 폭타", "불꽃", 5, 7, 7, "L", {
    ability: "blaine_eruption",
    signature: true,
    trainerOnly: true,
  }),

  P("blue_pidgeot", "그린의 피죤투", "비행", 5, 6, 7, "L", {
    ability: "blue_hurricane",
    signature: true,
    trainerOnly: true,
  }),

  P("red_pikachu", "레드의 피카츄", "전기", 3, 4, 4, "L", {
    ability: "red_volttackle",
    signature: true,
    trainerOnly: true,
  }),

  // ============================================================
  // 성도지방 시그니처
  // ============================================================

  P(
    "johto_falkner_pidgeotto",
    "비상의 피죤",
    "비행",
    3,
    4,
    5,
    "L",
    {
      ability: "falkner_roost",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "johto_bugsy_scyther",
    "호일의 스라크",
    "벌레",
    4,
    5,
    5,
    "L",
    {
      ability: "bugsy_furycutter",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "johto_whitney_miltank",
    "꼭두의 밀탱크",
    "노말",
    4,
    4,
    8,
    "L",
    {
      ability: "whitney_rollout",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "johto_morty_gengar",
    "유빈의 팬텀",
    "고스트",
    5,
    6,
    6,
    "L",
    {
      ability: "morty_curse",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "johto_chuck_poliwrath",
    "사도의 강챙이",
    "격투",
    5,
    6,
    8,
    "L",
    {
      ability: "chuck_dynamicpunch",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "johto_jasmine_steelix",
    "규리의 강철톤",
    "강철",
    5,
    5,
    10,
    "L",
    {
      ability: "jasmine_autotomize",
      signature: true,
      trainerOnly: true,
    },
  ),

  // 눈보라 + 얼음뭉치 두 특성
  P(
    "johto_pryce_mamoswine",
    "류옹의 맘모꾸리",
    "얼음",
    5,
    6,
    8,
    "L",
    {
      ability: "blizzard",
      secondaryAbility: "pryce_iceshard",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "johto_clair_kingdra",
    "이향의 킹드라",
    "드래곤",
    5,
    7,
    8,
    "L",
    {
      ability: "clair_dragonpulse",
      signature: true,
      trainerOnly: true,
    },
  ),

  // ============================================================
  // 목호 - 망나뇽 3마리
  // 단일 시그니처보다 개별 성능은 낮게
  // ============================================================

  P(
    "johto_lance_dragonite_thunder",
    "목호의 망나뇽 · 번개",
    "드래곤",
    5,
    5,
    6,
    "L",
    {
      ability: "lance_thunder",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "johto_lance_dragonite_extremespeed",
    "목호의 망나뇽 · 신속",
    "드래곤",
    5,
    5,
    6,
    "L",
    {
      ability: "lance_extremespeed",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "johto_lance_dragonite_outrage",
    "목호의 망나뇽 · 역린",
    "드래곤",
    5,
    5,
    6,
    "L",
    {
      ability: "lance_outrage",
      signature: true,
      trainerOnly: true,
    },
  ),

    // ============================================================
  // 호연지방 시그니처
  // ============================================================

  P(
    "hoenn_roxanne_nosepass",
    "원규의 코코파스",
    "바위",
    4,
    5,
    9,
    "L",
    {
      ability: "sandstream",
      secondaryAbility: "sturdy",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_brawly_hariyama",
    "철구의 하리뭉",
    "격투",
    4,
    7,
    9,
    "L",
    {
      ability: "guts",
      secondaryAbility: "counter",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_wattson_manectric",
    "암페어의 썬더볼트",
    "전기",
    4,
    7,
    7,
    "L",
    {
      ability: "thunderfang",
      secondaryAbility: "voltabsorb",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_flannery_camerupt",
    "민지의 폭타",
    "불꽃",
    5,
    7,
    9,
    "L",
    {
      ability: "burningfall",
      secondaryAbility: "flashfire",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_norman_slaking",
    "종길의 게을킹",
    "노말",
    5,
    10,
    9,
    "L",
    {
      ability: "moxie",
      secondaryAbility: "sheerforce",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_winona_altaria",
    "은송의 파비코리",
    "드래곤",
    5,
    7,
    10,
    "L",
    {
      ability: "regenerator",
      secondaryAbility: "multiscale",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_tate_solrock",
    "풍의 솔록",
    "바위",
    5,
    7,
    8,
    "L",
    {
      ability: "rockblast",
      secondaryAbility: "levitate",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_liza_lunatone",
    "란의 루나톤",
    "에스퍼",
    5,
    6,
    9,
    "L",
    {
      ability: "moonlight",
      secondaryAbility: "levitate",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_wallace_milotic",
    "윤진의 밀로틱",
    "물",
    6,
    7,
    12,
    "L",
    {
      ability: "primordialsea",
      secondaryAbility: "marvelscale",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_juan_kingdra",
    "아단의 킹드라",
    "드래곤",
    6,
    9,
    10,
    "L",
    {
      ability: "drizzle",
      secondaryAbility: "swiftswim",
      signature: true,
      trainerOnly: true,
    },
  ),

  P(
    "hoenn_steven_metagross",
    "성호의 메타그로스",
    "강철",
    7,
    11,
    12,
    "L",
    {
      ability: "clearbody",
      secondaryAbility: "toughclaws",
      signature: true,
      trainerOnly: true,
    },
  ),

  {
    id: "hoenn_steven_metagrossite",
    name: "성호의 메타그로스나이트",
    kind: "mega",
    type: "도구",
    cost: 2,
    rarity: "L",
    emoji: "🔮",

    megaFor: "hoenn_steven_metagross",
    megaSpriteId: 10076,

    mega: {
      atk: 4,
      hp: 4,
      ability: "toughclaws",
      secondaryAbility: "clearbody",
    },

    text:
      "성호의 메타그로스 전용. +4/+4, 단단한발톱과 클리어바디를 얻는다. (게임당 메가진화 1회)",

    trainerOnly: true,
  },
];

export const CARD_MAP = Object.fromEntries(
  [...CARDS, ...TRAINER_CARDS].map((c) => [c.id, c]),
);

const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";

export const DEX = {
  // 트레이너 전용 시그니처
  surge_raichu: 26, // 라이츄
  sabrina_gallade: 475, // 엘레이드
  erika_bellossom: 182, // 아르코
  janine_venomoth: 49, // 도나리
  misty_starmie: 121, // 아쿠스타
  brock_onix: 95, // 롱스톤
  blaine_camerupt: 323, // 폭타
  blue_pidgeot: 18, // 피죤투
  red_pikachu: 25, // 피카츄

  // 성도 시그니처
  johto_falkner_pidgeotto: 17, // 피죤
  johto_bugsy_scyther: 123, // 스라크
  johto_whitney_miltank: 241, // 밀탱크
  johto_morty_gengar: 94, // 팬텀
  johto_chuck_poliwrath: 62, // 강챙이
  johto_jasmine_steelix: 208, // 강철톤
  johto_pryce_mamoswine: 473, // 맘모꾸리
  johto_clair_kingdra: 230, // 킹드라

  johto_lance_dragonite_thunder: 149,
  johto_lance_dragonite_extremespeed: 149,
  johto_lance_dragonite_outrage: 149,

  // 호연 시그니처
  hoenn_roxanne_nosepass: 299,
  hoenn_brawly_hariyama: 297,
  hoenn_wattson_manectric: 310,
  hoenn_flannery_camerupt: 323,
  hoenn_norman_slaking: 289,
  hoenn_winona_altaria: 334,
  hoenn_tate_solrock: 338,
  hoenn_liza_lunatone: 337,
  hoenn_wallace_milotic: 350,
  hoenn_juan_kingdra: 230,
  hoenn_steven_metagross: 376,

  mudkip: 258,
  marshtomp: 259,
  swampert: 260,
  magikarp: 129,
  gyarados: 130,
  lapras: 131,
  vaporeon: 134,
  politoed: 186,
  kyogre: 382,
  psyduck: 54,
  golduck: 55,
  horsea: 116,
  seadra: 117,
  staryu: 120,
  starmie: 121,
  mantyke: 458,
  mantine: 226,
  barboach: 339,
  whiscash: 340,
  carvanha: 318,
  sharpedo: 319,
  suicune: 245,
  charmander: 4,
  charmeleon: 5,
  charizard: 6,
  flareon: 136,
  ninetales: 38,
  vulpix: 37,
  ponyta: 77,
  rapidash: 78,
  magmar: 126,
  moltres: 146,
  entei: 244,
  hooh: 250,
  bulbasaur: 1,
  ivysaur: 2,
  venusaur: 3,
  chikorita: 152,
  exeggutor: 103,
  bellsprout: 69,
  weepinbell: 70,
  victreebel: 71,
  tangela: 114,
  treecko: 252,
  grovyle: 253,
  sceptile: 254,
  sunkern: 191,
  sunflora: 192,
  tropius: 357,
  parasect: 47,
  pikachu: 25,
  raichu: 26,
  magnemite: 81,
  magneton: 82,
  electabuzz: 125,
  elekid: 239,
  voltorb: 100,
  mareep: 179,
  flaaffy: 180,
  ampharos: 181,
  zapdos: 145,
  raikou: 243,
  diglett: 50,
  dugtrio: 51,
  sandslash: 28,
  rhydon: 112,
  rhyhorn: 111,
  rhyperior: 464,
  gligar: 207,
  trapinch: 328,
  vibrava: 329,
  flygon: 330,
  groudon: 383,
  pidgey: 16,
  pidgeotto: 17,
  pidgeot: 18,
  spearow: 21,
  fearow: 22,
  doduo: 84,
  dodrio: 85,
  farfetchd: 83,
  tauros: 128,
  rattata: 19,
  raticate: 20,
  eevee: 133,
  snorlax: 143,
  chansey: 113,
  kangaskhan: 115,
  slakoth: 287,
  vigoroth: 288,
  slaking: 289,
  miltank: 241,
  porygon: 137,
  dunsparce: 206,
  caterpie: 10,
  butterfree: 12,
  scyther: 123,
  weedle: 13,
  kakuna: 14,
  beedrill: 15,
  heracross: 214,
  ledyba: 165,
  ledian: 166,
  seel: 86,
  dewgong: 87,
  articuno: 144,
  jynx: 124,
  shellder: 90,
  cloyster: 91,
  swinub: 220,
  piloswine: 221,
  regice: 378,
  machop: 66,
  machoke: 67,
  machamp: 68,
  mankey: 56,
  primeape: 57,
  hitmonlee: 106,
  hitmonchan: 107,
  makuhita: 296,
  hariyama: 297,
  meditite: 307,
  medicham: 308,
  riolu: 447,
  lucario: 448,
  grimer: 88,
  muk: 89,
  weezing: 110,
  ekans: 23,
  arbok: 24,
  nidoranm: 32,
  nidorino: 33,
  nidoking: 34,
  zubat: 41,
  golbat: 42,
  crobat: 169,
  abra: 63,
  kadabra: 64,
  alakazam: 65,
  celebi: 251,
  mewtwo: 150,
  drowzee: 96,
  hypno: 97,
  ralts: 280,
  kirlia: 281,
  gardevoir: 282,
  natu: 177,
  xatu: 178,
  espeon: 196,
  mew: 151,
  lugia: 249,
  onix: 95,
  aerodactyl: 142,
  larvitar: 246,
  pupitar: 247,
  tyranitar: 248,
  geodude: 74,
  graveler: 75,
  golem: 76,
  nosepass: 299,
  lunatone: 337,
  regirock: 377,
  gastly: 92,
  haunter: 93,
  gengar: 94,
  misdreavus: 200,
  mimikyu: 778,
  dratini: 147,
  dragonair: 148,
  dragonite: 149,
  kingdra: 230,
  swablu: 333,
  altaria: 334,
  bagon: 371,
  shelgon: 372,
  salamence: 373,
  latias: 380,
  rayquaza: 384,
  umbreon: 197,
  sneasel: 215,
  houndour: 228,
  houndoom: 229,
  sableye: 302,
  pawniard: 624,
  bisharp: 625,
  kingambit: 983,
  absol: 359,
  skarmory: 227,
  steelix: 208,
  scizor: 212,
  magnezone: 462,
  corviknight: 823,
  registeel: 379,
  rookidee: 821,
  corvisquire: 822,
  beldum: 374,
  metang: 375,
  metagross: 376,
  clefairy: 35,
  clefable: 36,
  marill: 183,
  azumarill: 184,
  jigglypuff: 39,
  wigglytuff: 40,
  togepi: 175,
  togetic: 176,
  granbull: 210,
  sylveon: 700,
  nidoranf: 29,
  nidorina: 30,
  nidoqueen: 31,
  pinsir: 127,
  duskull: 355,
  dusclops: 356,
  dusknoir: 477,
  rotom: 479,
  hoothoot: 163,
  noctowl: 164,
  wingull: 278,
  pelipper: 279,
  taillow: 276,
  swellow: 277,
  hoppip: 187,
  skiploom: 188,
  jumpluff: 189,
  starly: 396,
  staravia: 397,
  staraptor: 398,
  snorunt: 361,
  glalie: 362,
  poochyena: 261,
  mightyena: 262,
  bronzor: 436,
  bronzong: 437,
  numel: 322,
  camerupt: 323,
  phanpy: 231,
  donphan: 232,
  wooper: 194,
  quagsire: 195,
  sentret: 161,
  furret: 162,
  teddiursa: 216,
  ursaring: 217,
  bidoof: 399,
  bibarel: 400,
  oddish: 43,
  gloom: 44,
  vileplume: 45,
  turtwig: 387,
  grotle: 388,
  torterra: 389,
  growlithe: 58,
  arcanine: 59,
  chimchar: 390,
  monferno: 391,
  infernape: 392,
  piplup: 393,
  prinplup: 394,
  empoleon: 395,
  gible: 443,
  gabite: 444,
  garchomp: 445,
  shinx: 403,
  luxio: 404,
  luxray: 405,
  budew: 406,
  roserade: 407,
  cranidos: 408,
  rampardos: 409,
  shieldon: 410,
  bastiodon: 411,
  wormadam: 413,
  mothim: 414,
  combee: 415,
  vespiquen: 416,
  pachirisu: 417,
  buizel: 418,
  floatzel: 419,
  cherubi: 420,
  cherrim: 421,
  gastrodon: 423,
  ambipom: 424,
  drifloon: 425,
  drifblim: 426,
  buneary: 427,
  lopunny: 428,
  glameow: 431,
  purugly: 432,
  sneasel: 215,
  burmy: 412,
  stunky: 434,
  skuntank: 435,
  bonsly: 438,
  mimejr: 439,
  snover: 459,
  abomasnow: 460,
  weavile: 461,
  togekiss: 468,
  leafeon: 470,
  glaceon: 471,
  hippopotas: 449,
  hippowdon: 450,
  skorupi: 451,
  drapion: 452,
  croagunk: 453,
  toxicroak: 454,
  carnivine: 455,
    // v6 1~3세대 확장
  squirtle: 7,
  wartortle: 8,
  blastoise: 9,

  meowth: 52,
  persian: 53,

  poliwag: 60,
  poliwhirl: 61,
  poliwrath: 62,

  tentacool: 72,
  tentacruel: 73,

  slowpoke: 79,
  slowbro: 80,

  krabby: 98,
  kingler: 99,

  cubone: 104,
  marowak: 105,

  jolteon: 135,

  omanyte: 138,
  omastar: 139,

  bayleef: 153,
  meganium: 154,

  cyndaquil: 155,
  quilava: 156,
  typhlosion: 157,

  totodile: 158,
  croconaw: 159,
  feraligatr: 160,

  spinarak: 167,
  ariados: 168,

  chinchou: 170,
  lanturn: 171,

  sudowoodo: 185,
  aipom: 190,
  wobbuffet: 202,

  pineco: 204,
  forretress: 205,

  porygon2: 233,

  torchic: 255,
  combusken: 256,
  blaziken: 257,

  lotad: 270,
  lombre: 271,
  ludicolo: 272,

  shroomish: 285,
  breloom: 286,

  nincada: 290,
  ninjask: 291,
  shedinja: 292,

  mawile: 303,

  aron: 304,
  lairon: 305,
  aggron: 306,

  electrike: 309,
  manectric: 310,

  wailmer: 320,
  wailord: 321,

  cacnea: 331,
  cacturne: 332,

  feebas: 349,
  milotic: 350,

  castform: 351,
  kecleon: 352,

  shuppet: 353,
  banette: 354,

  latios: 381,
  jirachi: 385,
  deoxys: 386,
};

export const MEGA_DEX = {
  swampert: 10064,
  charizard: 10035, // Y 기본
  gyarados: 10041,
  gengar: 10038,
  salamence: 10089,

  // v6 추가
  blastoise: 10036,
  venusaur: 10033,
  beedrill: 10090,
  alakazam: 10037,
  kangaskhan: 10039,
  ampharos: 10045,
  tyranitar: 10049,
  blaziken: 10050,
  gardevoir: 10051,
  mawile: 10052,
  aggron: 10053,
  manectric: 10055,
  banette: 10056,
  absol: 10057,
};

export const ITEM_SPRITE = {
  pokeball: "poke-ball",
  superball: "great-ball",
  hyperball: "ultra-ball",
  potion: "potion",
  fullrestore: "full-restore",
  everstone: "eviolite",
  lifeorb: "life-orb",
  focussash: "focus-sash",
  shellbell: "shell-bell",
  ultra: "ultra-ball",
  antidote: "antidote",
  paralyzeheal: "paralyze-heal",
  burnheal: "burn-heal",
  iceheal: "ice-heal",
  awakening: "awakening",
  fullheal: "full-heal",
  swampertite: "swampertite",
  charizarditey: "charizardite-y",
  gyaradosite: "gyaradosite",
  gengarite: "gengarite",
  salamencite: "salamencite",
  hydropump: "tm-water",
  raindance: "tm-water",
  surf: "hm-water",
  flamethrower: "tm-fire",
  sunnyday: "tm-fire",
  solarbeam: "tm-grass",
  thunderbolt: "tm-electric",
  earthquake: "tm-ground",
  sandstorm: "tm-ground",
  quickattack: "tm-normal",
  psychic: "tm-psychic",
  icebeam: "tm-ice",
  stoneedge: "tm-rock",
  moonblast: "tm-fairy",
  infight: "tm-fighting",
  shadowball: "tm-ghost",
  darkpulse: "tm-dark",
  ironhead: "tm-steel",
  dragonclaw: "tm-dragon",
    // v6 신규 기술
  sheercold: "tm-ice",
  fissure: "tm-ground",
  horndrill: "tm-normal",
  guillotine: "tm-normal",

  hyperbeam: "tm-normal",
  fireblast: "tm-fire",
  blizzardmove: "tm-ice",
  heatwave: "tm-fire",
  sludgewave: "tm-poison",
  discharge: "tm-electric",
  dracometeor: "tm-dragon",
  explosionmove: "tm-normal",
  perishsong: "tm-ghost",

  spore: "tm-grass",
  willowisp: "tm-fire",
  thunderwave_move: "tm-electric",
  toxic: "tm-poison",
  recover: "tm-normal",
  roar: "tm-normal",
  safeguard: "tm-normal",
  haze: "tm-ice",

  // v6 메가스톤
  blastoisinite: "blastoisinite",
  venusaurite: "venusaurite",
  charizarditex: "charizardite-x",
  beedrillite: "beedrillite",
  alakazite: "alakazite",
  kangaskhanite: "kangaskhanite",
  ampharosite: "ampharosite",
  tyranitarite: "tyranitarite",
  blazikenite: "blazikenite",
  gardevoirite: "gardevoirite",
  mawilite: "mawilite",
  aggronite: "aggronite",
  manectite: "manectite",
  banettite: "banettite",
  absolite: "absolite",

  hoenn_steven_metagrossite: "metagrossite",
};

export const UI_SPRITES = {
  coin: `${SPRITE_BASE}/items/amulet-coin.png`,
  pokeball: `${SPRITE_BASE}/items/poke-ball.png`,
  map: `${SPRITE_BASE}/items/town-map.png`,
};

export const BALL_SPRITES = {
  master: `${SPRITE_BASE}/items/master-ball.png`,
  ultra: `${SPRITE_BASE}/items/ultra-ball.png`,
  dive: `${SPRITE_BASE}/items/dive-ball.png`,
  nest: `${SPRITE_BASE}/items/nest-ball.png`,
  premier: `${SPRITE_BASE}/items/premier-ball.png`,
  great: `${SPRITE_BASE}/items/great-ball.png`,
  poke: `${SPRITE_BASE}/items/poke-ball.png`,
};

export const RARITY_BALL = { C: "poke", R: "great", E: "ultra", L: "master" };

export function trainerSpriteUrl(key) {
  return `https://play.pokemonshowdown.com/sprites/trainers/${key}.png`;
}

export function spriteUrl(
  cardId,
  mega = false,
  busted = false,
  spriteId = null,
) {
  if (cardId === "mimikyu" && busted) {
    return `${SPRITE_BASE}/pokemon/10143.png`;
  }

  if (spriteId) {
    return `${SPRITE_BASE}/pokemon/${spriteId}.png`;
  }

  if (mega && MEGA_DEX[cardId]) {
    return `${SPRITE_BASE}/pokemon/${MEGA_DEX[cardId]}.png`;
  }

  if (DEX[cardId]) {
    return `${SPRITE_BASE}/pokemon/${DEX[cardId]}.png`;
  }

  if (ITEM_SPRITE[cardId]) {
    return `${SPRITE_BASE}/items/${ITEM_SPRITE[cardId]}.png`;
  }

  return null;
}

export const STARTER_DECK = [
  "rattata",
  "rattata",
  "raticate",
  "raticate",
  "caterpie",
  "caterpie",
  "butterfree",
  "eevee",
  "eevee",
  "vaporeon",
  "tauros",
  "snorlax",
  "chansey",
  "mudkip",
  "mudkip",
  "marshtomp",
  "magikarp",
  "lapras",
  "ponyta",
  "ponyta",
  "spearow",
  "pokeball",
  "pokeball",
  "potion",
  "potion",
  "quickattack",
  "quickattack",
  "hydropump",
  "surf",
  "raindance",
];

// ============ 카드팩 ============
export const PACK_SIZE = 5;
export const PACKS = {
  basic: {
    id: "basic",
    name: "포스스톤",
    sub: "기본팩 · 스타디움",
    price: 70,
    weights: { C: 82, R: 15, E: 2.5, L: 0.5 },
    guarantee: "R", // 최소 레어 1장 보장
    ball: "poke",
  },
  premium: {
    id: "premium",
    name: "포스스톤 EX",
    sub: "프리미엄팩 · 챔피언로드",
    price: 350,
    weights: { C: 48, R: 38, E: 11.5, L: 2.5 },
    guarantee: "E",
    ball: "master",
  },
  // ── 레전드 테마팩 (레전드 확률 4%, 레전드는 테마 풀에서만 등장) ──
  storm: {
    id: "storm",
    name: "포스스톤 STORM",
    sub: "폭풍팩 · 물·전기·얼음 레전드",
    price: 550,
    weights: { C: 55, R: 33, E: 8, L: 4 },
    guarantee: "E",
    ball: "dive",
    legendPool: ["kyogre", "suicune", "zapdos", "raikou", "articuno", "regice"],
  },
  earth: {
    id: "earth",
    name: "포스스톤 EARTH",
    sub: "대지팩 · 불꽃·땅·바위·강철 레전드",
    price: 550,
    weights: { C: 55, R: 33, E: 8, L: 4 },
    guarantee: "E",
    ball: "nest",
    legendPool: [
      "moltres",
      "entei",
      "hooh",
      "groudon",
      "regirock",
      "registeel",
    ],
  },
  mystic: {
    id: "mystic",
    name: "포스스톤 MYSTIC",
    sub: "환상팩 · 에스퍼·드래곤 레전드",
    price: 550,
    weights: { C: 55, R: 33, E: 8, L: 4 },
    guarantee: "E",
    ball: "premier",
    legendPool: ["celebi", "mewtwo", "mew", "lugia", "latias", "rayquaza"],
  },
};
// 하위 호환
export const PACK_PRICE = PACKS.basic.price;
export const RARITY_WEIGHTS = PACKS.basic.weights;
