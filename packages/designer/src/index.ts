import type { App } from 'vue';
import type { InstallOptions } from './type';
import Editor from './Designer.vue';

import CodeLink from './fields/CodeLink.vue';

import UISelect from './fields/UISelect.vue';
import './theme/index.scss';

import '@unocss/reset/tailwind-compat.css';

export { default as LowCodeDesigner } from './Designer.vue';

export { default as designerService } from './services/designer.service';
export { default as historyService } from './services/history.service';
export { default as uiService } from './services/ui.service';
export type { MoveableOptions } from '@lowcode/stage';
const defaultInstallOptions: InstallOptions = {
  // @todo, 自定义图片上传方法等编辑器依赖的外部选项
};
export default {
  install: (app: App, opt?: InstallOptions): void => {
    const option = Object.assign(defaultInstallOptions, opt || {});

    app.config.globalProperties.$LOWCODE_DESIGNER = option;

    app.component(Editor.name!, Editor);
    app.component(UISelect.name!, UISelect);
    app.component(CodeLink.name!, CodeLink);
  },
};
