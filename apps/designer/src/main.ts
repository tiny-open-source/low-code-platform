import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import router from './router';

import '@unocss/reset/tailwind-compat.css';
import './assets/reset.css';
import 'virtual:uno.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
