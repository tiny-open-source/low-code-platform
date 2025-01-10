<script setup lang="ts">
import type { SideComponent, SideItem } from '@designer/type';
import { BlockOutlined, CheckSquareOutlined } from '@vicons/antd';
import { NTabPane } from 'naive-ui';
import { computed } from 'vue';

defineOptions({
  name: 'TabPane',
  alias: ['TabPanel'],
  __TAB_PANE__: true,
});

const props = defineProps<{
  data: any;
}>();

const config = computed<SideComponent | undefined>(() => {
  if (typeof props.data !== 'string') {
    return props.data;
  }

  switch (props.data) {
    case 'component-list':
      return {
        type: 'component',
        icon: BlockOutlined,
        text: '组件',
        component: null,
        slots: {},
      };
    case 'layer':
      return {
        type: 'component',
        icon: CheckSquareOutlined,
        text: '已选组件',
        component: null,
        slots: {},
      };
    default:
      return undefined;
  }
});
</script>

<template>
  组件
  <!-- <NTabPane name="oasis" tab="组件">
    组件
  </NTabPane> -->
  <!-- <NTabPane v-if="config" :name="config.text" :tab="config.text">
    <template #tab>
      123
      <div :key="config.text">
        <m-icon v-if="config.icon" :icon="config.icon" />
        <div v-if="config.text" class="lc-d-tab-panel-title">
          {{ config.text }}
        </div>
      </div>
    </template>

    <component :is="config.component" v-bind="config.props || {}" v-on="config?.listeners || {}">
      <template v-if="config.slots?.layerNodeContent" #layer-node-content="{ data, node }">
        <component :is="config.slots?.layerNodeContent" :data="data" :node="node" />
      </template>
    </component>
  </NTabPane> -->
</template>

<style lang="scss" scoped></style>
