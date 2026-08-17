import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const gameEngineWrapper = path.resolve(
  process.cwd(),
  'src/engine/gameplay-balance.js',
);

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
    react(),
  ],
});
