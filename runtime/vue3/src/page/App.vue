<script setup lang="ts">
import type Core from '@lowcode/core';

const app = inject<Core | undefined>('app');
const pageConfig = reactive(app?.page?.data || {});
</script>

<template>
  <div>{{ pageConfig }}</div>
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
