<script setup lang="ts">
import type { LowCodeDesigner, MoveableOptions } from '@lowcode/designer';
import type StageCore from '@lowcode/stage';
import { NodeType } from '@lowcode/schema';
import { asyncLoadJs } from '@lowcode/utils';
import { mockDSL } from './config/dsl';

const designer = ref<InstanceType<typeof LowCodeDesigner>>();
const value = ref(mockDSL);
const propsValues = ref<Record<string, any>>({});
const propsConfigs = ref<Record<string, any>>({});
asyncLoadJs(`http://localhost:10002/lowcode/runtime/vue3/dist/assets/config.js`).then(() => {
  propsConfigs.value = (globalThis as any).lowcodePresetConfigs;
});
asyncLoadJs(`http://localhost:10002/lowcode/runtime/vue3/dist/assets/config.js`).then(() => {
  propsValues.value = (globalThis as any).lowcodePresetValues;
});
asyncLoadJs(`http://localhost:10002/lowcode/runtime/vue3/dist/assets/config.js`).then(() => {
  // eventMethodList.value = (globalThis as any).magicPresetEvents;
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
</script>

<template>
  <LowCodeDesigner ref="designer" v-model="value" :default-selected="value.items[0].id" :moveable-options="moveableOptions" :props-configs="propsConfigs" />
</template>

<style>
#app {
  width: 100%;
  height: 100%;
  display: flex;
}
</style>
