import { CARD_MAP } from "../cards.js";
import { TRAINER_MAP } from "../trainers.js";

// ============================================================
// 무효 상성 대응용 체육관 덱 보정
//
// - 전기 관장: 땅 타입에게 기본 공격이 전부 막히는 상황을 완화
// - 노말 관장: 고스트 타입에게 기본 공격이 전부 막히는 상황을 완화
// - 고스트 관장: 노말 타입에게 기본 공격이 전부 막히는 상황을 완화
//
// 타입 정체성은 유지하고, 덱의 일부만 커버리지 카드로 구성한다.
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
// 땅 타입이 전기 공격을 무효화하더라도 자력/강철 계열 느낌의
// 아이언헤드와 전광석화로 대응할 수 있게 한다.
// ------------------------------------------------------------
setBalancedDeck("ltsurge", [
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
  "ironhead",
  "ironhead",
  "quickattack",
  "quickattack",

  "pokeball",
  "pokeball",
  "potion",
  "superball",
]);

// ------------------------------------------------------------
// 성도 - 꼭두
// 노말 중심은 유지하되 이브이 라인에서 블래키를 섞고
// 악의파동으로 고스트 타입을 직접 처리할 수 있게 한다.
// ------------------------------------------------------------
setBalancedDeck("johto_whitney", [
  "johto_whitney_miltank",

  "umbreon",
  "umbreon",
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

  "darkpulse",
  "darkpulse",

  "pokeball",
  "superball",

  "potion",
  "fullrestore",
  "lifeorb",
]);

// ------------------------------------------------------------
// 성도 - 유빈
// 고스트 중심은 유지하되 델빌 계열과 악의파동 비중을 늘려
// 노말 타입만 내는 전략에 완전히 봉쇄되지 않게 한다.
// ------------------------------------------------------------
setBalancedDeck("johto_morty", [
  "johto_morty_gengar",

  "gastly",
  "gastly",
  "haunter",
  "haunter",
  "gengar",

  "houndour",
  "houndoom",

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
  "darkpulse",
  "darkpulse",
  "darkpulse",

  "pokeball",
  "superball",

  "potion",
  "fullheal",
  "gengarite",
]);

// ------------------------------------------------------------
// 호연 - 암페어
// 전기/강철 계열 컨셉을 살려 아이언헤드 2장을 추가한다.
// 땅 타입은 여전히 유리하지만 무조건적인 완봉은 어렵게 한다.
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
  "ironhead",
  "ironhead",
  "quickattack",
  "quickattack",

  "manectite",

  "hyperball",
  "hyperball",
  "fullrestore",
  "focussash",
  "lifeorb",
]);

// ------------------------------------------------------------
// 호연 - 종길
// 이브이 라인에 블래키를 섞고 악/고스트 기술을 채용한다.
// 고스트가 노말/격투 공격을 모두 무효화하는 상황을 보완한다.
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
  "umbreon",

  "kangaskhanite",

  "snorlax",
  "snorlax",

  "tauros",
  "umbreon",

  "porygon",
  "porygon",
  "porygon2",
  "porygon2",

  "eevee",
  "eevee",

  "quickattack",
  "quickattack",
  "darkpulse",
  "darkpulse",
  "shadowball",

  "hyperball",
  "hyperball",
  "fullrestore",
  "lifeorb",
  "focussash",
]);
