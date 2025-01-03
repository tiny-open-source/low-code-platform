import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import UnoCSS from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';
// https://vite.dev/config/
export default defineConfig({
  base: '/lowcode/playground',
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  plugins: [vue(), vueJsx(), vueDevTools(), UnoCSS(), AutoImport({
    dts: true,
    imports: [
      'vue',
      '@vueuse/core',
    ],
    viteOptimizeDeps: true,
  }), Components({
    resolvers: [AntDesignVueResolver()],
  })],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('src', import.meta.url)) },
      { find: /@lowcode\/(.*)/, replacement: path.join(__dirname, '../packages/$1/src') },
      { find: /@designer/, replacement: path.join(__dirname, '../packages/designer/src') },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 10001,
  },
});
