import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const gameEngineWrapper = path.resolve(
  process.cwd(),
  'src/engine/gameplay-balance.js',
);

const pokeApiCardsModule = path.resolve(process.cwd(), 'src/data/cards.js');
const pokeApiRawSpriteBase =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const localSpriteBase = '/sprites';

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
      name: 'poke-stone-local-sprites',
      enforce: 'pre',
      transform(code, id) {
        const modulePath = id.split('?')[0];
        if (modulePath !== pokeApiCardsModule) return null;
        if (!code.includes(pokeApiRawSpriteBase)) return null;

        return {
          code: code.split(pokeApiRawSpriteBase).join(localSpriteBase),
          map: null,
        };
      },
    },
    react(),
  ],
});
