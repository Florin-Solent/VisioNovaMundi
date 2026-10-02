// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    build: {
      rolldownOptions: {
        output: {
          // Preserve Three.js module initialization order after splitting the engine.
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              {
                name: "three-engine",
                test: /node_modules[\\/]three[\\/]/,
                minSize: 400_000,
                maxSize: 500_000,
                entriesAware: true,
              },
            ],
          },
        },
      },
    },
  },
});
