import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import pkg from './package.json';

export default defineConfig({
  plugins: [
    dts({
      outDir: 'dist/types',
      include: ['src/**/*'],
      staticImport: true,
      insertTypesEntry: true,
    }),
  ],
  build: {
    sourcemap: true,
    cssCodeSplit: false,
    minify: false,
    target: 'esnext',
    lib: {
      entry: 'src/index.ts',
      name: 'LowCodeCore',
      fileName: 'lowcode-core',
    },

    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external(id: string) {
        return Object.keys(pkg.dependencies).some(k => new RegExp(`^${k}`).test(id));
      },
    },
  },
});
