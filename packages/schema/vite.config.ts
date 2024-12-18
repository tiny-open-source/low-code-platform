import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      outDir: 'dist/types',
      include: ['src/**/*'],
      staticImport: true,
      insertTypesEntry: true,
      pathsToAliases: false,
    }),
  ],
  build: {
    sourcemap: true,

    lib: {
      entry: 'src/index.ts',
      name: 'LowCodeSchema',
      fileName: 'lowcode-schema',
    },
  },
});
