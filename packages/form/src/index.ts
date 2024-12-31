import type { App } from 'vue';
import LFormContainer from './container/Container.vue';
import LFormTabs from './container/Tabs.vue';
import LFieldsHidden from './fields/Hidden.vue';
import LFieldsText from './fields/Text.vue';
import './theme/index.scss';

export { default as LFormContainer } from './container/Container.vue';
export { default as LFormTabs } from './container/Tabs.vue';
export { default as LFieldsHidden } from './fields/Hidden.vue';
export { default as LFieldsText } from './fields/Text.vue';
export { default as LForm } from './Form.vue';
export * from './schema';

export { default as fieldProps } from './utils/fieldProps';
const defaultInstallOptions = {};

function install(app: App, options: any) {
  const option = Object.assign(defaultInstallOptions, options);

  app.config.globalProperties.$LOW_CODE_FORM = option;

  app.component(LFieldsText.name!, LFieldsText);
  app.component(LFormContainer.name!, LFormContainer);
  app.component(LFormTabs.name!, LFormTabs);
  app.component(LFieldsHidden.name!, LFieldsHidden);
}

export default {
  install,
};
