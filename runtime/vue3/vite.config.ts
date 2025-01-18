import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';
import pkg from './package.json';
// https://vite.dev/config/
export default defineConfig({
  base: '/low-code-platform/playground/runtime/vue3',
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('src', import.meta.url)) },
      { find: /@lowcode\/(.*)/, replacement: path.join(__dirname, '../../packages/$1/src') },
    ],
  },
  server: {
    port: 10002,
    hmr: {
      port: 10002,
    },
    fs: {
      // 允许访问工作区上层目录
      allow: ['..'],
    },
  },
  logLevel: 'error',
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
      // 确保外部化处理那些你不想打包进库的依赖
      external(id: string) {
        return Object.keys(pkg.dependencies).some(k => new RegExp(`^${k}`).test(id));
      },
      output: {
        entryFileNames: 'assets/[name].js',
      },
    },
  },
});
