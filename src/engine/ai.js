// ============================================================
// AI: 트레이너 난이도별 행동 결정
// 1 랜덤 / 2 그리디 / 3 시너지 / 4 최적화 / 5 최종보스 / 6 호연 마스터
// ============================================================
import { CARD_MAP } from "../data/cards.js";
import {
  playCard,
  attack,
  endTurn,
  canPlayCard,
  canAttack,
  validAttackTargets,
  effectiveAtk,
  effectiveCost,
  calcTypedDamage,
  typeMult,
  spellDamageAmount,
  spellNeedsTarget,
  resolveMoldbreaker,
  resolveMew,
  discardToDraw,
} from "./engine.js";

const SIDE = "enemy";
const RARITY_VALUE = { C: 0, R: 3, E: 7, L: 13 };

function rand(arr) {
  return arr?.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

function unitValue(u, game) {
  if (!u) return 0;

  let v = effectiveAtk(u, game) * 2 + u.hp + u.maxHp * 0.5;

  v += RARITY_VALUE[u.rarity] || 0;
  v += (u.stage || 0) * 2;

  if (u.ability === "taunt" || u.ability === "fortress") v += 7;
  if (u.ability === "moxie" || u.ability === "roughskin") v += 4;
  if (u.ability === "sturdy" || u.ability === "disguise") v += 3;
  if (u.mega) v += 7;
  if (u.item) v += 3;

  return v;
}

function statusDanger(status) {
  if (status === "ice") return 12;
  if (status === "sleep") return 10;
  if (status === "para") return 7;
  if (status === "burn") return 7;
  if (status === "poison") return 6;
  return 0;
}

// 옹골참 / 따라큐 탈 / 기합의띠 때문에
// 표시 피해상 죽어도 실제론 안 죽는 경우 체크
function protectedFromLethal(u, dmg) {
  if (!u || dmg < u.hp) return false;

  if (u.ability === "sturdy" && u.maxHp > 1 && u.hp === u.maxHp) {
    return true;
  }

  if (u.ability === "disguise" && !u.sturdyUsed) {
    return true;
  }

  if (u.item === "focussash" && !u.focusSashUsed && u.hp === u.maxHp) {
    return true;
  }

  return false;
}

function actuallyKills(u, dmg) {
  return dmg >= u.hp && !protectedFromLethal(u, dmg);
}

// ============================================================
// 성도 AI 전용 계산
// ============================================================

function hasAbility(unit, ability) {
  return (
    unit?.ability === ability ||
    unit?.secondaryAbility === ability
  );
}

function isJohtoAI(game) {
  return !!game.trainer?.stableDeck;
}

function typedDamageAgainstUnit(
  base,
  attackType,
  defender,
) {
  let mult =
    typeMult(
      attackType,
      defender.type,
    );

  // 이향의 킹드라 - 용의파동
  // 약점 추가 피해 무효
  if (
    hasAbility(
      defender,
      "clair_dragonpulse",
    ) &&
    mult > 1
  ) {
    mult = 1;
  }

  if (mult === 0) {
    return 0;
  }

  if (mult > 1) {
    return Math.ceil(
      base * mult,
    );
  }

  if (mult < 1) {
    return Math.max(
      1,
      Math.floor(
        base * mult,
      ),
    );
  }

  return base;
}

function johtoAttackDamage(
  attacker,
  defender,
  game,
) {
  let base =
    effectiveAtk(
      attacker,
      game,
    );

  // 목호 - 역린
  // 실제 공격 직전에 공격력 +2
  if (
    hasAbility(
      attacker,
      "lance_outrage",
    )
  ) {
    base += 2;
  }

  let dmg =
    typedDamageAgainstUnit(
      base,
      attacker.type,
      defender,
    );

  // 대박찬스 기존 처리
  if (
    attacker.ability ===
    "bigchance"
  ) {
    dmg =
      Math.ceil(
        dmg * 1.5,
      );
  }

  // 꼭두 - 구르기
  if (
    dmg > 0 &&
    hasAbility(
      attacker,
      "whitney_rollout",
    )
  ) {
    dmg +=
      attacker._rolloutStacks ||
      0;
  }

  // 류옹 - 얼음뭉치
  if (
    dmg > 0 &&
    hasAbility(
      attacker,
      "pryce_iceshard",
    ) &&
    defender.status === "ice"
  ) {
    dmg += 2;
  }

  return dmg;
}

function johtoCounterDamage(
  attacker,
  defender,
  game,
) {
  // 목호 - 신속
  // 소환된 턴 첫 공격은
  // 일반 전투 반격을 받지 않음
  if (
    hasAbility(
      attacker,
      "lance_extremespeed",
    ) &&
    attacker.summonedTurn ===
      game.turnCount &&
    !attacker._extremeSpeedGuardUsed
  ) {
    return 0;
  }

  return typedDamageAgainstUnit(
    effectiveAtk(
      defender,
      game,
    ),
    defender.type,
    attacker,
  );
}

function johtoFaceDamage(
  attacker,
  game,
) {
  let dmg =
    effectiveAtk(
      attacker,
      game,
    );

  // 역린
  if (
    hasAbility(
      attacker,
      "lance_outrage",
    )
  ) {
    dmg += 2;
  }

  // 구르기
  if (
    hasAbility(
      attacker,
      "whitney_rollout",
    )
  ) {
    dmg +=
      attacker._rolloutStacks ||
      0;
  }

  // 이향 킹드라는 공격 후
  // 상대 트레이너에게 추가 피해 1
  if (
    hasAbility(
      attacker,
      "clair_dragonpulse",
    )
  ) {
    dmg += 1;
  }

  return dmg;
}

function playableCards(game) {
  const p = game.players[SIDE];
  const list = [];

  p.hand.forEach((h, idx) => {
    if (!canPlayCard(game, SIDE, idx)) return;

    const card = CARD_MAP[h.cardId];

    if (card) {
      list.push({ idx, card });
    }
  });

  return list;
}

function readyAttackers(game) {
  return game.players[SIDE].field.filter((u) => canAttack(game, SIDE, u.uid));
}

function availableFaceDamage(game) {
  return readyAttackers(game)
    .filter(
      (u) =>
        validAttackTargets(
          game,
          SIDE,
          u.uid,
        ).hero,
    )
    .reduce(
      (sum, u) =>
        sum +
        (
          isJohtoAI(game)
            ? johtoFaceDamage(
                u,
                game,
              )
            : effectiveAtk(
                u,
                game,
              )
        ),
      0,
    );
}

// 지금 공격 가능한 포켓몬들만으로 상대 본체를 끝낼 수 있는지
function immediateLethal(game) {
  const foe =
    game.players.player;

  const damageOf = (u) =>
    isJohtoAI(game)
      ? johtoFaceDamage(
          u,
          game,
        )
      : effectiveAtk(
          u,
          game,
        );

  const attackers =
    readyAttackers(game)
      .filter(
        (u) =>
          validAttackTargets(
            game,
            SIDE,
            u.uid,
          ).hero,
      )
      .sort(
        (a, b) =>
          damageOf(b) -
          damageOf(a),
      );

  if (!attackers.length) {
    return null;
  }

  const total =
    attackers.reduce(
      (sum, u) =>
        sum + damageOf(u),
      0,
    );

  if (total < foe.hp) {
    return null;
  }

  return {
    attacker: attackers[0],
    target: {
      uid: "hero",
    },
  };
}

// ============================================================
// 아군 타겟 선택
// ============================================================
function pickFriendlyTarget(game, card, level) {
  const me = game.players[SIDE];

  // ---------- 도구 ----------
  if (card.kind === "item") {
    const candidates = me.field.filter((u) => !u.item);

    if (!candidates.length) return null;

    const effect = card.item?.effect;

    candidates.sort((a, b) => {
      const score = (u) => {
        let s = unitValue(u, game);

        // 생명의구슬 -> 공격력 높은 포켓몬
        if (effect === "lifeorb") {
          s += effectiveAtk(u, game) * 4;

          if (u.hp <= 2) {
            s -= 20;
          }
        }

        // 기합의띠 -> 풀피 + 강한 포켓몬
        if (effect === "focussash") {
          if (u.hp === u.maxHp) {
            s += effectiveAtk(u, game) * 3;
          } else {
            s -= 30;
          }

          // 이미 생존기가 있으면 낭비
          if (u.ability === "sturdy" || u.ability === "disguise") {
            s -= 25;
          }
        }

        // 조개껍질방울 -> 공격력 높고 체력 깎인 포켓몬
        if (effect === "shellbell") {
          s += effectiveAtk(u, game) * 2;
          s += u.maxHp - u.hp;
        }

        return s;
      };

      return score(b) - score(a);
    });

    return {
      uid: candidates[0].uid,
    };
  }

  const s = card.spell;

  // ---------- 상태이상 치료 ----------
  if (s?.effect === "cure_status" || s?.effect === "cure_all_status") {
    let candidates = me.field.filter((u) => u.status !== null);

    if (s.effect === "cure_status") {
      candidates = candidates.filter((u) => u.status === s.statusType);
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const av = statusDanger(a.status) + unitValue(a, game) * 0.4;

      const bv = statusDanger(b.status) + unitValue(b, game) * 0.4;

      return bv - av;
    });

    return {
      uid: candidates[0].uid,
    };
  }

  // ---------- 회복 ----------
  if (s?.effect === "heal" || s?.effect === "fullheal") {
    const options = [];

    // 트레이너 본체 회복
    if (me.hp < me.maxHp) {
      let score = (me.maxHp - me.hp) * 6;

      if (level >= 4 && me.hp <= 12) {
        score += 20;
      }

      if (level >= 5 && me.hp <= 8) {
        score += 30;
      }

      options.push({
        target: { uid: "hero" },
        score,
      });
    }

    // 포켓몬 회복
    me.field.forEach((u) => {
      if (u.hp >= u.maxHp && !u.status) {
        return;
      }

      let score = (u.maxHp - u.hp) * 6 + unitValue(u, game) * 0.35;

      if (s.effect === "fullheal" && u.status) {
        score += statusDanger(u.status);
      }

      options.push({
        target: { uid: u.uid },
        score,
      });
    });

    if (!options.length) return null;

    options.sort((a, b) => b.score - a.score);

    return options[0].target;
  }

  // 기타 아군 지정 기술
  const candidates = [...me.field].sort(
    (a, b) => unitValue(b, game) - unitValue(a, game),
  );

  return candidates.length ? { uid: candidates[0].uid } : null;
}

// ============================================================
// 카드 타겟 선택
// ============================================================
function pickSpellTarget(game, card, level) {
  const foe = game.players.player;
  const me = game.players[SIDE];

  const need = spellNeedsTarget(card);

  // ---------- 적 대상 ----------
  if (need === "enemy") {
    const base = spellDamageAmount(card, game);

    // 본체 킬
    if (foe.hp <= base) {
      return { uid: "hero" };
    }

    // Lv1 랜덤
    if (level <= 1) {
      return rand([
        ...foe.field.map((u) => ({
          uid: u.uid,
        })),
        { uid: "hero" },
      ]);
    }

    // 죽일 수 있는 포켓몬 중 가장 가치 높은 대상
    const killable = foe.field
      .map((u) => ({
        u,
        dmg: calcTypedDamage(base, card.moveType, u.type),
      }))
      .filter((x) => actuallyKills(x.u, x.dmg))
      .sort((a, b) => unitValue(b.u, game) - unitValue(a.u, game));

    if (killable.length) {
      return {
        uid: killable[0].u.uid,
      };
    }

    // Lv3 이상이면 가장 위험한 포켓몬 공격
    if (level >= 3 && foe.field.length) {
      const threat = [...foe.field].sort(
        (a, b) => unitValue(b, game) - unitValue(a, game),
      )[0];

      const dmg = calcTypedDamage(base, card.moveType, threat.type);

      if (dmg > 0) {
        return {
          uid: threat.uid,
        };
      }
    }

    return {
      uid: "hero",
    };
  }

  // ---------- 아군 대상 ----------
  if (need === "friendly" || need === "friendly-or-hero") {
    return pickFriendlyTarget(game, card, level);
  }

  // ---------- 진화 ----------
  if (need === "evolve") {
    const bases = me.field.filter(
      (u) => u.cardId === card.evolvesFrom && !u.noEvolve,
    );

    bases.sort((a, b) => b.hp / b.maxHp - a.hp / a.maxHp);

    return bases.length ? { uid: bases[0].uid } : null;
  }

  // ---------- 메가진화 ----------
  if (need === "mega") {
    const bases = me.field.filter((u) => u.cardId === card.megaFor && !u.mega);

    bases.sort((a, b) => unitValue(b, game) - unitValue(a, game));

    return bases.length ? { uid: bases[0].uid } : null;
  }

  return null;
}

// ============================================================
// 날씨 가치
// ============================================================
function weatherScore(player, weather) {
  return player.field.reduce((score, u) => {
    if (weather === "rain" && (u.type === "물" || u.ability === "swiftswim")) {
      score += 2;
    }

    if (
      weather === "sun" &&
      (u.type === "불꽃" ||
        u.ability === "chlorophyll" ||
        u.ability === "solarpower")
    ) {
      score += 2;
    }

    if (weather === "sand" && ["바위", "땅", "강철"].includes(u.type)) {
      score += 2;
    }

    return score;
  }, 0);
}

// ============================================================
// 카드 사용 가치
// ============================================================
function scoreCard(game, card, level) {
  const me = game.players[SIDE];
  const foe = game.players.player;

  let score = effectiveCost(card, game) * 10 + (RARITY_VALUE[card.rarity] || 0);

  // 총대장
  if (card.ability === "supremeoverlord") {
    if (me.field.length >= 3) {
      score -= level >= 5 ? 100 : 60;
    } else if (me.field.length === 2) {
      score -= 25;
    } else {
      score += 10;
    }
  }

  // ========================================================
  // 포켓몬
  // ========================================================
  if (card.kind === "pokemon") {
    score += (card.atk || 0) * 1.5 + (card.hp || 0) * 0.5;

    if (card.evolvesFrom) {
      score += 25;
    }

    if (level >= 3) {
      if (
        game.weather === "rain" &&
        (card.type === "물" || card.ability === "swiftswim")
      ) {
        score += 15;
      }

      if (
        game.weather === "sun" &&
        (card.type === "불꽃" ||
          card.ability === "chlorophyll" ||
          card.ability === "solarpower")
      ) {
        score += 15;
      }

      if (
        game.weather === "sand" &&
        ["바위", "땅", "강철"].includes(card.type)
      ) {
        score += 10;
      }

      if (card.ability === "taunt" && foe.field.length >= 2) {
        score += 12;
      }
    }

    if (level >= 5 && card.ability === "intimidate" && foe.field.length >= 2) {
      score += 10;
    }

    // 성도 AI 전용
    if (isJohtoAI(game)) {
      // 시그니처 자체 가치
      if (card.signature) {
        score += 12;
      }

      // 필드가 비었으면
      // 기본 포켓몬 전개를 우선
      if (
        me.field.length === 0 &&
        !card.evolvesFrom
      ) {
        score += 18;
      }

      // 손에 바로 다음 진화체가 있으면
      // 해당 기본체를 먼저 내는 것을 선호
      if (
        !card.evolvesFrom
      ) {
        const hasEvolution =
          me.hand.some((h) => {
            const next =
              CARD_MAP[h.cardId];

            return (
              next?.kind ===
                "pokemon" &&
              next.evolvesFrom ===
                card.id
            );
          });

        if (hasEvolution) {
          score += 22;
        }
      }

      switch (card.ability) {
        case "falkner_roost":
          score += 10;
          break;

        case "bugsy_furycutter":
          score += 12;
          break;

        case "whitney_rollout":
          score += 14;
          break;

        case "morty_curse":
          if (
            foe.field.length > 0
          ) {
            score += 18;
          }
          break;

        case "chuck_dynamicpunch":
          if (
            foe.field.length > 0
          ) {
            score += 12;
          }
          break;

        case "jasmine_autotomize":
          if (
            foe.field.length >= 2
          ) {
            score += 16;
          }
          break;

        case "blizzard":
          // 류옹의 맘모꾸리만
          if (
            card.secondaryAbility ===
            "pryce_iceshard"
          ) {
            score +=
              foe.field.length * 7;
          }
          break;

        case "clair_dragonpulse":
          score += 14;
          break;

        case "lance_thunder":
          if (
            foe.field.length > 0
          ) {
            score += 20;
          }
          break;

        case "lance_extremespeed":
          score += 24;
          break;

        case "lance_outrage":
          score += 16;
          break;

        default:
          break;
      }
    }
  }

  // ========================================================
  // Lv6 - 호연 AI
  // 진화 / 시그니처 / 메가진화를 미리 연결해서 생각
  // ========================================================
  if (level >= 6) {
    // 시그니처 포켓몬 전개 우선
    if (card.signature) {
      score += 20;
    }

    // 이 카드를 내면 손에 있는 다음 진화체를 연결할 수 있음
    const hasNextEvolution = me.hand.some((h) => {
      const next = CARD_MAP[h.cardId];

      return (
        next?.kind === "pokemon" &&
        next.evolvesFrom === card.id
      );
    });

    if (hasNextEvolution) {
      score += 18;
    }

    // 이 포켓몬의 메가스톤을 이미 들고 있으면
    // 메가진화 기반을 적극적으로 전개
    const hasMegaStone = me.hand.some((h) => {
      const mega = CARD_MAP[h.cardId];

      return (
        mega?.kind === "mega" &&
        mega.megaFor === card.id
      );
    });

    if (hasMegaStone) {
      score += 30;
    }
  }

  // ========================================================
  // 도구
  // ========================================================
  if (card.kind === "item") {
    if (!pickFriendlyTarget(game, card, level)) {
      return -100;
    }

    if (card.item?.effect === "lifeorb") {
      score += 20;
    }

    if (card.item?.effect === "focussash") {
      score += 18;
    }

    if (card.item?.effect === "shellbell") {
      score += 14;
    }
  }

  // ========================================================
  // 기술
  // ========================================================
  if (card.kind === "spell") {
    const s = card.spell;

    // ---------- 날씨 ----------
    if (s.effect === "weather") {
      if (game.weather === s.weather) {
        return -100;
      }

      if (level >= 3) {
        const mine = weatherScore(me, s.weather);

        const theirs = weatherScore(foe, s.weather);

        score += mine * 10;

        if (level >= 4) {
          score -= theirs * 6;
        }

        if (mine === 0 && theirs >= mine) {
          score -= 30;
        }
      }
    }

    // ---------- 광역 ----------
    if (s.effect === "aoe") {
      const base = spellDamageAmount(card, game);

      const value = foe.field.reduce((sum, u) => {
        const dmg = calcTypedDamage(base, card.moveType, u.type);

        return (
          sum +
          (actuallyKills(u, dmg) ? unitValue(u, game) : Math.min(dmg, u.hp))
        );
      }, 0);

      score = value * 7 - 10;

      if (level >= 2 && foe.field.length <= 1) {
        score -= 25;
      }
    }

    // ---------- 단일 피해 ----------
    if (
      s.effect === "damage" ||
      s.effect === "damage_draw" ||
      s.effect === "damage_freeze"
    ) {
      const base = spellDamageAmount(card, game);

      // 기술 자체로 본체 킬
      if (foe.hp <= base) {
        score += 999;
      }

      // 포켓몬 제거 가능
      if (
        foe.field.some((u) =>
          actuallyKills(u, calcTypedDamage(base, card.moveType, u.type)),
        )
      ) {
        score += 25;
      }

      // Lv5:
      // 기술 + 현재 직공 데미지로
      // 이번 턴 킬 가능
      if (level >= 5 && foe.hp <= base + availableFaceDamage(game)) {
        score += 500;
      }

      if (s.effect === "damage_draw") {
        score += 8;
      }

      if (s.effect === "damage_freeze") {
        score += 8;
      }
    }

    // ---------- 회복 / 상태치료 ----------
    if (
      s.effect === "heal" ||
      s.effect === "fullheal" ||
      s.effect === "cure_status" ||
      s.effect === "cure_all_status"
    ) {
      if (!pickFriendlyTarget(game, card, level)) {
        return -100;
      }

      if (
        level >= 5 &&
        me.hp <= 10 &&
        (s.effect === "heal" || s.effect === "fullheal")
      ) {
        score += 25;
      }
    }

    // ---------- 볼 ----------
    if (s.effect === "tutor_pokemon") {
      score += 7;
    }

    if (s.effect === "tutor_pokemon_2") {
      score += 18;
    }

    if (s.effect === "tutor_choose_3") {
      score += 25;
    }
  }

  // ========================================================
  // 메가진화
  // ========================================================
  if (card.kind === "mega") {
    const base = me.field.find((u) => u.cardId === card.megaFor && !u.mega);

    if (!base) {
      return -100;
    }

    score += 40;

    if (level >= 4 && base.canAttack) {
      score += 15;
    }

    if (level >= 5) {
      score += unitValue(base, game) * 0.5;
    }

    if (level >= 6) {
      // 호연은 메가진화를 훨씬 적극적으로 사용
      score += 25;

      // 챔피언 시그니처 메가는 최우선
      if (
        base.cardId ===
        game.trainer?.signatureCard
      ) {
        score += 35;
      }
    }
  }

  return score;
}

// ============================================================
// 공격 판단
// ============================================================
function chooseAttack(game, level) {
  const attackers = readyAttackers(game);
  const foe = game.players.player;

  if (!attackers.length) {
    return null;
  }

  // Lv2+ 확정 킬
  if (level >= 2) {
    const lethal = immediateLethal(game);

    if (lethal) {
      return lethal;
    }
  }

  // Lv1 랜덤
  if (level === 1) {
    const attacker = rand(attackers);

    const { units, hero } = validAttackTargets(game, SIDE, attacker.uid);

    const pool = units.map((u) => ({
      uid: u.uid,
    }));

    if (hero) {
      pool.push({ uid: "hero" }, { uid: "hero" });
    }

    return pool.length
      ? {
          attacker,
          target: rand(pool),
        }
      : null;
  }

  let best = null;
  let bestScore = -Infinity;

  attackers.forEach((a) => {
    const myAtk = effectiveAtk(a, game);

    // 공격자마다 No Guard 등으로
    // 가능한 타겟이 달라질 수 있음
    const { units, hero } = validAttackTargets(game, SIDE, a.uid);

    // ========================================================
    // 포켓몬 공격
    // ========================================================
    units.forEach((d) => {
      const dmg =
        isJohtoAI(game)
          ? johtoAttackDamage(
              a,
              d,
              game,
            )
          : calcTypedDamage(
              myAtk,
              a.type,
              d.type,
            );

      const back =
        isJohtoAI(game)
          ? johtoCounterDamage(
              a,
              d,
              game,
            )
          : calcTypedDamage(
              effectiveAtk(
                d,
                game,
              ),
              d.type,
              a.type,
            );

      const kills = actuallyKills(d, dmg);

      const dies = actuallyKills(a, back);

      let score = kills ? unitValue(d, game) * 3 : dmg * 2;

      if (dies) {
        score -= unitValue(a, game) * (level >= 3 ? 2.5 : 1.7);
      }

      // Lv6는 아무것도 못 잡으면서
      // 자기 포켓몬만 죽는 교환을 강하게 회피
      if (
        level >= 6 &&
        dies &&
        !kills
      ) {
        score -= 35;
      }

      if (kills && !dies) {
        score += 20;
      }

      if (typeMult(a.type, d.type) > 1) {
        score += 6;
      }

      if (typeMult(a.type, d.type) === 0) {
        score -= 35;
      }

      if (d.ability === "taunt" || d.ability === "fortress") {
        score += 12;
      }

      // Lv5는 접촉 페널티 고려
      if (level >= 5) {
        if (d.ability === "roughskin") {
          score -= 8;
        }

        if (d.ability === "static") {
          score -= 5;
        }

        if (d.ability === "poisonbarb") {
          score -= 4;
        }

        if (d.ability === "flamebody" || d.ability === "icebody") {
          score -= 5;
        }
      }

      if (isJohtoAI(game)) {
        // 류옹 - 얼음뭉치
        // 얼어 있는 적을 적극적으로 노림
        if (
          hasAbility(
            a,
            "pryce_iceshard",
          ) &&
          d.status === "ice"
        ) {
          score += 18;
        }
      
        // 꼭두 - 구르기
        // 이미 중첩됐다면 공격 흐름 유지
        if (
          hasAbility(
            a,
            "whitney_rollout",
          ) &&
          (a._rolloutStacks || 0) > 0
        ) {
          score +=
            Math.min(
              15,
              (a._rolloutStacks ||
                0) * 5,
            );
        }
      
        // 이향 - 공격하면
        // 상대 트레이너도 1 피해
        if (
          hasAbility(
            a,
            "clair_dragonpulse",
          )
        ) {
          score += 5;
        }
      
        // 목호 - 신속 첫 공격
        // 무반격이라는 큰 이득
        if (
          hasAbility(
            a,
            "lance_extremespeed",
          ) &&
          back === 0 &&
          a.summonedTurn ===
            game.turnCount
        ) {
          score += 24;
        }
      
        // 목호 - 역린
        // 공격할수록 성장
        if (
          hasAbility(
            a,
            "lance_outrage",
          )
        ) {
          score += 6;
        }
      }

      if (score > bestScore) {
        bestScore = score;

        best = {
          attacker: a,
          target: {
            uid: d.uid,
          },
          score,
        };
      }
    });

    // ========================================================
    // 본체 공격
    // ========================================================
    if (hero) {
      const faceDamage =
        isJohtoAI(game)
          ? johtoFaceDamage(
              a,
              game,
            )
          : myAtk;
    
      let score =
        faceDamage *
        (level >= 3
          ? 1.35
          : 2);
    
      if (foe.hp <= 15) {
        score +=
          level >= 5
            ? 28
            : 15;
      }
    
      if (
        foe.hp <=
        faceDamage
      ) {
        score += 999;
      }

      if (level >= 5 && foe.field.length === 0) {
        score += 12;
      }

      if (score > bestScore) {
        bestScore = score;

        best = {
          attacker: a,
          target: {
            uid: "hero",
          },
          score,
        };
      }
    }
  });

  return best;
}

// ============================================================
// 막힌 진화카드 버리고 뽑기
// ============================================================
function findDiscardCandidate(game, level) {
  const me = game.players[SIDE];

  if (level < 4 || me.discardUsedThisTurn) {
    return null;
  }

  const candidates = me.hand
    .map((h, idx) => ({
      idx,
      card: CARD_MAP[h.cardId],
    }))
    .filter(({ card }) => card?.kind === "pokemon" && card.evolvesFrom)
    .filter(({ idx }) => !canPlayCard(game, SIDE, idx));

  if (!candidates.length) {
    return null;
  }

  // Lv4는 손패가 막혔을 때
  if (level === 4 && me.hand.length < 7) {
    return null;
  }

  // Lv5는 조금 더 적극적
  if (level >= 5 && me.hand.length < 5) {
    return null;
  }

  candidates.sort((a, b) => {
    const aBase = me.deck.includes(a.card.evolvesFrom);

    const bBase = me.deck.includes(b.card.evolvesFrom);

    // 진화 전 카드가 덱에도 없으면
    // 가장 먼저 버림
    if (aBase !== bBase) {
      return aBase ? 1 : -1;
    }

    return (a.card.cost || 0) - (b.card.cost || 0);
  });

  return candidates[0].idx;
}

// ============================================================
// 메인 AI
// 행동 1개 실행 후 return
// ============================================================
export function aiStep(game) {
  if (game.winner || game.turn !== SIDE) {
    return false;
  }

  const level = Math.max(1, game.trainer?.aiLevel || 1);

  // ========================================================
  // 0. 선택형 등장 효과 처리
  // ========================================================
  if (game.pendingBattlecry && game.pendingBattlecry.side === SIDE) {
    const pending = game.pendingBattlecry;

    const targets = game.players.player.field.filter((u) =>
      pending.targets.includes(u.uid),
    );

    // 뮤 변신
    if (pending.ability === "metronome") {
      const pick = [...targets].sort(
        (a, b) => b.atk - a.atk || unitValue(b, game) - unitValue(a, game),
      )[0];

      if (pick) {
        resolveMew(game, SIDE, pick.uid);
      } else {
        game.pendingBattlecry = null;
      }

      return true;
    }

    // 틀깨기
    const pick = [...targets].sort(
      (a, b) => unitValue(b, game) - unitValue(a, game),
    )[0];

    if (pick) {
      resolveMoldbreaker(game, SIDE, pick.uid);
    } else {
      game.pendingBattlecry = null;
    }

    return true;
  }

  // ========================================================
  // Lv5
  // 공격만으로 이길 수 있으면
  // 카드 안 쓰고 승리부터
  // ========================================================
  if (level >= 5) {
    const lethal = immediateLethal(game);

    if (lethal && attack(game, SIDE, lethal.attacker.uid, lethal.target)) {
      return true;
    }
  }

  // ========================================================
  // 1. 카드 사용
  // ========================================================
  const playable = playableCards(game);

  if (playable.length) {
    // Lv1 랜덤
    if (level === 1) {
      if (Math.random() < 0.85) {
        const pick = rand(playable);

        const target = pickSpellTarget(game, pick.card, level);

        const need = spellNeedsTarget(pick.card);

        if ((!need || target) && playCard(game, SIDE, pick.idx, target)) {
          return true;
        }
      }
    } else {
      // Lv2~6
      const scored = playable
        .map((pc) => ({
          ...pc,
          score: scoreCard(game, pc.card, level),
        }))
        .filter((pc) => pc.score > -50)
        .sort((a, b) => b.score - a.score);

      // 기존처럼 1~2개만 보지 않고
      // 가능한 카드가 나올 때까지 시도
      for (const pick of scored) {
        const target = pickSpellTarget(game, pick.card, level);

        const need = spellNeedsTarget(pick.card);

        if ((!need || target) && playCard(game, SIDE, pick.idx, target)) {
          return true;
        }
      }
    }
  }

  // ========================================================
  // 2. Lv4+
  // 막힌 진화패 버리고 새 카드
  // ========================================================
  const discardIdx = findDiscardCandidate(game, level);

  if (discardIdx !== null && discardToDraw(game, SIDE, discardIdx)) {
    return true;
  }

  // ========================================================
  // 3. 공격
  // ========================================================
  const choice = chooseAttack(game, level);

  if (choice && attack(game, SIDE, choice.attacker.uid, choice.target)) {
    return true;
  }

  // ========================================================
  // 4. 턴 종료
  // ========================================================
  endTurn(game);

  return false;
}
