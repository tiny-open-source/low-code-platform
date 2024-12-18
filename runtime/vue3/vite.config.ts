import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vite';
// https://vite.dev/config/
export default defineConfig({
  base: '/lowcode/runtime/vue3',
  plugins: [vue(), vueJsx(), AutoImport({
    dts: true,
    imports: [
      'vue',
    ],
  })],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('src', import.meta.url)) },
      { find: /@lowcode\/(.*)/, replacement: path.join(__dirname, '../../packages/$1/src') },
    ],
  },
  server: {
    port: 10002,
  },
  build: {
    sourcemap: true,

    cssCodeSplit: false,

    rollupOptions: {
      input: {
        page: './page.html',
        playground: './playground.html',
        components: './src/comp-entry.ts',
        config: './src/config-entry.ts',
        value: './src/value-entry.ts',
        event: './src/event-entry.ts',
      },
      output: {
        entryFileNames: 'assets/[name].js',
      },
    },
  },
});
