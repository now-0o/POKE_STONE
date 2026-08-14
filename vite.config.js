import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const sinnohEngineWrapper = path.resolve(
  process.cwd(),
  'src/features/sinnoh/engine.js',
);

export default defineConfig({
  plugins: [
    {
      name: 'poke-stone-sinnoh-engine-wrapper',
      enforce: 'pre',
      resolveId(source, importer) {
        const importerPath = importer?.split('?')[0];

        if (!importerPath || importerPath === sinnohEngineWrapper) {
          return null;
        }

        if (
          source === '../engine/engine.js' ||
          source === './engine.js'
        ) {
          return sinnohEngineWrapper;
        }

        return null;
      },
    },
    react(),
  ],
});
