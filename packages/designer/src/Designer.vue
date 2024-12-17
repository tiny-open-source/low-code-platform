<script setup lang="ts">
import type { Services } from './type';
import uiService from '@designer/services/ui.service';
import { provide } from 'vue';
import Framework from './layouts/Framework.vue';
import Workspace from './layouts/workspace/Workspace.vue';

defineOptions({
  name: 'LowCodeDesigner',
});
const iframe = ref<HTMLIFrameElement | null>(null);
onMounted(async () => {
  if (!iframe.value)
    return;
  let html = await fetch('http://localhost:10002/lowcode/runtime/vue3/page').then(res => res.text());
  const base = `http://localhost:10002`;
  html = html.replace('<head>', `<head>\n<base href="${base}">`);
  iframe.value.srcdoc = html;
});
const services: Services = {
  uiService,
};

provide<Services>('services', services);
</script>

<template>
  <Framework>
    <template #header>
      <div>header</div>
    </template>
    <template #sidebar>
      <div>sidebar</div>
    </template>
    <template #workspace>
      <Workspace />
    </template>
    <template #propsPanel>
      <div>propsPanel</div>
    </template>
  </Framework>
</template>

<style>
#app {
  width: 100%;
  height: 100%;
  display: flex;
}
</style>
