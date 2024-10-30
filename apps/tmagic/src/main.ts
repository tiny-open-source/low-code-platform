import TMagicDesign from '@tmagic/design'
import TMagicEditor from '@tmagic/editor'
import TMagicElementPlusAdapter from '@tmagic/element-plus-adapter'

import TMagicForm from '@tmagic/form'
import ElementPlus from 'element-plus'

import { createApp } from 'vue'
import App from './App.vue'
import 'element-plus/dist/index.css'
import '@tmagic/editor/dist/style.css'

import '@tmagic/form/dist/style.css'

createApp(App)
  .use(ElementPlus)
  .use(TMagicDesign, TMagicElementPlusAdapter)
  .use(TMagicEditor)
  .use(TMagicForm)
  .mount('#app')
