import { defineConfig, presetAttributify, presetIcons, presetUno, transformerDirectives } from 'unocss';
import { presetScrollbar } from 'unocss-preset-scrollbar';

export default defineConfig({
  presets: [
    presetAttributify(),
    presetUno(),
    presetIcons(),
    presetScrollbar(),
  ],
  transformers: [transformerDirectives()],
});
