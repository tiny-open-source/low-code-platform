<script setup lang="ts">
import type { EventOption } from '@lowcode/core';
import type { FormConfig } from '@lowcode/form';
import type { MApp, MNode } from '@lowcode/schema';
import type { MoveableOptions } from '@lowcode/stage';
import type StageCore from '@lowcode/stage';
import type { Services } from './type';
import designerService from '@designer/services/designer.service';
import eventsService from '@designer/services/events.service';
import historyService from '@designer/services/history.service';
import propsService from '@designer/services/props.service';
import uiService from '@designer/services/ui.service';
import { onUnmounted, provide, reactive, ref, toRaw, watch } from 'vue';
import Framework from './layouts/Framework.vue';
import PropsPanel from './layouts/PropsPanel.vue';
import Workspace from './layouts/workspace/Workspace.vue';

defineOptions({
  name: 'LowCodeDesigner',
});

const props = withDefaults(
  defineProps<{
    defaultSelected?: number | string;
    moveableOptions: MoveableOptions | ((core?: StageCore) => MoveableOptions);
    propsConfigs: Record<string, FormConfig>;
    eventMethodList: Record<string, { events: EventOption[]; methods: EventOption[] }>;
  }>(),
  {
    defaultSelected: '',
    moveableOptions: () => ({}),
    propsConfigs: () => ({}),
    eventMethodList: () => ({}),
  },
);

defineEmits(['propsPanelMounted']);

const propsPanel = ref<InstanceType<typeof PropsPanel> | null>(null);

const modelValue = defineModel<MApp>({ required: true });

designerService.on('root-change', () => {
  const node
    = designerService.get<MNode | null>('node') || props.defaultSelected;
  node && designerService.select(node);
  modelValue.value = toRaw(designerService.get('root'));
});

const services: Services = {
  uiService,
  historyService,
  designerService,
  propsService,
};

watch(
  modelValue,
  (n) => {
    designerService.set('root', toRaw(n));
  },
  {
    immediate: true,
  },
);

watch(
  () => props.eventMethodList,
  (eventMethodList) => {
    console.log('eventMethodList', eventMethodList);

    const eventsList: Record<string, EventOption[]> = {};
    const methodsList: Record<string, EventOption[]> = {};

    Object.keys(eventMethodList).forEach((type: string) => {
      eventsList[type] = eventMethodList[type].events;
      methodsList[type] = eventMethodList[type].methods;
    });

    eventsService.setEvents(eventsList);
    eventsService.setMethods(methodsList);
  },
  {
    immediate: true,
  },
);

watch(
  () => props.propsConfigs,
  configs => propsService.setPropsConfigs(configs),
  {
    immediate: true,
  },
);
provide<Services>('services', services);
provide(
  'stageOptions',
  reactive({
    runtimeUrl: 'http://localhost:10002/lowcode/runtime/vue3/playground',
    autoScrollIntoView: true,
    render: null,
    moveableOptions: props.moveableOptions,
    canSelect: (el: HTMLElement) => Boolean(el.id),
    updateDragEl: null,
  }),
);

onUnmounted(() => designerService.destroy());
defineExpose({
  ...services,
});
</script>

<template>
  <Framework>
    <template #header>
      <div>header</div>
    </template>
    <template #sidebar>
      <div>{{ modelValue }}</div>
    </template>
    <template #workspace>
      <slot name="workspace">
        <Workspace />
      </slot>
    </template>
    <template #propsPanel>
      <slot name="propsPanel">
        <PropsPanel
          ref="propsPanel"
          @mounted="(instance) => $emit('propsPanelMounted', instance)"
        />
      </slot>
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
