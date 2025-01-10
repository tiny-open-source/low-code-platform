<script setup lang="ts">
import type { SideBarData } from '@designer/type';
import { BlockOutlined, CheckSquareOutlined } from '@vicons/antd';
import { NTabPane, NTabs } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import MIcon from '../../components/Icon.vue';
import ComponentListPanel from './ComponentListPanel.vue';

defineOptions({
  name: 'l-sidebar',
});

const props = withDefaults(defineProps<{
  data?: SideBarData;
}>(), {
  data: () => ({ type: 'tabs', status: '组件', items: ['component-list', 'layer'] }),
});

const activeTabName = ref(props.data?.status);
watch(
  () => props.data?.status,
  (status) => {
    activeTabName.value = status || '0';
  },
);
const dataConfigs = computed(() => {
  console.log(props.data);

  return props.data?.items.map((item) => {
    if (typeof item !== 'string') {
      return item;
    }

    switch (item) {
      case 'component-list':
        return {
          type: 'component',
          icon: BlockOutlined,
          text: '组件',
          component: ComponentListPanel,
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
  }).filter(Boolean) || [];
}) as any;
</script>

<template>
  <NTabs
    v-if="data.type === 'tabs' && data.items.length"
    v-model:value="activeTabName"
    class="lc-d-sidebar"
    size="small"
    animated
    placement="left"
    type="line"
    style="height: 100%;"
  >
    <NTabPane v-for="(config, index) in dataConfigs" :key="index" :name="config.text" :tab="config.text">
      <template #tab>
        <div :key="config.text">
          <MIcon v-if="config.icon" :icon="config.icon" />
          <div v-if="config.text" class="lc-d-tab-panel-title">
            {{ config.text }}
          </div>
        </div>
      </template>

      <component :is="config.component" v-bind="config.props || {}" v-on="config?.listeners || {}">
        <template v-if="config.slots?.layerNodeContent" #layer-node-content="{ data: innerData, node }">
          <component :is="config.slots?.layerNodeContent" :data="innerData" :node="node" />
        </template>
      </component>
    </NTabPane>
  </NTabs>
</template>
