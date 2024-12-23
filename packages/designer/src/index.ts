import type { App } from 'vue';
import type { InstallOptions } from './type';
import Editor from './Designer.vue';

import '@unocss/reset/tailwind-compat.css';
import './utils/polyfills';
import './theme/index.scss';

export { default as LowCodeDesigner } from './Designer.vue';

export { default as uiService } from './services/ui.service';
const defaultInstallOpt: InstallOptions = {
  // @todo, 自定义图片上传方法等编辑器依赖的外部选项
};
export default {
  install: (app: App, opt?: InstallOptions): void => {
    const option = Object.assign(defaultInstallOpt, opt || {});

    app.config.globalProperties.$LOWCODE_DESIGNER = option;

    app.component(Editor.name!, Editor);
  },
};
