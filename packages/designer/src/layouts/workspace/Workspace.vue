<script setup lang="ts">
import type { Services } from '@designer/type';
import { inject, ref } from 'vue';
import LowCodeStage from './Stage.vue';

defineOptions({
  name: 'Workspace',
});
const workspace = ref<HTMLElement | null>(null);
</script>

<template>
  <div ref="workspace" class="lc-d-workspace" tabindex="1">
    <LowCodeStage />
    <slot name="workspace-content" />
  </div>
</template>
