import Designer from '@lowcode/designer';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
// import '@lowcode/designer/style';
import '@unocss/reset/tailwind-compat.css';
import './assets/reset.css';
import 'virtual:uno.css';

const app = createApp(App);

app.use(createPinia());
app.use(Designer);

app.mount('#app');
