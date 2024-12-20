<script setup lang="ts">
import type { Services, StageRect } from '@designer/type';
import type { MApp } from '@lowcode/schema';
import type { Runtime } from '@lowcode/stage';
import ScrollViewer from '@designer/components/ScrollViewer.vue';
import StageCore from '@lowcode/stage';
import { cloneDeep } from 'lodash-es';
import { computed, inject, onMounted, onUnmounted, ref, toRaw } from 'vue';

const stageContainer = ref<HTMLDivElement | null>(null);
const services = inject<Services>('services');

let runtime: Runtime | null = null;
const root = computed(() => services?.designerService.get<MApp>('root'));
const stageRect = computed(() => services?.uiService.get<StageRect>('stageRect'));
const zoom = computed(() => services?.uiService.get<number>('zoom') || 1);
const stageWrap = ref<InstanceType<typeof ScrollViewer> | null>(null);
let stage: StageCore | null = null;
onMounted(() => {
  stage = new StageCore({
    runtimeUrl: 'http://localhost:10002/lowcode/runtime/vue3/playground',
    autoScrollIntoView: true,

  });
  stage.mount(stageContainer.value!);
  stage.on('runtime-ready', (rt) => {
    runtime = rt;

    // toRaw返回的值是一个引用而非快照，需要cloneDeep
    root.value && runtime?.updateRootConfig?.(cloneDeep(toRaw(root.value)));
  });
});

const resizeObserver = new ResizeObserver((entries) => {
  for (const { contentRect } of entries) {
    services?.uiService.set('stageContainerRect', {
      width: contentRect.width,
      height: contentRect.height,
    });
  }
});
onMounted(() => {
  stageWrap.value?.container && resizeObserver.observe(stageWrap.value.container);
});
onUnmounted(() => {
  stage?.destroy();
  resizeObserver.disconnect();
  services?.designerService.set('stage', null);
});
</script>

<template>
  <ScrollViewer ref="stageWrap" class="lc-d-stage" :width="stageRect?.width" :height="stageRect?.height" :zoom="zoom">
    <div ref="stageContainer" class="lc-d-stage-container" :style="`transform: scale(${zoom})`" />
  </ScrollViewer>
</template>

<style lang="scss" scoped></style>
