import Core from '@lowcode/core';
import { getUrlParam } from '@lowcode/utils';
import { createApp } from 'vue';
import entry from '../comp-entry';

import { mockDSL } from '../mockDSL';
import { getLocalConfig } from '../utils';
import App from './App.vue';

window.lowcodeDSL = [mockDSL] as any;

const vm = createApp(App);

Object.values(entry.components).forEach((component: any) => {
  vm.component(component.name, component);
});

Object.values(entry.plugins).forEach((plugin: any) => {
  vm.use(plugin);
});

const app = new Core({
  config: ((getUrlParam('localPreview') ? getLocalConfig() : window.lowcodeDSL) || [])[0] || {},
  curPage: getUrlParam('page'),
});

vm.config.globalProperties.app = app;
vm.provide('app', app);

vm.mount('#app');
