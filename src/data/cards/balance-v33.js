import { CARD_MAP } from "../cards.js";

// ============================================================
// v3.3 카드 밸런스 1차 정리
// - 후대에 진화 전 포켓몬이 추가되어 진화체가 된 카드 보정
// - 하나지방 일반 카드의 과도한 공체합 정리
// - 강한 특성 때문에 낮은 수치가 필요한 카드는 무리하게 올리지 않음
// - 1코스트 맹화 포켓몬 체력 2 보장
// - 진화체의 상시 돌진을 다른 특성으로 교체
//
// 메가진화와 하나지방 전설/환상은 이번 패치 대상에서 제외한다.
// ============================================================

function patchCard(id, changes) {
  const card = CARD_MAP[id];
  if (!card) {
    console.warn(`[balance-v33] missing card: ${id}`);
    return;
  }
  Object.assign(card, changes);
}

const PATCHES = {
  // ----------------------------------------------------------
  // 1) 후대/누락 진화 전 포켓몬 추가에 따른 진화체 보정
  // ----------------------------------------------------------
  // 캐터피 -> 단데기 -> 버터플. 수면가루가 강해 체력만 소폭 보정한다.
  butterfree: { stage: 2, atk: 4, hp: 6 },

  // 피츄 -> 피카츄 -> 라이츄
  pikachu: { atk: 3, hp: 3 },
  raichu: { atk: 7, hp: 5 },

  // 삐 -> 삐삐 -> 픽시
  clefairy: { atk: 3, hp: 4 },
  clefable: { atk: 5, hp: 7 },

  // 루리리 -> 마릴 -> 마릴리
  // 마릴은 루리리 추가 전 1코 기본체 수치를 그대로 쓰고 있었으므로
  // 1진화체에 맞게 2코스트로 올리고 공체도 함께 보정한다.
  marill: { cost: 2, atk: 3, hp: 4 },
  azumarill: { atk: 5, hp: 6 },

  // 푸푸린 -> 푸린 -> 푸크린. 자장가는 즉발 수면이라 버프 폭을 제한한다.
  jigglypuff: { atk: 2, hp: 4 },
  wigglytuff: { atk: 5, hp: 7 },

  // 먹고자 -> 잠만보 / 핑복 -> 럭키 -> 해피너스
  // 도발/치유의마음 가치가 높아 과도하게 공체를 올리지는 않는다.
  snorlax: { atk: 4, hp: 10 },
  chansey: { atk: 2, hp: 6 },

  // 마그비 -> 마그마 -> 마그마번
  magmar: { atk: 5, hp: 6 },

  // 꼬몽울 -> 로젤리아 -> 로즈레이드
  roselia: { atk: 4, hp: 5 },
  roserade: { atk: 6, hp: 7 },

  // ----------------------------------------------------------
  // 2) 하나지방 일반 카드 파워 인플레 정리
  // ----------------------------------------------------------
  audino: { atk: 3, hp: 7 },
  dwebble: { atk: 1, hp: 2 },
  crustle: { atk: 5, hp: 6 },
  escavalier: { atk: 7, hp: 6 },
  accelgor: { atk: 8, hp: 5 },
  volcarona: { atk: 8, hp: 7 },

  roggenrola: { atk: 1, hp: 2 },
  gigalith: { atk: 7, hp: 8 },
  excadrill: { atk: 8, hp: 5 },

  ferroseed: { atk: 1, hp: 4 },
  ferrothorn: { atk: 5, hp: 8 },
  cofagrigus: { atk: 4, hp: 9 },

  braviary: { atk: 7, hp: 6 },
  mandibuzz: { atk: 5, hp: 8 },
  beartic: { atk: 7, hp: 6 },
  cryogonal: { atk: 5, hp: 5 },

  druddigon: { atk: 6, hp: 5 },
  hydreigon: { atk: 10, hp: 9 },

  tirtouga: { atk: 2, hp: 3 },
  carracosta: { atk: 6, hp: 7 },

  // ----------------------------------------------------------
  // 3) 특성을 감안해도 너무 약한 카드 보정
  // ----------------------------------------------------------
  blastoise: { atk: 6, hp: 9 },
  poliwrath: { atk: 6, hp: 6 },
  typhlosion: { atk: 8, hp: 7 },
  feraligatr: { atk: 7, hp: 8 },

  // 특성이 없는 중간 진화체는 동코스트 진화체 기준까지 보정한다.
  swadloon: { atk: 3, hp: 6 },
  vanillish: { atk: 4, hp: 5 },
  zweilous: { atk: 5, hp: 4 },

  // ----------------------------------------------------------
  // 4) 1코스트 맹화 카드 정리
  // HP 1에서는 반피 조건을 정상적으로 활용하기 어려우므로 모두 1/2.
  // 아차모는 기존 2/2가 1코스트 기준으로 과해서 같이 조정한다.
  // ----------------------------------------------------------
  cyndaquil: { atk: 1, hp: 2 },
  torchic: { atk: 1, hp: 2 },
  tepig: { atk: 1, hp: 2 },
  pansear: { atk: 1, hp: 2 },

  // ----------------------------------------------------------
  // 5) 진화체의 상시 돌진 제거
  // 이미 구현된 특성 중 해당 포켓몬 역할에 맞는 것으로 교체한다.
  // ----------------------------------------------------------
  hitmonlee: { atk: 6, hp: 5, ability: "guts" },
  furret: { ability: "pickup" },
  swellow: { ability: "guts" },
  arcanine: { ability: "intimidate" },
  leafeon: { ability: "chlorophyll" },
  floatzel: { ability: "swiftswim" },
  mothim: { ability: "keeneye" },
  lopunny: { ability: "oblivious" },
};

for (const [id, changes] of Object.entries(PATCHES)) {
  patchCard(id, changes);
}
