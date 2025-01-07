<script setup lang="ts">
import type { GetColumnWidth, MenuBarData, Services } from '@designer/type';
import { computed, inject } from 'vue';
import ToolButton from '../components/ToolButton.vue';

defineOptions({
  name: 'nav-menu',
});

const props = withDefaults(defineProps<{
  data: MenuBarData;
  height?: number;
}>(), {
  data: () => ({}),
});
const services = inject<Services>('services');

const keys = computed(() => Object.keys(props.data) as Array<keyof MenuBarData>);

const columnWidth = computed(() => services?.uiService.get<GetColumnWidth>('columnWidth'));
</script>

<template>
  <div class="lc-d-nav-menu" :style="{ height: `${height}px` }">
    <div v-for="key in keys" :key="key" :class="`menu-${key}`" :style="`width: ${columnWidth?.[key]}px`">
      <ToolButton v-for="(item, index) in data[key]" :key="index" :data="item" />
    </div>
  </div>
</template>
