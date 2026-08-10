// ============================================================
// 트레이너(난이도) 데이터 - 관동 체육관 로드
// aiLevel: 1 랜덤 / 2 그리디 / 3 시너지+평가 / 4 최적화+킬각
// requires: 이 트레이너를 이기기 전엔 잠김 (해금 조건)
// 각 덱은 정확히 30장
// ============================================================

export const KANTO_TRAINERS = [
  {
    id: "youngster",
    name: "반바지 꼬마 오성",
    sprite: "youngster",
    title: "반바지 꼬마",
    emoji: "🩳",
    aiLevel: 1,
    reward: 30,
    hp: 30,
    requires: null,
    introLines: [
      "반바지는 편하고 좋아! 너도 그렇게 생각하지?",
      "내 포켓몬들 귀엽지? 세지는 않지만!",
    ],
    winLines: ["우와! 내가 이겼어! 반바지의 힘이야!"],
    loseLines: ["어라, 지고 있잖아?! ...졌잖아?!"],
    deck: [
      "rattata",
      "rattata",
      "raticate",
      "raticate",
      "caterpie",
      "caterpie",
      "butterfree",
      "pidgey",
      "pidgey",
      "pidgeotto",
      "spearow",
      "spearow",
      "doduo",
      "doduo",
      "eevee",
      "eevee",
      "ponyta",
      "ponyta",
      "tauros",
      "parasect",
      "chansey",
      "magikarp",
      "magikarp",
      "sentret",
      "bidoof",
      "quickattack",
      "quickattack",
      "pokeball",
      "potion",
      "potion",
    ],
  },
  {
    id: "ltsurge",
    name: "갈색시티 관장 마티스",
    sprite: "ltsurge",
    title: "체육관 관장",
    emoji: "⚡",
    aiLevel: 2,
    reward: 80,
    hp: 34,
    requires: "youngster",
    introLines: [
      "헤이 베이비! 전격전의 맛을 보여주지!",
      "전쟁에서 전기 포켓몬이 날 구해줬다구!",
    ],
    winLines: ["하하! 짜릿하게 감전됐냐, 베이비!"],
    loseLines: ["왓?! 내 일렉트릭 파워가...!"],
    signatureCard: "surge_raichu",
    deck: [
      "surge_raichu",

      "pikachu",
      "pikachu",
      "raichu",
      "magnemite",
      "magnemite",
      "magneton",
      "mareep",
      "mareep",
      "flaaffy",
      "flaaffy",
      "ampharos",
      "shinx",
      "shinx",
      "luxio",
      "luxray",
      "rotom",
      "pachirisu",
      "elekid",
      "electabuzz",

      "thunderbolt",
      "thunderbolt",
      "quickattack",
      "quickattack",
      "pokeball",
      "pokeball",
      "potion",
      "potion",
      "superball",
      "paralyzeheal",
    ],
  },
  {
    id: "sabrina",
    name: "노랑시티 관장 초련",
    sprite: "sabrina",
    title: "체육관 관장",
    emoji: "🔮",
    aiLevel: 2,
    reward: 100,
    hp: 36,
    requires: "ltsurge",
    introLines: [
      "당신이 올 것을... 3년 전부터 알고 있었어요.",
      "염동력 앞에서 힘 따위는 무의미해요.",
    ],
    winLines: ["이 결과도... 이미 예지했던 일이죠."],
    loseLines: ["예지에 없던 미래... 흥미롭네요."],
    signatureCard: "sabrina_gallade",

    deck: [
      "sabrina_gallade",

      "ralts",
      "ralts",
      "kirlia",
      "kirlia",
      "gardevoir",
      "abra",
      "abra",
      "kadabra",
      "kadabra",
      "alakazam",
      "drowzee",
      "drowzee",
      "hypno",
      "hypno",
      "natu",
      "natu",
      "xatu",
      "espeon",
      "mimejr",

      "psychic",
      "psychic",
      "shadowball",
      "quickattack",

      "pokeball",
      "pokeball",
      "potion",
      "potion",
      "superball",
      "fullheal",
    ],
  },
  {
    id: "erika",
    name: "무지개시티 관장 민화",
    sprite: "erika",
    title: "체육관 관장",
    emoji: "🌸",
    aiLevel: 3,
    reward: 120,
    hp: 38,
    requires: "sabrina",
    introLines: [
      "어머... 손님이 오셨군요. 꽃향기를 맡으며 승부할까요?",
      "풀 포켓몬의 향기는... 때로 독이 된답니다.",
    ],
    winLines: ["후훗... 꽃밭에서 잠드셨나요?"],
    loseLines: ["어머나... 꽃잎이 지고 말았네요."],
    signatureCard: "erika_bellossom",

    deck: [
      "erika_bellossom",

      "bulbasaur",
      "bulbasaur",
      "ivysaur",
      "ivysaur",
      "venusaur",

      "bellsprout",
      "bellsprout",
      "weepinbell",
      "weepinbell",
      "victreebel",

      "oddish",
      "oddish",
      "gloom",
      "gloom",
      "vileplume",

      "budew",
      "budew",
      "roserade",

      "cherubi",
      "cherubi",
      "cherrim",

      "tangela",

      "solarbeam",
      "solarbeam",
      "sunnyday",
      "sunnyday",

      "potion",
      "superball",
      "fullrestore",
    ],
  },
  {
    id: "janine",
    name: "연분홍시티 관장 도희",
    sprite: "janine",
    title: "체육관 관장",
    emoji: "☠️",
    aiLevel: 3,
    reward: 140,
    hp: 40,
    requires: "erika",
    introLines: [
      "닌자의 독은... 소리 없이 스며들지!",
      "아버지에게 물려받은 인술, 보여주겠어!",
    ],
    winLines: ["독이 온몸에 퍼졌을 거야... 후후."],
    loseLines: ["수, 수련이 부족했어...!"],
    signatureCard: "janine_venomoth",

    deck: [
      "janine_venomoth",

      "zubat",
      "zubat",
      "golbat",
      "golbat",
      "crobat",

      "skorupi",
      "skorupi",
      "drapion",
      "drapion",

      "croagunk",
      "croagunk",
      "toxicroak",
      "toxicroak",

      "stunky",
      "stunky",
      "skuntank",

      "grimer",
      "muk",
      "weezing",
      "weezing",
      "arbok",

      "darkpulse",
      "quickattack",

      "pokeball",
      "superball",
      "hyperball",

      "potion",
      "fullrestore",
      "lifeorb",
    ],
  },
  {
    id: "misty",
    name: "블루시티 관장 이슬",
    sprite: "misty",
    title: "체육관 관장",
    emoji: "💧",
    aiLevel: 3,
    reward: 160,
    hp: 42,
    requires: "janine",
    introLines: [
      "내 정책은 물 포켓몬으로 공격, 공격, 공격!",
      "전국 방방곡곡 물의 힘을 보여줄게!",
    ],
    winLines: ["이게 바로 인어의 힘이야!"],
    loseLines: ["어머... 내 물 포켓몬들이 지다니..."],
    signatureCard: "misty_starmie",

    deck: [
      "misty_starmie",

      "staryu",
      "staryu",
      "starmie",

      "politoed",
      "politoed",

      "psyduck",
      "psyduck",
      "golduck",
      "golduck",

      "buizel",
      "buizel",
      "floatzel",
      "floatzel",

      "horsea",
      "horsea",
      "seadra",
      "kingdra",

      "magikarp",
      "gyarados",

      "gastrodon",
      "lapras",

      "raindance",
      "raindance",
      "hydropump",
      "hydropump",
      "surf",

      "superball",
      "shellbell",
      "gyaradosite",
    ],
  },
  {
    id: "brock",
    name: "회색시티 관장 웅",
    sprite: "brock",
    title: "체육관 관장",
    emoji: "🪨",
    aiLevel: 4,
    reward: 180,
    hp: 44,
    requires: "misty",
    introLines: [
      "내 바위 같은 의지, 뚫을 수 있겠나!",
      "단단함이야말로 최고의 방어이자 공격이다!",
    ],
    winLines: ["바위는 흔들리지 않는다!"],
    loseLines: ["크윽... 바위가 부서지다니..."],
    signatureCard: "brock_onix",

    deck: [
      "brock_onix",

      "geodude",
      "geodude",
      "graveler",
      "graveler",
      "golem",

      "rhyhorn",
      "rhyhorn",
      "rhydon",
      "rhyperior",

      "larvitar",
      "larvitar",
      "pupitar",
      "tyranitar",

      "cranidos",
      "cranidos",
      "rampardos",

      "hippopotas",
      "hippopotas",
      "hippowdon",

      "nosepass",

      "shieldon",
      "bastiodon",

      "sandstorm",
      "sandstorm",
      "stoneedge",
      "stoneedge",
      "earthquake",

      "focussash",
      "superball",
    ],
  },
  {
    id: "blaine",
    name: "홍련섬 관장 강연",
    sprite: "blaine",
    title: "체육관 관장",
    emoji: "🔥",
    aiLevel: 4,
    reward: 200,
    hp: 46,
    requires: "brock",
    introLines: [
      "내 불꽃 퀴즈! 답은 화상뿐이다!",
      "홍련섬의 화산보다 뜨거운 승부를 원하나!",
    ],
    winLines: ["핫핫핫! 전부 타버렸군!"],
    loseLines: ["내 불꽃이... 꺼지다니..."],
    signatureCard: "blaine_camerupt",

    deck: [
      "blaine_camerupt",

      "numel",
      "numel",
      "camerupt",

      "charmander",
      "charmander",
      "charmeleon",
      "charmeleon",
      "charizard",

      "vulpix",
      "vulpix",
      "ninetales",

      "growlithe",
      "growlithe",
      "arcanine",
      "arcanine",

      "chimchar",
      "chimchar",
      "monferno",
      "infernape",

      "rapidash",

      "entei",

      "sunnyday",
      "sunnyday",
      "flamethrower",
      "flamethrower",
      "solarbeam",

      "lifeorb",
      "charizarditey",
      "hyperball",
    ],
  },
  {
    id: "blue",
    name: "상록시티 관장 그린",
    sprite: "blue",
    title: "체육관 관장",
    emoji: "😏",
    aiLevel: 4,
    reward: 250,
    hp: 50,
    requires: "blaine",
    introLines: [
      "흥, 여기까지 온 건 칭찬해주지. 하지만 나는 다르다.",
      "전 챔피언의 실력, 몸으로 느껴봐라!",
    ],
    winLines: ["이 정도였나? 아직 멀었군."],
    loseLines: ["말도 안 돼...! 다음엔 반드시...!"],
    signatureCard: "blue_pidgeot",

    deck: [
      "blue_pidgeot",

      "pidgey",
      "pidgeotto",
      "pidgeot",

      "gible",
      "gabite",
      "garchomp",

      "beldum",
      "metang",
      "metagross",

      "riolu",
      "riolu",
      "lucario",

      "togepi",
      "togetic",
      "togekiss",

      "eevee",
      "umbreon",

      "growlithe",
      "arcanine",

      "snorlax",

      "magikarp",
      "gyarados",

      "earthquake",
      "psychic",
      "hydropump",

      "fullrestore",
      "hyperball",
      "lifeorb",
      "focussash",
    ],
  },
  {
    id: "champion",
    name: "챔피언 레드",
    sprite: "red",
    title: "챔피언",
    emoji: "👑",
    aiLevel: 5,
    reward: 300,
    hp: 55,
    requires: "blue",
    introLines: [". . . . . . .", ". . . !"],
    winLines: [". . . . . . ."],
    loseLines: [". . . . . . . !"],
    signatureCard: "red_pikachu",
    startingCard: "red_pikachu",

    deck: [
      "red_pikachu",

      "charmander",
      "charmander",
      "charmeleon",
      "charmeleon",
      "charizard",
      "charizard",

      "bulbasaur",
      "bulbasaur",
      "ivysaur",
      "ivysaur",
      "venusaur",

      "gible",
      "gible",
      "gabite",
      "garchomp",

      "beldum",
      "beldum",
      "metang",
      "metagross",

      "snorlax",
      "lapras",

      "moltres",

      "charizarditey",

      "flamethrower",
      "flamethrower",
      "earthquake",
      "solarbeam",

      "hyperball",
      "fullrestore",
    ],
  },
];

// ============================================================
// 성도지방 체육관 로드
//
// 관동보다 보상이 좋은 지역이 아니라,
// 강한 AI + 강한 덱 + 안정적인 덱 흐름을 가진 고난도 지역.
//
// stableDeck / consistencyAssist는 engine에서 다음 단계에 구현.
// ============================================================

export const JOHTO_TRAINERS = [
  {
    id: "johto_falkner",
    region: "johto",
    name: "도라지시티 관장 비상",
    sprite: "falkner",
    title: "체육관 관장",
    emoji: "🪽",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.75,

    reward: 80,
    hp: 48,

    requires: null,

    introLines: [
      "새 포켓몬의 화려한 날갯짓을 보여주지!",
      "하늘을 지배하는 건 비행 포켓몬이다!",
    ],

    winLines: ["바람의 흐름을 읽지 못했군."],

    loseLines: ["내 날개가... 꺾이다니!"],

    signatureCard: "johto_falkner_pidgeotto",

    deck: [
      "johto_falkner_pidgeotto",

      "pidgey",
      "pidgey",
      "pidgeotto",
      "pidgeotto",
      "pidgeot",

      "spearow",
      "spearow",
      "fearow",
      "fearow",

      "doduo",
      "doduo",
      "dodrio",

      "hoothoot",
      "hoothoot",
      "noctowl",

      "taillow",
      "taillow",
      "swellow",

      "starly",
      "staravia",
      "staraptor",

      "quickattack",
      "quickattack",

      "pokeball",
      "pokeball",
      "superball",

      "potion",
      "potion",
      "focussash",
    ],
  },

  {
    id: "johto_bugsy",
    region: "johto",
    name: "고동마을 관장 호일",
    sprite: "bugsy",
    title: "체육관 관장",
    emoji: "🐛",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.75,

    reward: 100,
    hp: 50,

    requires: "johto_falkner",

    introLines: [
      "벌레 포켓몬이라면 누구에게도 지지 않아!",
      "내 연구의 성과를 보여줄게!",
    ],

    winLines: ["벌레 포켓몬의 힘, 이제 알겠지?"],

    loseLines: ["아직 연구가 부족했나 봐..."],

    signatureCard: "johto_bugsy_scyther",

    deck: [
      "johto_bugsy_scyther",

      "caterpie",
      "caterpie",
      "butterfree",
      "butterfree",

      "weedle",
      "weedle",
      "kakuna",
      "kakuna",
      "beedrill",
      "beedrill",

      "scyther",
      "scyther",

      "heracross",
      "heracross",
      "pinsir",

      "ledyba",
      "ledyba",
      "ledian",
      "ledian",

      "combee",
      "combee",
      "vespiquen",

      "quickattack",
      "quickattack",

      "pokeball",
      "superball",

      "potion",
      "lifeorb",
      "focussash",
    ],
  },

  {
    id: "johto_whitney",
    region: "johto",
    name: "금빛시티 관장 꼭두",
    sprite: "whitney",
    title: "체육관 관장",
    emoji: "🐮",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.78,

    reward: 120,
    hp: 52,

    requires: "johto_bugsy",

    introLines: [
      "내 귀여운 포켓몬들이 얼마나 강한지 보여줄게!",
      "금방 끝날 거야!",
    ],

    winLines: ["역시 내 포켓몬들이 최고야!"],

    loseLines: ["으아앙! 졌잖아!"],

    signatureCard: "johto_whitney_miltank",

    deck: [
      "johto_whitney_miltank",

      "rattata",
      "rattata",
      "raticate",
      "raticate",

      "eevee",
      "eevee",

      "tauros",
      "tauros",

      "chansey",
      "kangaskhan",
      "miltank",

      "sentret",
      "sentret",
      "furret",
      "furret",

      "teddiursa",
      "teddiursa",
      "ursaring",
      "ursaring",

      "buneary",
      "lopunny",
      "ambipom",

      "quickattack",
      "quickattack",

      "pokeball",
      "superball",

      "potion",
      "fullrestore",
      "lifeorb",
    ],
  },

  {
    id: "johto_morty",
    region: "johto",
    name: "인주시티 관장 유빈",
    sprite: "morty",
    title: "체육관 관장",
    emoji: "👻",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.8,

    reward: 140,
    hp: 54,

    requires: "johto_whitney",

    introLines: [
      "보이지 않는 것도 분명 존재하지.",
      "네가 어디까지 볼 수 있는지 시험해보겠어.",
    ],

    winLines: ["아직 보이지 않는 것이 많은 모양이군."],

    loseLines: ["네가 본 미래가... 더 멀리 있었군."],

    signatureCard: "johto_morty_gengar",

    deck: [
      "johto_morty_gengar",

      "gastly",
      "gastly",
      "haunter",
      "haunter",
      "gengar",

      "misdreavus",
      "misdreavus",

      "mimikyu",
      "mimikyu",

      "duskull",
      "duskull",
      "dusclops",
      "dusclops",
      "dusknoir",

      "drifloon",
      "drifloon",
      "drifblim",
      "drifblim",

      "sableye",
      "umbreon",

      "shadowball",
      "shadowball",
      "darkpulse",
      "darkpulse",

      "pokeball",
      "superball",

      "potion",
      "fullheal",
      "gengarite",
    ],
  },

  {
    id: "johto_chuck",
    region: "johto",
    name: "진청시티 관장 사도",
    sprite: "chuck",
    title: "체육관 관장",
    emoji: "🥊",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.8,

    reward: 160,
    hp: 56,

    requires: "johto_morty",

    introLines: ["포켓몬도 트레이너도 단련이 전부다!", "자, 정면승부다!"],

    winLines: ["수련이 부족하군!"],

    loseLines: ["좋은 주먹이었다!"],

    signatureCard: "johto_chuck_poliwrath",

    deck: [
      "johto_chuck_poliwrath",

      "machop",
      "machop",
      "machoke",
      "machoke",
      "machamp",

      "mankey",
      "mankey",
      "primeape",
      "primeape",

      "hitmonlee",
      "hitmonlee",
      "hitmonchan",
      "hitmonchan",

      "makuhita",
      "makuhita",
      "hariyama",
      "hariyama",

      "meditite",
      "meditite",
      "medicham",

      "riolu",
      "riolu",
      "lucario",

      "quickattack",
      "quickattack",

      "superball",
      "hyperball",

      "lifeorb",
      "focussash",
    ],
  },

  {
    id: "johto_jasmine",
    region: "johto",
    name: "담청시티 관장 규리",
    sprite: "jasmine",
    title: "체육관 관장",
    emoji: "⚙️",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.82,

    reward: 180,
    hp: 58,

    requires: "johto_chuck",

    introLines: [
      "강철 포켓몬은 아주 단단해요.",
      "쉽게 무너지지는 않을 거예요.",
    ],

    winLines: ["강철의 힘이 버텨냈군요."],

    loseLines: ["강철보다 강한 마음이군요."],

    signatureCard: "johto_jasmine_steelix",

    deck: [
      "johto_jasmine_steelix",

      "beldum",
      "beldum",
      "metang",
      "metang",
      "metagross",

      "bronzor",
      "bronzor",
      "bronzong",
      "bronzong",

      "shieldon",
      "shieldon",
      "bastiodon",
      "bastiodon",

      "rookidee",
      "rookidee",
      "corvisquire",
      "corviknight",

      "scyther",
      "scizor",

      "magnemite",
      "magneton",
      "magnezone",

      "earthquake",
      "earthquake",

      "superball",
      "hyperball",

      "potion",
      "fullrestore",
      "focussash",
    ],
  },

  {
    id: "johto_pryce",
    region: "johto",
    name: "황토마을 관장 류옹",
    sprite: "pryce",
    title: "체육관 관장",
    emoji: "❄️",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.85,

    reward: 200,
    hp: 60,

    requires: "johto_jasmine",

    introLines: [
      "긴 세월을 함께한 포켓몬의 힘을 보여주마.",
      "차가운 얼음은 쉽게 녹지 않는다.",
    ],

    winLines: ["경험의 차이를 느꼈겠지."],

    loseLines: ["훌륭하구나. 젊은 힘도 무시할 수 없군."],

    signatureCard: "johto_pryce_mamoswine",

    deck: [
      "johto_pryce_mamoswine",

      "swinub",
      "swinub",
      "piloswine",
      "piloswine",

      "seel",
      "seel",
      "dewgong",
      "dewgong",

      "shellder",
      "shellder",
      "cloyster",
      "cloyster",

      "snorunt",
      "snorunt",
      "glalie",
      "glalie",

      "snover",
      "snover",
      "abomasnow",
      "abomasnow",

      "eevee",
      "eevee",
      "glaceon",
      "glaceon",

      "icebeam",
      "icebeam",

      "superball",
      "hyperball",
      "iceheal",
    ],
  },

  {
    id: "johto_clair",
    region: "johto",
    name: "검은먹시티 관장 이향",
    sprite: "clair",
    title: "체육관 관장",
    emoji: "🐉",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.88,

    reward: 250,
    hp: 62,

    requires: "johto_pryce",

    introLines: [
      "드래곤 포켓몬을 상대할 각오는 되어 있겠지?",
      "여기까지 온 실력이 진짜인지 확인해주겠어.",
    ],

    winLines: ["역시 아직 나를 넘기엔 부족해."],

    loseLines: ["내가... 졌다고?"],

    signatureCard: "johto_clair_kingdra",

    deck: [
      "johto_clair_kingdra",

      "dratini",
      "dratini",
      "dragonair",
      "dragonair",
      "dragonite",

      "swablu",
      "swablu",
      "altaria",
      "altaria",

      "bagon",
      "bagon",
      "shelgon",
      "shelgon",
      "salamence",

      "gible",
      "gible",
      "gabite",
      "gabite",
      "garchomp",

      "horsea",
      "horsea",
      "seadra",
      "seadra",
      "kingdra",

      "hydropump",
      "earthquake",

      "superball",
      "hyperball",
      "focussash",
    ],
  },

  {
    id: "johto_lance",
    region: "johto",
    name: "챔피언 목호",
    sprite: "lance",
    title: "챔피언",
    emoji: "🐲",

    aiLevel: 5,
    stableDeck: true,
    consistencyAssist: 0.9,

    reward: 300,
    hp: 65,

    requires: "johto_clair",

    introLines: [
      "여기까지 올라온 것을 환영한다.",
      "최강의 드래곤 포켓몬들과 상대해보도록 하지.",
    ],

    winLines: ["강함만으로 챔피언을 넘을 수는 없다."],

    loseLines: ["훌륭하다. 네가 새로운 강자군."],

    signatureCards: [
      "johto_lance_dragonite_thunder",
      "johto_lance_dragonite_extremespeed",
      "johto_lance_dragonite_outrage",
    ],

    deck: [
      "johto_lance_dragonite_thunder",
      "johto_lance_dragonite_extremespeed",
      "johto_lance_dragonite_outrage",

      "dratini",
      "dratini",
      "dratini",

      "dragonair",
      "dragonair",
      "dragonite",

      "bagon",
      "bagon",
      "shelgon",
      "shelgon",
      "salamence",

      "gible",
      "gible",
      "gabite",
      "gabite",
      "garchomp",

      "swablu",
      "swablu",
      "altaria",

      "latias",

      "earthquake",
      "hydropump",
      "flamethrower",

      "hyperball",
      "hyperball",
      "fullrestore",
      "focussash",
    ],
  },
];

// ============================================================
// 호연지방 체육관 로드
//
// 성도 클리어 이후 최상위 지역
// Lv6 AI + stableDeck + 높은 덱 안정성
// 메가진화 / 전설 / 강력한 시그니처 적극 사용
// ============================================================

export const HOENN_TRAINERS = [
  {
    id: "hoenn_roxanne",
    region: "hoenn",
    name: "금탄체육관 관장 원규",
    sprite: "roxanne",
    title: "체육관 관장",
    emoji: "🪨",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.92,

    reward: 200,
    hp: 68,

    requires: null,

    introLines: ["바위처럼 단단한 전략을 보여드리겠습니다!"],
    winLines: ["아직 호연의 싸움에 익숙하지 않은 것 같군요."],
    loseLines: ["훌륭합니다. 하지만 이제 시작이에요."],

    signatureCard: "hoenn_roxanne_nosepass",

    deck: [
      "hoenn_roxanne_nosepass",

      "geodude",
      "geodude",
      "graveler",
      "graveler",
      "golem",
      "golem",

      "nosepass",
      "nosepass",

      "aron",
      "aron",
      "lairon",
      "lairon",
      "aggron",
      "aggron",

      "regirock",

      "aggronite",

      "stoneedge",
      "stoneedge",
      "earthquake",
      "earthquake",
      "sandstorm",
      "sandstorm",

      "hyperball",
      "hyperball",
      "fullrestore",
      "focussash",
      "lifeorb",
      "superball",
      "superball",
    ],
  },

  {
    id: "hoenn_brawly",
    region: "hoenn",
    name: "무로체육관 관장 철구",
    sprite: "brawly",
    title: "체육관 관장",
    emoji: "🥊",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.93,

    reward: 220,
    hp: 70,

    requires: "hoenn_roxanne",

    introLines: ["큰 파도처럼 한 번에 밀어붙여주지!"],
    winLines: ["아직 파도를 타는 법을 모르는군!"],
    loseLines: ["이런 파도는 처음인데!"],

    signatureCard: "hoenn_brawly_hariyama",

    deck: [
      "hoenn_brawly_hariyama",

      "makuhita",
      "makuhita",
      "hariyama",
      "hariyama",

      "meditite",
      "meditite",
      "medicham",
      "medicham",

      "shroomish",
      "shroomish",
      "breloom",
      "breloom",

      "torchic",
      "torchic",
      "combusken",
      "combusken",
      "blaziken",
      "blaziken",

      "blazikenite",

      "riolu",
      "riolu",
      "lucario",
      "lucario",

      "infight",
      "infight",

      "hyperball",
      "hyperball",
      "fullrestore",
      "lifeorb",
    ],
  },

  {
    id: "hoenn_wattson",
    region: "hoenn",
    name: "보라체육관 관장 암페어",
    sprite: "wattson",
    title: "체육관 관장",
    emoji: "⚡",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.94,

    reward: 240,
    hp: 72,

    requires: "hoenn_brawly",

    introLines: ["왓핫하! 전기로 전부 날려버리겠네!"],
    winLines: ["왓핫하! 제대로 감전됐구먼!"],
    loseLines: ["왓핫하! 정말 대단한 승부였네!"],

    signatureCard: "hoenn_wattson_manectric",

    deck: [
      "hoenn_wattson_manectric",

      "electrike",
      "electrike",
      "manectric",
      "manectric",

      "mareep",
      "mareep",
      "flaaffy",
      "flaaffy",
      "ampharos",
      "ampharos",

      "magnemite",
      "magnemite",
      "magneton",
      "magneton",
      "magnezone",
      "magnezone",

      "raikou",

      "thunderbolt",
      "thunderbolt",

      "manectite",

      "hyperball",
      "hyperball",
      "fullrestore",
      "focussash",

      "quickattack",
      "quickattack",

      "superball",
      "superball",
      "lifeorb",
    ],
  },

  {
    id: "hoenn_flannery",
    region: "hoenn",
    name: "용암체육관 관장 민지",
    sprite: "flannery",
    title: "체육관 관장",
    emoji: "🔥",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.94,

    reward: 260,
    hp: 74,

    requires: "hoenn_wattson",

    introLines: ["불타오르는 승부를 보여주겠어!"],
    winLines: ["이게 용암체육관의 뜨거움이야!"],
    loseLines: ["너무 뜨거워서 내가 먼저 타버렸네..."],

    signatureCard: "hoenn_flannery_camerupt",

    deck: [
      "hoenn_flannery_camerupt",

      "numel",
      "numel",
      "camerupt",
      "camerupt",

      "torchic",
      "torchic",
      "combusken",
      "combusken",
      "blaziken",
      "blaziken",

      "blazikenite",

      "vulpix",
      "vulpix",
      "ninetales",
      "ninetales",

      "ponyta",
      "ponyta",
      "rapidash",
      "rapidash",

      "groudon",

      "flamethrower",
      "flamethrower",
      "sunnyday",
      "sunnyday",
      "earthquake",

      "hyperball",
      "hyperball",
      "fullrestore",
      "lifeorb",
    ],
  },

  {
    id: "hoenn_norman",
    region: "hoenn",
    name: "등화체육관 관장 종길",
    sprite: "norman",
    title: "체육관 관장",
    emoji: "🦥",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.95,

    reward: 280,
    hp: 76,

    requires: "hoenn_flannery",

    introLines: ["여기까지 왔다면 실력으로 증명해봐라."],
    winLines: ["강함에는 아직 더 배울 것이 있다."],
    loseLines: ["훌륭하군. 네 실력을 인정하마."],

    signatureCard: "hoenn_norman_slaking",

    deck: [
      "hoenn_norman_slaking",

      "slakoth",
      "slakoth",
      "vigoroth",
      "vigoroth",
      "slaking",
      "slaking",

      "kangaskhan",
      "kangaskhan",

      "kangaskhanite",

      "snorlax",
      "snorlax",

      "tauros",
      "tauros",

      "porygon",
      "porygon",
      "porygon2",
      "porygon2",

      "eevee",
      "eevee",

      "quickattack",
      "quickattack",
      "infight",
      "infight",

      "hyperball",
      "hyperball",

      "fullrestore",
      "fullrestore",
      "lifeorb",
      "focussash",
    ],
  },

  {
    id: "hoenn_winona",
    region: "hoenn",
    name: "검방울체육관 관장 은송",
    sprite: "winona",
    title: "체육관 관장",
    emoji: "🪽",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.95,

    reward: 300,
    hp: 78,

    requires: "hoenn_norman",

    introLines: ["하늘을 지배하는 포켓몬의 아름다움을 보여드리죠."],
    winLines: ["하늘에서 내려다보면 승부의 흐름이 보인답니다."],
    loseLines: ["당신은 제 예상보다 더 높이 날았군요."],

    signatureCard: "hoenn_winona_altaria",

    deck: [
      "hoenn_winona_altaria",

      "swablu",
      "swablu",
      "altaria",
      "altaria",

      "bagon",
      "bagon",
      "shelgon",
      "shelgon",
      "salamence",
      "salamence",

      "salamencite",

      "taillow",
      "taillow",
      "swellow",
      "swellow",

      "wingull",
      "wingull",
      "pelipper",
      "pelipper",

      "skarmory",
      "skarmory",

      "latias",

      "dragonclaw",
      "dragonclaw",

      "hyperball",
      "hyperball",
      "fullrestore",
      "focussash",
      "lifeorb",
    ],
  },

  {
    id: "hoenn_tate_liza",
    region: "hoenn",
    name: "이끼체육관 관장 풍&란",
    sprite: "tateandliza-gen3",
    title: "체육관 관장",
    emoji: "🔮",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.96,

    reward: 320,
    hp: 80,

    requires: "hoenn_winona",

    introLines: [
      "우리 둘의 마음은 하나!",
      "생각하지 않아도 서로의 움직임을 알 수 있어!",
    ],
    winLines: ["우리의 호흡을 깨뜨리긴 어려울걸!"],
    loseLines: ["우리 둘의 마음을... 읽은 거야?"],

    signatureCards: ["hoenn_tate_solrock", "hoenn_liza_lunatone"],

    deck: [
      "hoenn_tate_solrock",
      "hoenn_liza_lunatone",

      "lunatone",
      "lunatone",

      "ralts",
      "ralts",
      "kirlia",
      "kirlia",
      "gardevoir",
      "gardevoir",

      "gardevoirite",

      "natu",
      "natu",
      "xatu",
      "xatu",

      "bronzor",
      "bronzor",
      "bronzong",
      "bronzong",

      "jirachi",
      "deoxys",

      "psychic",
      "psychic",
      "stoneedge",
      "moonblast",

      "hyperball",
      "hyperball",
      "fullrestore",
      "focussash",
      "lifeorb",
    ],
  },

  {
    id: "hoenn_wallace",
    region: "hoenn",
    name: "루네체육관 관장 윤진",
    sprite: "wallace",
    title: "체육관 관장",
    emoji: "🌊",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.97,

    reward: 340,
    hp: 82,

    requires: "hoenn_tate_liza",

    introLines: ["물의 아름다움과 강함을 동시에 보여드리죠."],
    winLines: ["아름다운 승부였습니다."],
    loseLines: ["당신의 승리가 더욱 아름답군요."],

    signatureCard: "hoenn_wallace_milotic",

    deck: [
      "hoenn_wallace_milotic",

      "feebas",
      "feebas",
      "milotic",
      "milotic",

      "mudkip",
      "mudkip",
      "marshtomp",
      "marshtomp",
      "swampert",
      "swampert",

      "swampertite",

      "lotad",
      "lotad",
      "lombre",
      "lombre",
      "ludicolo",
      "ludicolo",

      "wailmer",
      "wailmer",
      "wailord",
      "wailord",

      "kyogre",

      "raindance",
      "raindance",
      "surf",
      "surf",

      "hyperball",
      "fullrestore",
      "shellbell",
    ],
  },

  {
    id: "hoenn_juan",
    region: "hoenn",
    name: "루네체육관 관장 아단",
    sprite: "juan",
    title: "체육관 관장",
    emoji: "💧",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.97,

    reward: 360,
    hp: 84,

    requires: "hoenn_wallace",

    introLines: ["루네의 물은 깊고도 아름답지. 그 깊이를 견뎌보게."],
    winLines: ["아직 물의 흐름을 완전히 읽지는 못했군."],
    loseLines: ["훌륭하군! 참으로 우아한 승리일세."],

    signatureCard: "hoenn_juan_kingdra",

    deck: [
      "hoenn_juan_kingdra",

      "horsea",
      "horsea",
      "seadra",
      "seadra",
      "kingdra",
      "kingdra",

      "magikarp",
      "magikarp",
      "gyarados",
      "gyarados",

      "gyaradosite",

      "wingull",
      "wingull",
      "pelipper",
      "pelipper",

      "feebas",
      "feebas",
      "milotic",
      "milotic",

      "lapras",
      "lapras",

      "latios",

      "raindance",
      "raindance",
      "hydropump",
      "hydropump",
      "surf",

      "hyperball",
      "fullrestore",
    ],
  },

  {
    id: "hoenn_steven",
    region: "hoenn",
    name: "챔피언 성호",
    sprite: "steven",
    title: "챔피언",
    emoji: "💎",

    aiLevel: 6,
    stableDeck: true,
    consistencyAssist: 0.98,

    reward: 400,
    hp: 90,

    requires: "hoenn_juan",

    introLines: [
      "여기까지 온 트레이너라면 설명은 필요 없겠지.",
      "나와 내 포켓몬들의 모든 힘을 보여주겠다.",
    ],
    winLines: ["좋은 승부였다. 다시 도전해주길 기다리지."],
    loseLines: ["훌륭하다. 네가 호연의 새로운 최강자다."],

    signatureCard: "hoenn_steven_metagross",

    deck: [
      "hoenn_steven_metagross",
      "hoenn_steven_metagrossite",

      "beldum",
      "beldum",
      "metang",
      "metang",
      "metagross",
      "metagross",

      "aron",
      "aron",
      "lairon",
      "lairon",
      "aggron",
      "aggron",

      "mawile",
      "mawile",

      "skarmory",
      "skarmory",

      "registeel",
      "jirachi",

      "ironhead",
      "ironhead",
      "psychic",
      "psychic",
      "earthquake",

      "hyperball",
      "hyperball",
      "fullrestore",
      "focussash",
      "lifeorb",
    ],
  },
];

// ============================================================
// 지역별 트레이너
// ============================================================

export const TRAINERS_BY_REGION = {
  kanto: KANTO_TRAINERS,
  johto: JOHTO_TRAINERS,
  hoenn: HOENN_TRAINERS,
};

export const TRAINERS = [
  ...KANTO_TRAINERS,
  ...JOHTO_TRAINERS,
  ...HOENN_TRAINERS,
];

export const TRAINER_MAP = Object.fromEntries(TRAINERS.map((t) => [t.id, t]));
