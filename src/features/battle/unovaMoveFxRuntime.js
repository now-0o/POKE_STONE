import { CARD_MAP } from "../../data/cards.js";

// 5세대 확장 기술은 Battle.jsx의 공용 MOVE FX 렌더러를 그대로 사용한다.
// 카드 데이터의 animation 메타만 보강해 플레이어/AI 모두 같은 연출을 탄다.
const UNOVA_MOVE_ANIMATIONS = {
  scald: {
    type: "stream",
    theme: "water",
    scope: "target",
    variant: "scald",
    startup: 240,
    duration: 500,
    impactDelay: 260,
  },
  voltswitch: {
    type: "bolt",
    theme: "electric",
    scope: "target",
    variant: "volt-switch",
    startup: 190,
    duration: 430,
    impactDelay: 210,
  },
  flamecharge: {
    type: "stream",
    theme: "fire",
    scope: "target",
    variant: "flame-charge",
    startup: 200,
    duration: 430,
    impactDelay: 210,
  },
  acrobatics: {
    type: "strike",
    theme: "flying",
    scope: "target",
    variant: "acrobatics",
    startup: 170,
    duration: 410,
    impactDelay: 190,
  },
  dragontail: {
    type: "slash",
    theme: "dragon",
    scope: "target",
    variant: "dragon-tail",
    startup: 210,
    duration: 430,
    impactDelay: 210,
  },
  quiverdance: {
    type: "status",
    theme: "fairy",
    scope: "target",
    variant: "quiver-dance",
    startup: 260,
    duration: 650,
  },
  shellsmash: {
    type: "strike",
    theme: "normal",
    scope: "target",
    variant: "shell-smash",
    startup: 230,
    duration: 520,
    impactDelay: 260,
  },
  geargrind: {
    type: "projectile",
    theme: "steel",
    scope: "target",
    variant: "gear-grind",
    startup: 210,
    duration: 520,
    impactDelay: 250,
  },
  sacredsword: {
    type: "slash",
    theme: "fighting",
    scope: "target",
    variant: "sacred-sword",
    startup: 250,
    duration: 470,
    impactDelay: 230,
  },
  reflect: {
    type: "shield",
    theme: "psychic",
    scope: "self-field",
    variant: "reflect",
    startup: 260,
    duration: 660,
  },
  lightscreen: {
    type: "shield",
    theme: "fairy",
    scope: "self-field",
    variant: "light-screen",
    startup: 280,
    duration: 700,
  },
};

Object.entries(UNOVA_MOVE_ANIMATIONS).forEach(([cardId, animation]) => {
  const card = CARD_MAP[cardId];
  if (!card) return;
  card.animation = animation;
});
