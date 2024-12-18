<script setup lang="ts">
import type Core from '@lowcode/core';
import type { MApp, MNode } from '@lowcode/schema';
import type { LowCode } from '@lowcode/stage';

declare global {
  interface Window {
    lowcode: LowCode;
  }
}

const root = ref<MApp>();
const app = inject<Core | undefined>('app');
const pageConfig = computed(
  () => root.value,
);

onMounted(() => {
  setTimeout(() => {
    window.lowcode?.onRuntimeReady({
      updateRootConfig(config: MApp) {
        console.log('update config', config);
        root.value = config;
      },
    });
  });
});
</script>

<template>
  <div>{{ JSON.stringify(pageConfig) }}</div>
</template>

<style>
#app {
  position: relative;
  overflow: auto;
}

#app::-webkit-scrollbar {
  width: 0 !important;
  display: none;
}
</style>
