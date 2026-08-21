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