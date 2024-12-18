<script setup lang="ts">
import type { Services } from '@designer/type';
import type { MApp } from '@lowcode/schema';
import type { Runtime } from '@lowcode/stage';
import StageCore from '@lowcode/stage';
import { cloneDeep } from 'lodash-es';
import { computed, inject, onMounted, ref, toRaw } from 'vue';

const stageContainer = ref<HTMLDivElement | null>(null);
const services = inject<Services>('services');

let runtime: Runtime | null = null;
const root = computed(() => services?.designerService.get<MApp>('root'));
onMounted(() => {
  const stage = new StageCore({
    runtimeUrl: 'http://localhost:10002/lowcode/runtime/vue3/playground',
    autoScrollIntoView: true,

  });
  stage.mount(stageContainer.value!);
  stage.on('runtime-ready', (rt) => {
    console.log('runtime-ready');

    runtime = rt;
    console.log(root.value);

    // toRaw返回的值是一个引用而非快照，需要cloneDeep
    root.value && runtime?.updateRootConfig?.(cloneDeep(toRaw(root.value)));
  });
});
</script>

<template>
  <div ref="stageContainer" class="lc-stage-container" />
</template>

<style lang="scss" scoped></style>
