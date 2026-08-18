import { CARD_MAP } from "../cards.js";
import { TRAINER_MAP } from "../trainers.js";

// ============================================================
// 무효 상성 대응용 체육관 덱 보정
//
// - 전기 관장: 땅 타입에게 기본 공격이 전부 막히는 상황을 완화
// - 노말 관장: 고스트 타입에게 기본 공격이 전부 막히는 상황을 완화
// - 고스트 관장: 노말 타입에게 기본 공격이 전부 막히는 상황을 완화
//
// 타입 정체성은 유지하되, 각 덱의 약 1/3(10장)을
// 무효 상성을 뚫을 수 있는 포켓몬/기술 카드로 구성한다.
// ============================================================

function setBalancedDeck(trainerId, deck) {
  const trainer = TRAINER_MAP[trainerId];

  if (!trainer) {
    throw new Error(`[trainer-balance] 트레이너를 찾을 수 없음: ${trainerId}`);
  }

  if (deck.length !== 30) {
    throw new Error(
      `[trainer-balance] ${trainerId} 덱이 30장이 아님: ${deck.length}장`,
    );
  }

  const missingCards = [...new Set(deck.filter((cardId) => !CARD_MAP[cardId]))];
  if (missingCards.length > 0) {
    throw new Error(
      `[trainer-balance] ${trainerId}에 존재하지 않는 카드가 있음: ${missingCards.join(", ")}`,
    );
  }

  trainer.deck = deck;
}

// ------------------------------------------------------------
// 관동 - 마티스
// 카운터 10장:
// 자포코일 x2 + 아이언헤드 x2 + 전광석화 x2 + 섀도볼 x2 + 파괴광선 x2
// 전기 타입 중심은 유지하면서 땅 타입만으로 완봉하는 플레이를 방지한다.
// ------------------------------------------------------------
setBalancedDeck("ltsurge", [
  "surge_raichu",

  "pikachu",
  "pikachu",
  "raichu",

  "magnemite",
  "magnemite",
  "magneton",
  "magneton",

  "mareep",
  "mareep",
  "flaaffy",
  "ampharos",

  "shinx",
  "luxio",
  "luxray",
  "rotom",
  "electabuzz",

  // 땅 타입 대응 10장
  "magnezone",
  "magnezone",
  "ironhead",
  "ironhead",
  "quickattack",
  "quickattack",
  "shadowball",
  "shadowball",
  "hyperbeam",
  "hyperbeam",

  "pokeball",
  "potion",
  "superball",
]);

// ------------------------------------------------------------
// 성도 - 꼭두
// 카운터 10장:
// 블래키 x2 + 델빌 x2 + 헬가 x2 + 악의파동 x2 + 섀도볼 x2
// 노말 덱의 정체성은 유지하면서 고스트 단일 전략에 대응한다.
// ------------------------------------------------------------
setBalancedDeck("johto_whitney", [
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
  "furret",
  "teddiursa",
  "ursaring",
  "ambipom",

  // 고스트 타입 대응 10장
  "umbreon",
  "umbreon",
  "houndour",
  "houndour",
  "houndoom",
  "houndoom",
  "darkpulse",
  "darkpulse",
  "shadowball",
  "shadowball",

  "pokeball",
  "superball",
  "fullrestore",
]);

// ------------------------------------------------------------
// 성도 - 유빈
// 카운터 10장:
// 델빌 x2 + 헬가 x2 + 깜까미 + 블래키 + 악의파동 x4
// 고스트 중심은 유지하되 노말 타입을 상대로 공격 수단이 꾸준히 잡히게 한다.
// ------------------------------------------------------------
setBalancedDeck("johto_morty", [
  "johto_morty_gengar",

  "gastly",
  "gastly",
  "haunter",
  "haunter",
  "gengar",

  "mimikyu",
  "mimikyu",

  "duskull",
  "duskull",
  "dusclops",
  "dusclops",
  "dusknoir",

  "drifloon",
  "drifblim",
  "misdreavus",

  // 노말 타입 대응 10장
  "houndour",
  "houndour",
  "houndoom",
  "houndoom",
  "sableye",
  "umbreon",
  "darkpulse",
  "darkpulse",
  "darkpulse",
  "darkpulse",

  "shadowball",
  "pokeball",
  "fullheal",
  "gengarite",
]);

// ------------------------------------------------------------
// 호연 - 암페어
// 카운터 10장:
// 자포코일 x2 + 아이언헤드 x2 + 전광석화 x2 + 섀도볼 x2 + 파괴광선 x2
// 전기/강철 계열 컨셉을 살리면서 땅 타입의 완전 봉쇄를 막는다.
// ------------------------------------------------------------
setBalancedDeck("hoenn_wattson", [
  "hoenn_wattson_manectric",

  "electrike",
  "electrike",
  "manectric",
  "manectric",

  "mareep",
  "mareep",
  "flaaffy",
  "ampharos",

  "magnemite",
  "magnemite",
  "magneton",
  "magneton",

  "raikou",

  "thunderbolt",
  "thunderbolt",

  "manectite",
  "hyperball",
  "hyperball",
  "fullrestore",

  // 땅 타입 대응 10장
  "magnezone",
  "magnezone",
  "ironhead",
  "ironhead",
  "quickattack",
  "quickattack",
  "shadowball",
  "shadowball",
  "hyperbeam",
  "hyperbeam",
]);

// ------------------------------------------------------------
// 호연 - 종길
// 카운터 10장:
// 블래키 x2 + 델빌 x2 + 헬가 x2 + 악의파동 x3 + 섀도볼 x1
// 노말/격투 공격을 모두 무효화하는 고스트 타입을 확실히 견제한다.
// ------------------------------------------------------------
setBalancedDeck("hoenn_norman", [
  "hoenn_norman_slaking",

  "slakoth",
  "slakoth",
  "vigoroth",
  "vigoroth",
  "slaking",
  "slaking",

  "kangaskhan",
  "kangaskhanite",

  "snorlax",
  "snorlax",

  "tauros",
  "tauros",

  "porygon",
  "porygon2",

  "eevee",
  "eevee",

  "quickattack",
  "hyperball",
  "fullrestore",

  // 고스트 타입 대응 10장
  "umbreon",
  "umbreon",
  "houndour",
  "houndour",
  "houndoom",
  "houndoom",
  "darkpulse",
  "darkpulse",
  "darkpulse",
  "shadowball",
]);