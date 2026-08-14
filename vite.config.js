import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const sinnohEngineWrapper = path.resolve(
  process.cwd(),
  'src/engine/engine-sinnoh.js',
);

export default defineConfig({
  plugins: [
    {
      name: 'poke-stone-sinnoh-engine-wrapper',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!importer || importer.endsWith('/engine-sinnoh.js')) {
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
