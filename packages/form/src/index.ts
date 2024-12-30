import type { App } from 'vue';
import LFieldsText from './fields/Text.vue';

export { default as LFieldsText } from './fields/Text.vue';
export { default as LForm } from './Form.vue';
export * from './schema';

export { default as fieldProps } from './utils/fieldProps';

const defaultInstallOptions = {};

function install(app: App, options: any) {
  const option = Object.assign(defaultInstallOptions, options);

  app.config.globalProperties.$LOW_CODE_FORM = option;

  app.component(LFieldsText.name!, LFieldsText);
}

export default {
  install,
};
