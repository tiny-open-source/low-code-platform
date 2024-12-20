import { createApp } from 'vue';

import App from './App.vue';

const componentUrl = import.meta.env.MODE === 'development' ? '../comp-entry.ts' : 'http://localhost:10002/lowcode/runtime/vue3/dist/assets/components.js';

import(/* @vite-ignore */ componentUrl).then(() => {
  const vm = createApp(App);

  const { components, plugins } = window.lowcodePresetComponents;
  Object.values(components).forEach((component: any) => {
    vm.component(component.name, component);
  });

  Object.values(plugins).forEach((plugin: any) => {
    vm.use(plugin);
  });

  vm.mount('#app');
});
