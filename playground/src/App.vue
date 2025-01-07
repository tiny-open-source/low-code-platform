<script setup lang="ts">
import type { LowCodeDesigner, MenuBarData, MoveableOptions } from '@lowcode/designer';
import type StageCore from '@lowcode/stage';
import { type Id, NodeType } from '@lowcode/schema';
import { asyncLoadJs } from '@lowcode/utils';
import { PlayOutline } from '@vicons/ionicons5';
import { NDrawer, NDrawerContent } from 'naive-ui';
import serialize from 'serialize-javascript';
import { mockDSL } from './config/dsl';

const previewVisible = ref(false);
const designer = ref<InstanceType<typeof LowCodeDesigner>>();
const value = ref(mockDSL);
const propsValues = ref<Record<string, any>>({});
const propsConfigs = ref<Record<string, any>>({});
const eventMethodList = ref<Record<string, any>>({});

asyncLoadJs(
  `http://localhost:10002/lowcode/runtime/vue3/dist/assets/config.js`,
).then(() => {
  propsConfigs.value = (globalThis as any).lowcodePresetConfigs;
});
asyncLoadJs(
  `http://localhost:10002/lowcode/runtime/vue3/dist/assets/config.js`,
).then(() => {
  propsValues.value = (globalThis as any).lowcodePresetValues;
});
asyncLoadJs(
  `http://localhost:10002/lowcode/runtime/vue3/dist/assets/event.js`,
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

const menu: MenuBarData = {
  left: [
    {
      type: 'text',
      text: '魔方',
    },
  ],
  center: [],
  right: [
    {
      type: 'button',
      text: '预览',
      icon: PlayOutline,
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
  ],

};
</script>

<template>
  <LowCodeDesigner
    ref="designer"
    v-model="value"
    :default-selected="value.items[0].id"
    :moveable-options="moveableOptions"
    :props-configs="propsConfigs"
    :event-method-list="eventMethodList"
    :menu="menu"
  />
  <NDrawer v-model:show="previewVisible" :width="502" placement="right">
    <NDrawerContent title="预览">
      <iframe
        v-if="previewVisible"
        width="100%"
        height="817"
        :src="`/lowcode/runtime/vue3/page.html?localPreview=1&page=${designer?.designerService.get('page').id}`"
      />
    </NDrawerContent>
  </NDrawer>
</template>

<style>
#app {
  width: 100%;
  height: 100%;
  display: flex;
}
</style>
