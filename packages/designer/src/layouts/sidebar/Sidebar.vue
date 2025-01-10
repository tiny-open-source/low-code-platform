<script setup lang="ts">
import type { SideBarData } from '@designer/type';
import { NTabPane, NTabs } from 'naive-ui';
import { ref, watch } from 'vue';
import TabPane from './TabPane.vue';

defineOptions({
  name: 'l-sidebar',
});

const props = withDefaults(defineProps<{
  data?: SideBarData;
}>(), {
  data: () => ({ type: 'tabs', status: '组件', items: ['component-list', 'layer'] }),
});

console.log('🚀 ~ NTabPane:', NTabPane);

console.log('🚀 ~ TabPane:', TabPane);

const activeTabName = ref(props.data?.status);
watch(
  () => props.data?.status,
  (status) => {
    activeTabName.value = status || '0';
  },
);
</script>

<template>
  <NTabs
    v-if="data.type === 'tabs' && data.items.length"
    class="lc-d-sidebar"
    size="small"
    animated
    placement="left"
    type="line"
    style="height: 100%;"
    :active-name="activeTabName"
  >
    <TabPane v-for="(item, index) in data" :key="index" :data="item" />
  </NTabs>
</template>
