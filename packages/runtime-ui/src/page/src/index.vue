<script setup lang="ts">
import type { MPage } from '@lowcode/schema';
import LowCodeRuntimeUiComponent from '../../Component.vue';
import { useApp } from '../../use-app';

defineOptions({
  name: 'LowCodeRuntimeUiPage',
});
const props = defineProps<{
  config: MPage;
}>();

const app = useApp(props);

const style = app?.transformStyle(props.config.style || {});
</script>

<template>
  <div
    :id="`${config.id || ''}`"
    :class="`lowcode-ui-page${config.className ? ` ${config.className}` : ''}`"
    :style="style"
  >
    <slot />
    <LowCodeRuntimeUiComponent v-for="item in config.items" :key="item.id" :config="item" />
  </div>
</template>
