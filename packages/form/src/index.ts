import type { App } from 'vue';

import Vue3ColorPicker from 'vue3-colorpicker';
import LFormContainer from './container/Container.vue';
import LFormFieldset from './container/Fieldset.vue';
import LFormTabs from './container/Tabs.vue';
import LFieldsCheckbox from './fields/Checkbox.vue';
import LFieldsColorPicker from './fields/ColorPicker.vue';
import LFieldsDisplay from './fields/Display.vue';
import LFieldsHidden from './fields/Hidden.vue';
import LFieldsSelect from './fields/Select.vue';
import LFieldsSwitch from './fields/Switch.vue';
import LFieldsText from './fields/Text.vue';

import 'vue3-colorpicker/style.css';
import './theme/index.scss';

export { default as LFormContainer } from './container/Container.vue';
export { default as LFormFieldset } from './container/Fieldset.vue';
export { default as LFormTabs } from './container/Tabs.vue';
export { default as LFieldsCheckbox } from './fields/Checkbox.vue';
export { default as LFieldsColorPicker } from './fields/ColorPicker.vue';
export { default as LFieldsDisplay } from './fields/Display.vue';
export { default as LFieldsHidden } from './fields/Hidden.vue';
export { default as LFieldsSelect } from './fields/Select.vue';
export { default as LFieldsSwitch } from './fields/Switch.vue';
export { default as LFieldsText } from './fields/Text.vue';
export { default as LForm } from './Form.vue';
export * from './schema';

export { default as fieldProps } from './utils/fieldProps';
const defaultInstallOptions = {};

function install(app: App, options: any) {
  const option = Object.assign(defaultInstallOptions, options);

  app.config.globalProperties.$LOW_CODE_FORM = option;
  // ant-design-vue 不支持颜色选择器，随便先找一个，后面看看把组件库换成别的
  app.use(Vue3ColorPicker);

  app.component(LFieldsText.name!, LFieldsText);
  app.component(LFormContainer.name!, LFormContainer);
  app.component(LFormTabs.name!, LFormTabs);
  app.component(LFieldsHidden.name!, LFieldsHidden);
  app.component(LFieldsDisplay.name!, LFieldsDisplay);
  app.component(LFieldsSelect.name!, LFieldsSelect);
  app.component(LFieldsSwitch.name!, LFieldsSwitch);
  app.component(LFormFieldset.name!, LFormFieldset);
  app.component(LFieldsCheckbox.name!, LFieldsCheckbox);
  app.component(LFieldsColorPicker.name!, LFieldsColorPicker);
}

export default {
  install,
};
