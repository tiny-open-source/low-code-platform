import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import vueDevTools from 'vite-plugin-vue-devtools';
import pkg from './package.json';
// https://vite.dev/config/
export default defineConfig({
  base: '/lowcode',
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  plugins: [dts({
    outDir: 'dist/types',
    include: ['src/**/*'],
    staticImport: true,
    insertTypesEntry: true,
  }), vue(), vueJsx(), vueDevTools(), Components({
    resolvers: [AntDesignVueResolver()],
  })],
  resolve: {
    alias: {
      '@designer': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    cssCodeSplit: false,
    sourcemap: true,
    minify: false,
    target: 'esnext',

    lib: {
      entry: 'src/index.ts',
      name: 'LowCodeDesigner',
      fileName: 'lowcode-designer',
    },

    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external(id: string) {
        return (
          id.startsWith('vue')
          || id.startsWith('ant-design-vue')
          || /^@lowcode\//.test(id)
          || Object.keys(pkg.dependencies).some(k => new RegExp(`^${k}`).test(id))
        );
      },

      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          'vue': 'Vue',
          'ant-design-vue': 'AntDesignVue',
        },
      },
    },
  },
});
