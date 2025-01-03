<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui';
import type { ColumnConfig, TableConfig } from '../schema';
import { GridOutline, ScanOutline, TrashOutline } from '@vicons/ionicons5';
import { cloneDeep } from 'lodash-es';
import { NButton, NDataTable, NIcon, NTag } from 'naive-ui';
import { computed, h, ref } from 'vue';
import { LFormContainer } from '..';

defineOptions({
  name: 'l-form-table',
});

const props = withDefaults(defineProps<{
  config: TableConfig;
  model: Record<string, any>;
  name: string;
  prop: string;
}>(), {
  model: () => ({}),
});
const emit = defineEmits(['change']);
const modelName = computed(() => props.name || props.config.name || '');
function getProp(index: number) {
  return `${props.prop}${props.prop ? '.' : ''}${index + 1}`;
}
function makeConfig(config: ColumnConfig) {
  const newConfig = cloneDeep(config);
  delete newConfig.display;
  return newConfig;
}
const columns = computed(() => props.config.items.map(
  item =>
    ({
      title: item.label,
      key: item.name,
      ellipsis: {
        tooltip: true,
      },
      render(row: any, index: number) {
        return h(LFormContainer, {
          labelWidth: '0',
          prop: getProp(index),
          config: makeConfig(item),
          model: row,
          on: {
            change() {
              emit('change', props.model[modelName.value]);
            },
          },
        });
      },
    }),
));
const mergedColumns = computed(() => {
  const _columns = cloneDeep(columns.value);
  const extraColumns: DataTableColumns = [
    {
      title: '操作',
      key: 'action',
      render(row) {
        return h(
          NButton,
          {
            strong: true,
            size: 'medium',
            type: 'error',
            quaternary: true,
          },
          { icon: () => {
            return h(NIcon, { }, { default: () => h(TrashOutline) });
          } },
        );
      },
    },
    {
      title: '序号',
      key: 'tags',
      render: (_, index) => {
        return `${index + 1}`;
      },
    },
  ];
  return [...extraColumns, ..._columns];
});

const data = [
  { name: '张三', age: 18, tags: [h(NTag, null, { default: () => 'tag1' })] },
  { name: '李四', age: 19, tags: [h(NTag, null, { default: () => 'tag2' })] },
  { name: '王五', age: 20, tags: [h(NTag, null, { default: () => 'tag3' })] },
];
const lTable = ref<HTMLElement | null>(null);
</script>

<template>
  <div ref="lTable" class="l-fields-table" :class="{ 'm-fields-table-item-extra': config.itemExtra }">
    <span v-if="config.extra" style="color: rgba(0, 0, 0, 0.45)" v-html="config.extra" />
    <div class="l-fields-table-content">
      <NDataTable
        v-if="model[modelName]"
        :bordered="config.border"
        :max-height="config.maxHeight"
        :single-line="false"
        :columns="mergedColumns"
        :data="data"
      />
      <slot />
      <NButton type="primary" size="small">
        添加
      </NButton> &nbsp;
      <NButton type="primary" size="small">
        <template #icon>
          <NIcon>
            <GridOutline />
          </NIcon>
        </template>
        展开配置
      </NButton>&nbsp;
      <NButton type="primary" size="small">
        <template #icon>
          <NIcon>
            <ScanOutline />
          </NIcon>
        </template>
        全屏编辑
      </NButton>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
