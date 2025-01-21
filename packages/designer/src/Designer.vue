<script setup lang="ts">
import type { EventOption } from '@lowcode/core';
import type { FormConfig } from '@lowcode/form';
import type { MApp, MNode } from '@lowcode/schema';
import type StageCore from '@lowcode/stage';
import type { ComponentGroup, MenuBarData, Services, SideBarData, StageRect } from './type';
import componentListService from '@designer/services/component-list.service';
import designerService from '@designer/services/designer.service';
import eventsService from '@designer/services/events.service';
import historyService from '@designer/services/history.service';
import propsService from '@designer/services/props.service';
import storageService from '@designer/services/storage.service';
import uiService from '@designer/services/ui.service';
import { CONTAINER_HIGHLIGHT_CLASS, type MoveableOptions } from '@lowcode/stage';
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
    isContainer?: (el: HTMLElement) => boolean | Promise<boolean>;
    containerHighlightClassName?: string;
    containerHighlightDuration?: number;
  }>(),
  {
    defaultSelected: '',
    moveableOptions: () => ({}),
    propsConfigs: () => ({}),
    eventMethodList: () => ({}),
    menu: () => ({ left: [], right: [] }),
    componentGroupList: () => [],
    propsValues: () => ({}),
    isContainer: (el: HTMLElement) => el.classList.contains('lowcode-ui-container'),
    containerHighlightClassName: CONTAINER_HIGHLIGHT_CLASS,
    containerHighlightDuration: 800,
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
  storageService,
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
    runtimeUrl: '/low-code-platform/playground/runtime/vue3/playground/index.html',
    autoScrollIntoView: true,
    render: null,
    moveableOptions: props.moveableOptions,
    canSelect: (el: HTMLElement) => Boolean(el.id),
    updateDragEl: null,
    isContainer: props.isContainer,
    containerHighlightClassName: props.containerHighlightClassName,
    containerHighlightDuration: props.containerHighlightDuration,
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
      <slot name="sidebar" :designer-service="designerService">
        <Sidebar :data="sidebar">
          <template #layer-panel-header>
            <slot name="layer-panel-header" />
          </template>

          <template #component-list-panel-header>
            <slot name="component-list-panel-header" />
          </template>
        </Sidebar>
      </slot>
    </template>
    <template #workspace>
      <slot name="workspace">
        <Workspace>
          <template #workspace-content>
            <slot name="workspace-content" />
          </template>
        </Workspace>
      </slot>
    </template>
    <template #props-panel>
      <slot name="props-panel">
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
