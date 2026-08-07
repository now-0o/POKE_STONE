// ============================================================
// 트레이너(난이도) 데이터 - 관동 체육관 로드
// aiLevel: 1 랜덤 / 2 그리디 / 3 시너지+평가 / 4 최적화+킬각
// requires: 이 트레이너를 이기기 전엔 잠김 (해금 조건)
// 각 덱은 정확히 30장
// ============================================================

export const TRAINERS = [
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

export const TRAINER_MAP = Object.fromEntries(TRAINERS.map((t) => [t.id, t]));
