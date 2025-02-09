<script setup lang="ts">
import type { MenuBarData, MoveableOptions } from '@lowcode/designer';
import type { Id } from '@lowcode/schema';
import type StageCore from '@lowcode/stage';
import { LowCodeDesigner } from '@lowcode/designer';
import { FigmaParser } from '@lowcode/dsl-resolver';
import { NodeType } from '@lowcode/schema';
import { asyncLoadJs } from '@lowcode/utils';
import { CodeOutlined, ImportOutlined, PlayCircleOutlined, SaveOutlined } from '@vicons/antd';
import { dateZhCN, NConfigProvider, NDialogProvider, zhCN } from 'naive-ui';
import serialize from 'serialize-javascript';
import { ThemeColorConfig } from '../theme.config';
import DeviceGroup from './components/DeviceGroup.vue';
import Preview from './components/Preview';
import componentGroupList from './configs/componentGroupList';
import { mockDSL } from './configs/dsl';
import { mockFigmaJson } from './figma-json';
import ImportDSL  from './components/Import'
const figmaParser = new FigmaParser();
const colorRef = ref(ThemeColorConfig);
const previewVisible = ref(false);
const importDialogVisible = ref(false)
const designer = ref<InstanceType<typeof LowCodeDesigner>>();
const value = ref(mockDSL as any);
const propsValues = ref<Record<string, any>>({});
const propsConfigs = ref<Record<string, any>>({});
const eventMethodList = ref<Record<string, any>>({});
const stageRectStr = ref('1024 * 600');
const stageRect = computed(() => {
  const [width, height] = stageRectStr.value.split('*').map(Number);
  return { width, height };
});
const { VITE_RUNTIME_PATH, VITE_ENTRY_PATH } = import.meta.env;
const runtimeUrl = `${VITE_RUNTIME_PATH}/playground/index.html`;
asyncLoadJs(
  `${VITE_ENTRY_PATH}/config/index.umd.js`,
).then(() => {
  propsConfigs.value = (globalThis as any).lowcodePresetConfigs;
});
asyncLoadJs(
  `${VITE_ENTRY_PATH}/value/index.umd.js`,
).then(() => {
  propsValues.value = (globalThis as any).lowcodePresetValues;
});
asyncLoadJs(
  `${VITE_ENTRY_PATH}/event/index.umd.js`,
).then(() => {
  eventMethodList.value = (globalThis as any).lowcodePresetEvents;
});
function parse(dsl: string) {
  value.value = figmaParser.parse(typeof dsl === 'string' ? JSON.parse(dsl) : dsl) as any;
}
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
    'lowcodeDSL',
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
      text: '导入',
      icon: ImportOutlined,
      handler: async () => {
        importDialogVisible.value = true
      },
    },
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
    abstract
    :theme-overrides="{
      common: colorRef,
    }"
    :locale="zhCN"
    :date-locale="dateZhCN"
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
        :runtime-url="runtimeUrl"
      >
        <template #workspace-content>
          <DeviceGroup v-model="stageRectStr" class="device-group" />
        </template>
      </LowCodeDesigner>
      <Preview v-if="designer?.designerService.get('page')" v-model:show="previewVisible" :src="`${VITE_RUNTIME_PATH}/page/index.html?localPreview=1&page=${designer?.designerService.get('page').id}`" />
      <ImportDSL v-model:show="importDialogVisible" @save="parse"></ImportDSL>
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
