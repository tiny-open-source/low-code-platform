<script setup lang="ts">
import type { MApp } from '@lowcode/schema';
import type { Services } from './type';
import designerService from '@designer/services/designer.service';
import historyService from '@designer/services/history.service';
import uiService from '@designer/services/ui.service';
import { provide, reactive, toRaw, watch } from 'vue';
import Framework from './layouts/Framework.vue';
import Workspace from './layouts/workspace/Workspace.vue';

defineOptions({
  name: 'LowCodeDesigner',
});
const services: Services = {
  uiService,
  historyService,
  designerService,
};
const modelValue = defineModel<MApp>({ required: true });

watch(modelValue, (n) => {
  designerService.set('root', toRaw(n));
}, {
  immediate: true,
});

provide<Services>('services', services);
provide(
  'stageOptions',
  reactive({
    runtimeUrl: 'http://localhost:10002/lowcode/runtime/vue3/playground',
    autoScrollIntoView: true,
    render: null,
    moveableOptions: {},
    canSelect: (el: HTMLElement) => Boolean(el.id),
    updateDragEl: null,
  }),
);
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
