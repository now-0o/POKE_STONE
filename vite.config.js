import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const championEngineWrapper = path.resolve(
  process.cwd(),
  'src/engine/cynthia/balance.js',
);

export default defineConfig({
  plugins: [
    {
      name: 'poke-stone-champion-engine-wrapper',
      enforce: 'pre',
      resolveId(source, importer) {
        const importerPath = importer?.split('?')[0];

        if (!importerPath || importerPath === championEngineWrapper) {
          return null;
        }

        if (
          source === '../engine/engine.js' ||
          source === './engine.js'
        ) {
          return championEngineWrapper;
        }

        return null;
      },
    },
    react(),
  ],
});
