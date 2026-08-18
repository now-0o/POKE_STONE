import {
  CARDS,
  CARD_MAP,
  DEX,
  ABILITY_TEXT,
  ITEM_SPRITE,
  LEGENDARY_POKEMON_IDS,
} from "../cards.js";

// ============================================================
// 하나지방(5세대) 카드 확장
// - 기존 카드/특성 ID가 있으면 절대 덮어쓰지 않는다.
// - 조로아/조로아크는 기획 보류로 의도적으로 제외한다.
// - 신규 effect/ability ID는 engine.js에서 별도 처리한다.
// ============================================================

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

const UNOVA_POKEMON = [
  // 스타팅
  P("snivy", "주리비얀", "풀", 1, 1, 2, "C", { ability: "overgrow" }),
  P("servine", "샤비", "풀", 3, 3, 5, "R", { stage: 1, evolvesFrom: "snivy", ability: "overgrow" }),
  P("serperior", "샤로다", "풀", 5, 6, 9, "E", { stage: 2, evolvesFrom: "servine", ability: "contrary" }),
  P("tepig", "뚜꾸리", "불꽃", 1, 2, 1, "C", { ability: "blaze" }),
  P("pignite", "차오꿀", "불꽃", 3, 5, 3, "R", { stage: 1, evolvesFrom: "tepig", ability: "blaze" }),
  P("emboar", "염무왕", "불꽃", 5, 8, 7, "E", { stage: 2, evolvesFrom: "pignite", ability: "sheerforce" }),
  P("oshawott", "수댕이", "물", 1, 1, 2, "C", { ability: "torrent" }),
  P("dewott", "쌍검자비", "물", 3, 4, 4, "R", { stage: 1, evolvesFrom: "oshawott", ability: "torrent" }),
  P("samurott", "대검귀", "물", 5, 7, 8, "E", { stage: 2, evolvesFrom: "dewott", ability: "torrent" }),

  // 초반 / 성신 / 알로에
  P("patrat", "보르쥐", "노말", 1, 1, 2, "C", {}),
  P("watchog", "보르그", "노말", 3, 4, 5, "R", { stage: 1, evolvesFrom: "patrat", ability: "keeneye" }),
  P("lillipup", "요테리", "노말", 1, 1, 2, "C", {}),
  P("herdier", "하데리어", "노말", 3, 4, 4, "R", { stage: 1, evolvesFrom: "lillipup", ability: "intimidate" }),
  P("stoutland", "바랜드", "노말", 5, 7, 8, "E", { stage: 2, evolvesFrom: "herdier", ability: "intimidate" }),
  P("purrloin", "쌔비냥", "악", 1, 2, 1, "C", {}),
  P("liepard", "레파르다스", "악", 3, 5, 4, "R", { stage: 1, evolvesFrom: "purrloin", ability: "prankster" }),
  P("pansage", "야나프", "풀", 1, 1, 2, "C", { ability: "overgrow" }),
  P("simisage", "야나키", "풀", 3, 5, 4, "R", { stage: 1, evolvesFrom: "pansage", ability: "overgrow" }),
  P("pansear", "바오프", "불꽃", 1, 2, 1, "C", { ability: "blaze" }),
  P("simisear", "바오키", "불꽃", 3, 5, 4, "R", { stage: 1, evolvesFrom: "pansear", ability: "blaze" }),
  P("panpour", "앗차프", "물", 1, 1, 2, "C", { ability: "torrent" }),
  P("simipour", "앗차키", "물", 3, 4, 5, "R", { stage: 1, evolvesFrom: "panpour", ability: "torrent" }),
  P("audino", "다부니", "노말", 4, 3, 8, "R", { ability: "regenerator" }),

  // 아티 / 벌레
  P("sewaddle", "두르보", "벌레", 1, 1, 2, "C", {}),
  P("swadloon", "두르쿤", "벌레", 3, 2, 6, "R", { stage: 1, evolvesFrom: "sewaddle" }),
  P("leavanny", "모아머", "벌레", 5, 8, 7, "E", { stage: 2, evolvesFrom: "swadloon", ability: "chlorophyll" }),
  P("venipede", "마디네", "벌레", 1, 1, 2, "C", { ability: "poisonpoint" }),
  P("whirlipede", "휠구", "벌레", 3, 3, 5, "R", { stage: 1, evolvesFrom: "venipede", ability: "poisonpoint" }),
  P("scolipede", "펜드라", "벌레", 5, 8, 7, "E", { stage: 2, evolvesFrom: "whirlipede", ability: "speedboost" }),
  P("dwebble", "돌살이", "벌레", 1, 1, 3, "C", { ability: "sturdy" }),
  P("crustle", "암팰리스", "바위", 4, 5, 7, "R", { stage: 1, evolvesFrom: "dwebble", ability: "weakarmor" }),
  P("karrablast", "딱정곤", "벌레", 2, 3, 2, "C", {}),
  P("escavalier", "슈바르고", "강철", 5, 8, 8, "E", { stage: 1, evolvesFrom: "karrablast", ability: "shellarmor" }),
  P("shelmet", "쪼마리", "벌레", 2, 1, 4, "C", {}),
  P("accelgor", "어지리더", "벌레", 5, 8, 6, "E", { stage: 1, evolvesFrom: "shelmet", ability: "unburden" }),
  P("larvesta", "활화르바", "벌레", 2, 3, 2, "C", { ability: "flamebody" }),
  P("volcarona", "불카모스", "불꽃", 6, 9, 8, "E", { stage: 1, evolvesFrom: "larvesta", ability: "flamebody" }),

  // 카밀레 / 전기
  P("blitzle", "줄뮤마", "전기", 1, 2, 1, "C", { ability: "static" }),
  P("zebstrika", "제브라이카", "전기", 4, 7, 4, "R", { stage: 1, evolvesFrom: "blitzle", ability: "motor_drive" }),
  P("emolga", "에몽가", "전기", 3, 4, 4, "R", { ability: "voltabsorb" }),
  P("joltik", "파쪼옥", "벌레", 1, 1, 2, "C", { ability: "static" }),
  P("galvantula", "전툴라", "전기", 4, 6, 5, "R", { stage: 1, evolvesFrom: "joltik", ability: "compoundeyes" }),

  // 야콘 / 모래
  P("roggenrola", "단굴", "바위", 1, 1, 3, "C", { ability: "sturdy" }),
  P("boldore", "암트르", "바위", 3, 3, 6, "R", { stage: 1, evolvesFrom: "roggenrola", ability: "sturdy" }),
  P("gigalith", "기가이어스", "바위", 5, 7, 9, "E", { stage: 2, evolvesFrom: "boldore", ability: "sandstream" }),
  P("drilbur", "두더류", "땅", 1, 2, 1, "C", { ability: "sandrush" }),
  P("excadrill", "몰드류", "땅", 5, 9, 6, "E", { stage: 1, evolvesFrom: "drilbur", ability: "sandrush" }),
  P("sandile", "깜눈크", "땅", 1, 2, 1, "C", {}),
  P("krokorok", "악비르", "악", 3, 5, 3, "R", { stage: 1, evolvesFrom: "sandile", ability: "moxie" }),
  P("krookodile", "악비아르", "악", 5, 9, 6, "E", { stage: 2, evolvesFrom: "krokorok", ability: "moxie" }),

  // 풀 / 상태 컨트롤
  P("cottonee", "소미안", "풀", 1, 1, 2, "C", {}),
  P("whimsicott", "엘풍", "풀", 4, 4, 7, "R", { stage: 1, evolvesFrom: "cottonee", ability: "prankster" }),
  P("foongus", "깜놀버슬", "풀", 1, 1, 2, "C", { ability: "effectspore" }),
  P("amoonguss", "뽀록나", "풀", 4, 3, 8, "R", { stage: 1, evolvesFrom: "foongus", ability: "regenerator" }),
  P("ferroseed", "철시드", "강철", 2, 1, 5, "C", { ability: "ironbarbs" }),
  P("ferrothorn", "너트령", "강철", 5, 5, 10, "E", { stage: 1, evolvesFrom: "ferroseed", ability: "ironbarbs" }),

  // 고스트 / 불꽃
  P("yamask", "데스마스", "고스트", 2, 1, 4, "C", { ability: "mummy" }),
  P("cofagrigus", "데스니칸", "고스트", 5, 4, 11, "E", { stage: 1, evolvesFrom: "yamask", ability: "mummy" }),
  P("litwick", "불켜미", "고스트", 1, 1, 2, "C", { ability: "flashfire" }),
  P("lampent", "램프라", "고스트", 3, 4, 4, "R", { stage: 1, evolvesFrom: "litwick", ability: "flashfire" }),
  P("chandelure", "샹델라", "고스트", 5, 8, 7, "E", { stage: 2, evolvesFrom: "lampent", ability: "flashfire" }),
  P("darumaka", "달막화", "불꽃", 2, 4, 1, "C", { ability: "sheerforce" }),
  P("darmanitan", "불비달마", "불꽃", 5, 9, 5, "E", { stage: 1, evolvesFrom: "darumaka", ability: "zenmode" }),

  // 풍란 / 비행
  P("ducklett", "꼬지보리", "물", 1, 1, 2, "C", {}),
  P("swanna", "스완나", "비행", 4, 6, 5, "R", { stage: 1, evolvesFrom: "ducklett", ability: "keeneye" }),
  P("rufflet", "수리둥보", "비행", 2, 3, 2, "C", {}),
  P("braviary", "워글", "비행", 5, 8, 7, "E", { stage: 1, evolvesFrom: "rufflet", ability: "defiant" }),
  P("vullaby", "벌차이", "악", 2, 1, 4, "C", { ability: "overcoat" }),
  P("mandibuzz", "버랜지나", "악", 5, 5, 10, "E", { stage: 1, evolvesFrom: "vullaby", ability: "overcoat" }),

  // 담죽 / 얼음
  P("vanillite", "바닐프티", "얼음", 1, 1, 2, "C", {}),
  P("vanillish", "바닐리치", "얼음", 3, 3, 5, "R", { stage: 1, evolvesFrom: "vanillite" }),
  P("vanilluxe", "배바닐라", "얼음", 5, 7, 8, "E", { stage: 2, evolvesFrom: "vanillish", ability: "icebody" }),
  P("cubchoo", "코고미", "얼음", 1, 2, 1, "C", {}),
  P("beartic", "툰베어", "얼음", 5, 8, 7, "E", { stage: 1, evolvesFrom: "cubchoo", ability: "swiftswim" }),
  P("cryogonal", "프리지오", "얼음", 4, 5, 6, "R", { ability: "levitate" }),

  // 사간 / 드래곤
  P("axew", "터검니", "드래곤", 1, 2, 1, "C", { ability: "moldbreaker" }),
  P("fraxure", "액슨도", "드래곤", 3, 5, 3, "R", { stage: 1, evolvesFrom: "axew", ability: "moldbreaker" }),
  P("haxorus", "액스라이즈", "드래곤", 6, 11, 6, "E", { stage: 2, evolvesFrom: "fraxure", ability: "moldbreaker" }),
  P("druddigon", "크리만", "드래곤", 5, 7, 8, "E", { ability: "roughskin" }),
  P("deino", "모노두", "악", 1, 2, 1, "C", {}),
  P("zweilous", "디헤드", "악", 3, 5, 3, "R", { stage: 1, evolvesFrom: "deino" }),
  P("hydreigon", "삼삼드래", "드래곤", 7, 11, 9, "E", { stage: 2, evolvesFrom: "zweilous", ability: "levitate" }),

  // 화석
  P("tirtouga", "프로토가", "물", 2, 2, 4, "C", { ability: "sturdy" }),
  P("carracosta", "늑골라", "물", 5, 6, 9, "E", { stage: 1, evolvesFrom: "tirtouga", ability: "sturdy" }),
  P("archen", "아켄", "바위", 2, 4, 1, "C", { ability: "defeatist" }),
  P("archeops", "아케오스", "비행", 5, 10, 5, "E", { stage: 1, evolvesFrom: "archen", ability: "defeatist" }),

  // 레전드 / 환상
  P("victini", "비크티니", "불꽃", 7, 8, 9, "L", { ability: "victorystar" }),
  P("cobalion", "코바르온", "강철", 7, 8, 9, "L", { ability: "justified" }),
  P("terrakion", "테라키온", "바위", 7, 10, 7, "L", { ability: "justified" }),
  P("virizion", "비리디온", "풀", 7, 8, 9, "L", { ability: "justified" }),
  P("tornadus", "토네로스", "비행", 7, 9, 8, "L", { ability: "prankster" }),
  P("thundurus", "볼트로스", "전기", 7, 9, 8, "L", { ability: "prankster" }),
  P("landorus", "랜드로스", "땅", 7, 9, 8, "L", { ability: "sandforce" }),
  P("reshiram", "레시라무", "불꽃", 8, 9, 9, "L", { ability: "crossflame" }),
  P("zekrom", "제크로무", "전기", 8, 10, 8, "L", { ability: "crossbolt" }),
  P("kyurem", "큐레무", "얼음", 8, 9, 9, "L", { ability: "pressure" }),
];

const UNOVA_SPELLS = [
  {
    id: "scald",
    name: "열탕",
    kind: "spell",
    type: "기술",
    moveType: "물",
    cost: 3,
    rarity: "R",
    emoji: "♨️",
    spell: { effect: "damage_status", amount: 3, status: "burn", chance: 0.4, target: "enemy-pokemon" },
    text: "상대 포켓몬 하나에게 물 피해 3. 40% 확률로 화상 상태로 만든다.",
  },
  {
    id: "voltswitch",
    name: "볼트체인지",
    kind: "spell",
    type: "기술",
    moveType: "전기",
    cost: 2,
    rarity: "R",
    emoji: "🔄",
    spell: { effect: "damage_recall_friendly", amount: 2, target: "enemy-any" },
    text: "전기 피해 2를 준 뒤, 내 포켓몬 하나를 선택해 손으로 되돌릴 수 있다.",
  },
  {
    id: "flamecharge",
    name: "니트로차지",
    kind: "spell",
    type: "기술",
    moveType: "불꽃",
    cost: 2,
    rarity: "R",
    emoji: "🔥",
    spell: { effect: "damage_grant_rush", amount: 2, target: "enemy-any" },
    text: "불꽃 피해 2를 주고 아군 포켓몬 하나에게 이번 턴 돌진을 부여한다.",
  },
  {
    id: "acrobatics",
    name: "애크러뱃",
    kind: "spell",
    type: "기술",
    moveType: "비행",
    cost: 3,
    rarity: "R",
    emoji: "🪽",
    spell: { effect: "acrobatics", amount: 3, bonus: 2, target: "enemy-any" },
    text: "비행 피해 3. 내 필드의 포켓몬에게 장착된 도구가 하나도 없다면 피해 +2.",
  },
  {
    id: "dragontail",
    name: "드래곤테일",
    kind: "spell",
    type: "기술",
    moveType: "드래곤",
    cost: 3,
    rarity: "R",
    emoji: "🐲",
    spell: { effect: "damage_bounce", amount: 2, target: "enemy-pokemon" },
    text: "드래곤 피해 2. 대상이 살아남으면 상대 손으로 되돌린다.",
  },
  {
    id: "quiverdance",
    name: "나비춤",
    kind: "spell",
    type: "기술",
    cost: 3,
    rarity: "E",
    emoji: "🦋",
    spell: { effect: "buff_draw", atk: 2, draw: 1, target: "friendly-pokemon" },
    text: "아군 포켓몬 하나의 공격력 +2. 카드 1장을 뽑는다.",
  },
  {
    id: "shellsmash",
    name: "껍질깨기",
    kind: "spell",
    type: "기술",
    cost: 2,
    rarity: "E",
    emoji: "🐚",
    spell: { effect: "shell_smash", hpLoss: 2, atk: 3, target: "friendly-pokemon" },
    text: "아군 포켓몬 하나가 체력 2를 잃고 공격력 +3을 얻는다. 이 효과로 기절할 수 있다.",
  },
  {
    id: "geargrind",
    name: "기어소서",
    kind: "spell",
    type: "기술",
    moveType: "강철",
    cost: 3,
    rarity: "R",
    emoji: "⚙️",
    spell: { effect: "multi_damage", amount: 2, hits: 2, target: "enemy-any" },
    text: "같은 대상에게 강철 피해 2를 2회 준다.",
  },
  {
    id: "sacredsword",
    name: "성스러운칼",
    kind: "spell",
    type: "기술",
    moveType: "격투",
    cost: 4,
    rarity: "E",
    emoji: "⚔️",
    spell: { effect: "piercing_damage", amount: 4, target: "enemy-pokemon" },
    text: "상대 포켓몬 하나에게 격투 피해 4. 방어도와 피해 감소 특성을 무시한다.",
  },
  {
    id: "reflect",
    name: "리플렉터",
    kind: "spell",
    type: "기술",
    cost: 2,
    rarity: "R",
    emoji: "🪞",
    spell: { effect: "reflect", charges: 3, reduction: 2 },
    text: "리플렉터를 설치한다. 다음 3회의 적 포켓몬 전투 공격으로 받는 피해를 각각 2 감소시킨다. 재사용하면 3회로 갱신된다.",
  },
  {
    id: "lightscreen",
    name: "빛의장막",
    kind: "spell",
    type: "기술",
    cost: 2,
    rarity: "R",
    emoji: "✨",
    spell: { effect: "light_screen", charges: 3, reduction: 2 },
    text: "빛의장막을 설치한다. 다음 3회의 적 기술 카드로 받는 피해를 각각 2 감소시킨다. 광역 기술도 카드 1장당 1회만 소모하며 재사용하면 3회로 갱신된다.",
  },
];

const UNOVA_ITEMS = [
  {
    id: "rockyhelmet",
    name: "울퉁불퉁멧",
    kind: "item",
    type: "도구",
    cost: 2,
    rarity: "R",
    emoji: "⛑️",
    item: { effect: "rocky_helmet" },
    text: "장착 포켓몬이 전투 공격으로 피해를 받으면 공격자에게 피해 1.",
  },
  {
    id: "airballoon",
    name: "풍선",
    kind: "item",
    type: "도구",
    cost: 1,
    rarity: "R",
    emoji: "🎈",
    item: { effect: "air_balloon" },
    text: "장착 포켓몬은 땅 타입 피해에 면역. 처음 다른 피해를 받으면 풍선이 파괴된다.",
  },
  {
    id: "redcard",
    name: "레드카드",
    kind: "item",
    type: "도구",
    cost: 2,
    rarity: "R",
    emoji: "🟥",
    item: { effect: "red_card" },
    text: "장착 포켓몬이 처음 전투 공격을 받으면 공격자를 상대 손으로 되돌리고 이 도구를 파괴한다.",
  },
  {
    id: "ejectbutton",
    name: "탈출버튼",
    kind: "item",
    type: "도구",
    cost: 1,
    rarity: "R",
    emoji: "⏏️",
    item: { effect: "eject_button" },
    text: "장착 포켓몬이 처음 피해를 받고 살아남으면 이 도구를 파괴하고 그 포켓몬을 내 손으로 되돌린다.",
  },
  {
    id: "normalgem",
    name: "노말주얼",
    kind: "item",
    type: "도구",
    cost: 1,
    rarity: "R",
    emoji: "💎",
    item: { effect: "normal_gem", bonus: 2 },
    text: "장착 포켓몬의 다음 기본 공격 피해 +2. 발동 후 파괴된다.",
  },
];

const NEW_ABILITY_TEXT = {
  contrary: "심술꾸러기: 상대 효과로 공격력이 감소하려 할 때 감소하지 않고 그 수치만큼 증가한다.",
  prankster: "짓궂은마음: 나왔을 때 내 덱에서 공격 피해를 주지 않는 기술 카드 1장을 무작위로 찾아 손으로 가져온다.",
  ironbarbs: "철가시: 전투 공격으로 피해를 받으면 공격자에게 피해 1.",
  defiant: "오기: 상대 효과로 공격력이 감소하려 하면 대신 공격력 +1.",
  unburden: "곡예: 장착 도구가 없으면 돌진을 얻는다.",
  sandrush: "모래헤치기: 모래바람 동안 돌진을 얻는다.",
  mummy: "미라: 이 포켓몬을 전투 공격한 상대 포켓몬의 주특성을 미라로 바꾼다. 미라는 같은 방식으로 계속 전염된다.",
  weakarmor: "깨어진갑옷: 전투 피해를 받을 때 공격력 +1. 최대 2회.",
  overcoat: "방진: 날씨 피해와 날씨로 발생하는 상태이상을 받지 않는다.",
  defeatist: "무기력: 체력이 절반 이하이면 공격력 -2.",
  victorystar: "승리의별: 나왔을 때 기술 카드 1장을 가져온다. 살아 있는 동안 매 턴 처음 사용하는 기술 비용 -1, 피해 기술이면 피해 +1.",
  zenmode: "달마모드: 이 포켓몬이 전투 공격 후 반격 피해를 받고 생존하면 게임당 1회 달마모드(공격력 3, 최대 체력 9)로 변하고 도발을 얻는다.",
  crossflame: "크로스플레임: 나왔을 때 상대 필드 1·3·5번째 칸의 포켓몬에게 각각 불꽃 피해 4.",
  crossbolt: "크로스썬더: 나왔을 때 상대 필드 2·4·6번째 칸의 포켓몬에게 각각 전기 피해 4.",
  justified: "정의의마음: 악 타입 피해를 받으면 공격력 +1.",
};

Object.entries(NEW_ABILITY_TEXT).forEach(([id, text]) => {
  if (!(id in ABILITY_TEXT)) ABILITY_TEXT[id] = text;
});

[...UNOVA_POKEMON, ...UNOVA_SPELLS, ...UNOVA_ITEMS].forEach((card) => {
  if (CARD_MAP[card.id]) return;
  CARDS.push(card);
  CARD_MAP[card.id] = card;
});

Object.assign(DEX, {
  snivy: 495, servine: 496, serperior: 497,
  tepig: 498, pignite: 499, emboar: 500,
  oshawott: 501, dewott: 502, samurott: 503,
  patrat: 504, watchog: 505, lillipup: 506, herdier: 507, stoutland: 508,
  purrloin: 509, liepard: 510, pansage: 511, simisage: 512, pansear: 513,
  simisear: 514, panpour: 515, simipour: 516, audino: 531,
  sewaddle: 540, swadloon: 541, leavanny: 542, venipede: 543, whirlipede: 544,
  scolipede: 545, cottonee: 546, whimsicott: 547, petilil: 548, lilligant: 549,
  darumaka: 554, darmanitan: 555, dwebble: 557, crustle: 558,
  scraggy: 559, scrafty: 560, yamask: 562, cofagrigus: 563,
  tirtouga: 564, carracosta: 565, archen: 566, archeops: 567,
  trubbish: 568, garbodor: 569, minccino: 572, cinccino: 573,
  gothita: 574, gothorita: 575, gothitelle: 576, solosis: 577, duosion: 578,
  reuniclus: 579, ducklett: 580, swanna: 581, vanillite: 582, vanillish: 583,
  vanilluxe: 584, deerling: 585, sawsbuck: 586, emolga: 587,
  karrablast: 588, escavalier: 589, foongus: 590, amoonguss: 591,
  frillish: 592, jellicent: 593, joltik: 595, galvantula: 596,
  ferroseed: 597, ferrothorn: 598, klink: 599, klang: 600, klinklang: 601,
  litwick: 607, lampent: 608, chandelure: 609, axew: 610, fraxure: 611,
  haxorus: 612, cubchoo: 613, beartic: 614, cryogonal: 615,
  shelmet: 616, accelgor: 617, druddigon: 621, rufflet: 627, braviary: 628,
  vullaby: 629, mandibuzz: 630, deino: 633, zweilous: 634, hydreigon: 635,
  larvesta: 636, volcarona: 637, cobalion: 638, terrakion: 639, virizion: 640,
  tornadus: 641, thundurus: 642, reshiram: 643, zekrom: 644, landorus: 645,
  kyurem: 646, victini: 494,
  blitzle: 522, zebstrika: 523, roggenrola: 524, boldore: 525, gigalith: 526,
  drilbur: 529, excadrill: 530, sandile: 551, krokorok: 552, krookodile: 553,
});

[
  "victini", "cobalion", "terrakion", "virizion", "tornadus", "thundurus",
  "landorus", "reshiram", "zekrom", "kyurem",
].forEach((id) => LEGENDARY_POKEMON_IDS.add(id));

Object.assign(ITEM_SPRITE, {
  scald: "tm-water",
  voltswitch: "tm-electric",
  flamecharge: "tm-fire",
  acrobatics: "tm-flying",
  dragontail: "tm-dragon",
  quiverdance: "tm-bug",
  shellsmash: "tm-normal",
  geargrind: "tm-steel",
  sacredsword: "tm-fighting",
  reflect: "tm-psychic",
  lightscreen: "tm-psychic",
  rockyhelmet: "rocky-helmet",
  airballoon: "air-balloon",
  redcard: "red-card",
  ejectbutton: "eject-button",
  normalgem: "normal-gem",
});

export const UNOVA_CARD_IDS = [...UNOVA_POKEMON, ...UNOVA_SPELLS, ...UNOVA_ITEMS].map(
  (card) => card.id,
);
