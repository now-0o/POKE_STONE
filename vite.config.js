import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const normalizePath = (value) => value.replace(/\\/g, '/');

const gameEngineWrapper = path.resolve(
  process.cwd(),
  'src/engine/unova-legendary-balance.js',
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

        if (!importerPath || importerPath === gameEngineWrapper) {
          return null;
        }

        if (
          source === '../engine/engine.js' ||
          source === './engine.js'
        ) {
          return gameEngineWrapper;
        }

        return null;
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
