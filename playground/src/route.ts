import { createRouter, createWebHashHistory } from 'vue-router';
import Editor from './Designer.vue';

const routes = [
  { path: '/', component: Editor },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
