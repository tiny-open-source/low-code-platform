<script setup lang="ts">
import type { LowCodeDesigner, MenuBarData, MoveableOptions } from '@lowcode/designer';
import type StageCore from '@lowcode/stage';
import { type Id, NodeType } from '@lowcode/schema';
import { asyncLoadJs } from '@lowcode/utils';
import { CodeOutlined, PlayCircleOutlined, SaveOutlined } from '@vicons/antd';
import { NConfigProvider, NDialogProvider, NDrawer, NDrawerContent } from 'naive-ui';
import serialize from 'serialize-javascript';
import { ThemeColorConfig } from '../theme.config';
import DeviceGroup from './components/DeviceGroup.vue';
import Preview from './components/Preview';
import componentGroupList from './configs/componentGroupList';
import { mockDSL } from './configs/dsl';

const colorRef = ref(ThemeColorConfig);
const previewVisible = ref(false);
const designer = ref<InstanceType<typeof LowCodeDesigner>>();
const value = ref(mockDSL);
const propsValues = ref<Record<string, any>>({});
const propsConfigs = ref<Record<string, any>>({});
const eventMethodList = ref<Record<string, any>>({});
const stageRectStr = ref('1024 * 600');
const stageRect = computed(() => {
  const [width, height] = stageRectStr.value.split('*').map(Number);
  return { width, height };
});

asyncLoadJs(
  `/low-code-platform/playground/runtime/vue3/dist/assets/config.js`,
).then(() => {
  propsConfigs.value = (globalThis as any).lowcodePresetConfigs;
});
asyncLoadJs(
  `/low-code-platform/playground/runtime/vue3/dist/assets/value.js`,
).then(() => {
  propsValues.value = (globalThis as any).lowcodePresetValues;
});
asyncLoadJs(
  `/low-code-platform/playground/runtime/vue3/dist/assets/event.js`,
).then(() => {
  eventMethodList.value = (globalThis as any).lowcodePresetEvents;
});
function moveableOptions(core?: StageCore): MoveableOptions {
  const options: MoveableOptions = {};
  const id = core?.dr?.target?.id;

  if (!id || !designer.value)
    return options;

  const node = designer.value.designerService.getNodeById(id);

  if (!node)
    return options;

  const isPage = node.type === NodeType.PAGE;

  options.draggable = !isPage;
  options.resizable = !isPage;
  options.rotatable = !isPage;

  return options;
}

function save() {
  localStorage.setItem(
    'lowcodeUiConfig',
    serialize(toRaw(value.value), {
      space: 2,
      unsafe: true,
    }).replace(/"(\w+)":\s/g, '$1: '),
  );
  designer.value?.designerService.resetModifiedNodeId();
}
save();
const menu: MenuBarData = {
  left: [
    {
      type: 'text',
      text: '模板编辑器',
    },
  ],
  center: ['delete', 'undo', 'redo', 'guides', 'rule', 'zoom'],
  right: [
    '/',
    {
      type: 'button',
      text: '预览',
      icon: PlayCircleOutlined,
      handler: async (services) => {
        if (services?.designerService.get<Map<Id, Id>>('modifiedNodeIds').size > 0) {
          try {
            save();
          }
          catch (e) {
            console.error(e);
          }
        }

        previewVisible.value = true;
      },
    },
    {
      type: 'button',
      text: '保存',
      icon: SaveOutlined,
      handler: () => {
        save();
      },
    },
    '/',
    {
      type: 'button',
      icon: CodeOutlined,
      tooltip: '源码',
      handler: service => service?.uiService.set('showSrc', !service?.uiService.get('showSrc')),
    },
  ],
};
</script>

<template>
  <NConfigProvider
    abstract :theme-overrides="{
      common: colorRef,
    }"
  >
    <NDialogProvider>
      <LowCodeDesigner
        ref="designer"
        v-model="value"
        :default-selected="value.items[0].id"
        :moveable-options="moveableOptions"
        :props-configs="propsConfigs"
        :props-values="propsValues"
        :event-method-list="eventMethodList"
        :component-group-list="componentGroupList"
        :stage-rect="stageRect"
        :menu="menu"
      >
        <template #workspace-content>
          <DeviceGroup v-model="stageRectStr" class="device-group" />
        </template>
      </LowCodeDesigner>
      <Preview v-model:show="previewVisible" :src="`/low-code-platform/playground/runtime/vue3/page.html?localPreview=1&page=${designer?.designerService.get('page').id}`" />
    </NDialogProvider>
  </NConfigProvider>
</template>

<style>
#app {
  width: 100%;
  height: 100%;
  display: flex;
}
.device-group {
  width: 180px;
  position: absolute;
  top: 10px;
  right: 40px;
  z-index: 10;
}
</style>
