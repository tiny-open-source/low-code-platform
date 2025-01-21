import { createApp } from 'vue';

import App from './App.vue';

Promise.all([import('../.lowcode/comp-entry'), import('../.lowcode/plugin-entry')]).then(([components, plugins]) => {
  const vm = createApp(App);

  Object.values(components.default).forEach((component: any) => {
    vm.component(component.name, component);
  });

  Object.values(plugins.default).forEach((plugin: any) => {
    vm.use(plugin);
  });

  vm.mount('#app');
});
