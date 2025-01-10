<script setup lang="ts">
import type { EventOption } from '@lowcode/core';
import type { FormConfig } from '@lowcode/form';
import type { MApp, MNode } from '@lowcode/schema';
import type { MoveableOptions } from '@lowcode/stage';
import type StageCore from '@lowcode/stage';
import type { ComponentGroup, MenuBarData, Services, SideBarData, StageRect } from './type';
import componentListService from '@designer/services/component-list.service';
import designerService from '@designer/services/designer.service';
import eventsService from '@designer/services/events.service';
import historyService from '@designer/services/history.service';
import propsService from '@designer/services/props.service';
import uiService from '@designer/services/ui.service';
import { onUnmounted, provide, reactive, ref, toRaw, watch } from 'vue';
import Framework from './layouts/Framework.vue';
import NavMenu from './layouts/NavMenu.vue';
import PropsPanel from './layouts/PropsPanel.vue';
import Sidebar from './layouts/sidebar/Sidebar.vue';
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
    menu: MenuBarData;
    /** 左侧面板配置 */
    sidebar?: SideBarData;
    stageRect?: StageRect;
    componentGroupList?: ComponentGroup[];
    propsValues?: Record<string, MNode>;
  }>(),
  {
    defaultSelected: '',
    moveableOptions: () => ({}),
    propsConfigs: () => ({}),
    eventMethodList: () => ({}),
    menu: () => ({ left: [], right: [] }),
    componentGroupList: () => [],
    propsValues: () => ({}),
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
  componentListService,
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
  () => props.propsValues,
  values => propsService.setPropsValues(values),
  {
    immediate: true,
  },
);
watch(
  () => props.componentGroupList,
  componentGroupList => componentListService.setList(componentGroupList),
  {
    immediate: true,
  },
);
watch(
  () => props.eventMethodList,
  (eventMethodList) => {
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

watch(
  () => props.stageRect,
  stageRect => stageRect && uiService.set('stageRect', stageRect),
  {
    immediate: true,
  },
);

provide<Services>('services', services);
provide(
  'stageOptions',
  reactive({
    runtimeUrl: '/lowcode/runtime/vue3/playground',
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
      <slot name="header">
        <NavMenu :data="menu" />
      </slot>
    </template>
    <template #sidebar>
      <Sidebar />
    </template>
    <template #workspace>
      <slot name="workspace">
        <Workspace>
          <template #workspace-content>
            <slot name="workspace-content" :designer-service="designerService" />
          </template>
        </Workspace>
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
