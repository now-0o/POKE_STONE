import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const normalizePath = (value) => value.replace(/\\/g, '/');

const gameEngineWrapper = path.resolve(
  process.cwd(),
  'src/engine/unova-battle-balance.js',
);
const aiWrapper = path.resolve(
  process.cwd(),
  'src/engine/ai-unova.js',
);
const battleModule = normalizePath(
  path.resolve(process.cwd(), 'src/components/Battle.jsx'),
);
const baseAiModule = normalizePath(
  path.resolve(process.cwd(), 'src/engine/ai.js'),
);
const baseEngineCoreModule = normalizePath(
  path.resolve(process.cwd(), 'src/engine/engine.base.js'),
);
const unovaCardsModule = normalizePath(
  path.resolve(process.cwd(), 'src/data/cards/unova.js'),
);

const baseEngineModule = normalizePath(
  path.resolve(process.cwd(), 'src/engine/engine.js'),
);
const undocumentedRoarkDamageReduction = `  // ============================================================
  // 강석 - 무쇠탄갱
  // 강석의 바위 타입 포켓몬은 받는 피해 -1
  // ============================================================
  if (
    !ignoreDefense &&
    game.trainer?.gimmick === "mine_collapse" &&
    unit.side === "enemy" &&
    unit.type === "바위" &&
    dmg > 0
  ) {
    dmg = Math.max(0, dmg - 1);
  }

`;

const pokeApiCardsModule = normalizePath(
  path.resolve(process.cwd(), 'src/data/cards.js'),
);
const pokeApiRawSpriteBase =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const localSpriteBase = '/sprites';
const legendaryMegaStoneRarity = /(kind:\s*"mega",[\s\S]*?\brarity:\s*)"L"/g;

export default defineConfig({
  plugins: [
    {
      name: 'poke-stone-game-engine-wrapper',
      enforce: 'pre',
      resolveId(source, importer) {
        const importerPath = importer?.split('?')[0];

        if (!importerPath) return null;

        if (
          importerPath !== gameEngineWrapper &&
          (source === '../engine/engine.js' || source === './engine.js')
        ) {
          return gameEngineWrapper;
        }

        if (
          importerPath !== aiWrapper &&
          (source === '../engine/ai.js' || source === './ai.js')
        ) {
          return aiWrapper;
        }

        return null;
      },
    },
    {
      name: 'poke-stone-common-ai-air-balloon',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = normalizePath(id.split('?')[0]);
        if (modulePath !== baseAiModule) return null;

        const before = `    const candidates = me.field.filter((u) => !u.item);\n\n    if (!candidates.length) return null;\n\n    const effect = card.item?.effect;`;
        const after = `    let candidates = me.field.filter((u) => !u.item);\n\n    const effect = card.item?.effect;\n\n    if (effect === "air_balloon") {\n      candidates = candidates.filter(\n        (u) => u.type !== "비행" && !hasAbility(u, "levitate"),\n      );\n    }\n\n    if (!candidates.length) return null;`;
        if (!code.includes(before)) return null;
        return { code: code.replace(before, after), map: null };
      },
    },
    {
      name: 'poke-stone-invalid-card-battle-guard',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = normalizePath(id.split('?')[0]);
        let nextCode = code;

        if (modulePath === baseEngineCoreModule) {
          nextCode = nextCode.replace(
            'export function effectiveCost(card, game, side = null, handCard = null) {\n  let cost = card.cost;',
            'export function effectiveCost(card, game, side = null, handCard = null) {\n  if (!card) return Number.POSITIVE_INFINITY;\n  let cost = card.cost;',
          );
          nextCode = nextCode.replace(
            '  const card = CARD_MAP[h.cardId];\n  if (effectiveCost(card, game, side, h) > p.mana) {',
            '  const card = CARD_MAP[h.cardId];\n  if (!card) return false;\n  if (effectiveCost(card, game, side, h) > p.mana) {',
          );
        }

        if (modulePath === battleModule) {
          nextCode = nextCode.replace(
            '        {me.hand.map((h, idx) => {\n          const c = CARD_MAP[h.cardId];\n          const playableNow = myTurn && canPlayCard(game, "player", idx);',
            '        {me.hand.map((h, idx) => {\n          const c = CARD_MAP[h.cardId];\n          if (!c) return null;\n          const playableNow = myTurn && canPlayCard(game, "player", idx);',
          );
        }

        if (nextCode === code) return null;
        return { code: nextCode, map: null };
      },
    },
    {
      name: 'poke-stone-n-gimmick-help-and-defeatist',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = normalizePath(id.split('?')[0]);
        let nextCode = code;

        if (modulePath === battleModule) {
          nextCode = nextCode.replace(
            'import { HandCard, FieldUnit, TrainerSprite } from "./Card.jsx";',
            'import { HandCard, FieldUnit, TrainerSprite } from "./Card.jsx";\nimport NBattleHelp from "../features/battle/NBattleHelp.jsx";',
          );
          nextCode = nextCode.replace(
            '      {resultOverlay}',
            '      {trainer?.gimmick === "n_bond" && <NBattleHelp />}\n      {resultOverlay}',
          );
        }

        if (modulePath === baseEngineCoreModule) {
          nextCode = nextCode.replace(
            '  // 아케오스 - 무기력\n  if (hasAbility(unit, "defeatist") && unit.hp <= Math.ceil(unit.maxHp / 2)) {\n    atk = Math.max(0, atk - 2);\n  }',
            '  // 아케오스 - 무기력\n  if (hasAbility(unit, "defeatist") && unit.hp <= Math.ceil(unit.maxHp / 2)) {\n    atk = Math.max(0, Math.floor(atk / 2));\n  }',
          );
        }

        if (modulePath === unovaCardsModule) {
          nextCode = nextCode.replace(
            'defeatist: "무기력: 체력이 절반 이하이면 공격력 -2.",',
            'defeatist: "무기력: 체력이 절반 이하이면 공격력이 절반이 된다.",',
          );
        }

        if (nextCode === code) return null;
        return { code: nextCode, map: null };
      },
    },
    {
      name: 'poke-stone-opening-mulligan',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = normalizePath(id.split('?')[0]);
        if (modulePath !== battleModule) return null;

        let nextCode = code;

        nextCode = nextCode.replace(
          'import { HandCard, FieldUnit, TrainerSprite } from "./Card.jsx";\nimport NBattleHelp from "../features/battle/NBattleHelp.jsx";',
          'import { HandCard, FieldUnit, TrainerSprite } from "./Card.jsx";\nimport NBattleHelp from "../features/battle/NBattleHelp.jsx";\nimport OpeningMulligan from "../features/battle/OpeningMulligan.jsx";',
        );

        nextCode = nextCode.replace(
          '  const [intro, setIntro] = useState("vs"); // \'vs\' -> \'coin\' -> false\n  const [confirmSurrender, setConfirmSurrender] = useState(false);',
          '  const [intro, setIntro] = useState("vs"); // \'vs\' -> \'coin\' -> false\n  const [mulliganOpen, setMulliganOpen] = useState(true);\n  const [confirmSurrender, setConfirmSurrender] = useState(false);',
        );

        nextCode = nextCode.replace(
          '    if (intro !== false || game.winner || game.turn !== "enemy") return;',
          '    if (intro !== false || mulliganOpen || game.winner || game.turn !== "enemy") return;',
        );

        nextCode = nextCode.replace(
          '  const resultOverlay = game.winner && (',
          `  if (mulliganOpen) {\n    return (\n      <OpeningMulligan\n        game={game}\n        onComplete={() => {\n          setMulliganOpen(false);\n          rerender();\n        }}\n      />\n    );\n  }\n\n  const resultOverlay = game.winner && (`,
        );

        if (nextCode === code) return null;
        return { code: nextCode, map: null };
      },
    },
    {
      name: 'poke-stone-card-preview-and-cross-columns',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = normalizePath(id.split('?')[0]);
        let nextCode = code;

        if (modulePath === battleModule) {
          nextCode = nextCode.replace(
            'import { playSfx, playCry } from "../audio.js";',
            'import { playSfx, playCry } from "../audio.js";\nimport "../features/battle/card-preview.css";',
          );
        }

        if (modulePath === baseEngineCoreModule) {
          nextCode = nextCode.replace(
            'log(game, `${unit.name}의 크로스플레임! 상대 1·3·5번째 칸을 불태웠다!`);',
            'log(game, `${unit.name}의 크로스플레임! 상대 필드의 왼쪽에서 1·3·5번째 포켓몬을 불태웠다!`);',
          );
          nextCode = nextCode.replace(
            '      [1, 3, 5].forEach((index) => {\n        const target = foe.field[index];',
            '      [1, 3, 5].forEach((positionFromRight) => {\n        const index = foe.field.length - positionFromRight;\n        const target = foe.field[index];',
          );
          nextCode = nextCode.replace(
            'log(game, `${unit.name}의 크로스썬더! 상대 2·4·6번째 칸을 강타했다!`);',
            'log(game, `${unit.name}의 크로스썬더! 상대 필드의 오른쪽에서 1·3·5번째 포켓몬을 강타했다!`);',
          );
        }

        if (modulePath === unovaCardsModule) {
          nextCode = nextCode.replace(
            'crossflame: "크로스플레임: 나왔을 때 상대 필드 1·3·5번째 칸의 포켓몬에게 각각 불꽃 피해 4.",',
            'crossflame: "크로스플레임: 나왔을 때 상대 필드의 왼쪽에서 1·3·5번째 포켓몬에게 각각 불꽃 피해 4.",',
          );
          nextCode = nextCode.replace(
            'crossbolt: "크로스썬더: 나왔을 때 상대 필드 2·4·6번째 칸의 포켓몬에게 각각 전기 피해 4.",',
            'crossbolt: "크로스썬더: 나왔을 때 상대 필드의 오른쪽에서 1·3·5번째 포켓몬에게 각각 전기 피해 4.",',
          );
        }

        if (nextCode === code) return null;
        return { code: nextCode, map: null };
      },
    },
    {
      name: 'poke-stone-volt-switch-replay-ui',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = normalizePath(id.split('?')[0]);
        if (modulePath !== battleModule) return null;

        let nextCode = code;

        nextCode = nextCode.replace(
          '    const need = spellNeedsTarget(card);\n\n    function attemptPlay',
          '    const freeVoltReplay = !!h._voltSwitchFreePlay;\n    const need = freeVoltReplay ? null : spellNeedsTarget(card);\n\n    function attemptPlay',
        );
        nextCode = nextCode.replace(
          '    if (card.kind === "pokemon" && !card.evolvesFrom) {',
          '    if (card.kind === "pokemon" && (!card.evolvesFrom || freeVoltReplay)) {',
        );
        nextCode = nextCode.replace(
          '    if (card.kind === "pokemon" && card.evolvesFrom) {',
          '    if (card.kind === "pokemon" && card.evolvesFrom && !freeVoltReplay) {',
        );
        nextCode = nextCode.replace(
          '    const need = spellNeedsTarget(card);\n    if (!need) {',
          '    const need = me.hand[idx]?._voltSwitchFreePlay ? null : spellNeedsTarget(card);\n    if (!need) {',
        );
        nextCode = nextCode.replace(
          '  const spellNeed = activeCard ? spellNeedsTarget(activeCard) : null;',
          '  const spellNeed = activeCard\n    ? (me.hand[activeHandIdx]?._voltSwitchFreePlay ? null : spellNeedsTarget(activeCard))\n    : null;',
        );
        nextCode = nextCode.replace(
          '    activeCard.kind === "pokemon" &&\n    !activeCard.evolvesFrom;',
          '    activeCard.kind === "pokemon" &&\n    (!activeCard.evolvesFrom || !!me.hand[dragIdx]?._voltSwitchFreePlay);',
        );

        if (nextCode === code) return null;
        return { code: nextCode, map: null };
      },
    },
    {
      name: 'poke-stone-remove-undocumented-roark-defense',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = normalizePath(id.split('?')[0]);
        if (modulePath !== baseEngineModule) return null;
        if (!code.includes(undocumentedRoarkDamageReduction)) return null;

        return {
          code: code.replace(undocumentedRoarkDamageReduction, ''),
          map: null,
        };
      },
    },
    {
      name: 'poke-stone-card-transforms',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = normalizePath(id.split('?')[0]);
        if (modulePath !== pokeApiCardsModule) return null;

        let nextCode = code;

        if (nextCode.includes(pokeApiRawSpriteBase)) {
          nextCode = nextCode.split(pokeApiRawSpriteBase).join(localSpriteBase);
        }

        nextCode = nextCode.replace(legendaryMegaStoneRarity, '$1"E"');

        if (nextCode === code) return null;

        return {
          code: nextCode,
          map: null,
        };
      },
    },
    react(),
  ],
});