<script setup lang="ts">
import type { DesignerService } from '@designer/services/designer.service';
import type { Services } from '@designer/type';
import type { MNode } from '@lowcode/schema';
import type StageCore from '@lowcode/stage';
import type { TreeOption, TreeOverrideNodeClickBehavior, TreeOverrideNodeClickBehaviorReturn } from 'naive-ui';
import { getNodePath } from '@lowcode/utils';
import { SearchOutlined } from '@vicons/antd';
import { throttle } from 'lodash-es';
import { NIcon, NInput, NTree } from 'naive-ui';
import { computed, h, inject, ref, type Ref, toRaw, watchEffect } from 'vue';

defineOptions({
  name: 'low-code-layer-panel',
});

const throttleTime = 150;

function useStatus(tree: Ref<InstanceType<typeof NTree> | undefined>, designerService: Services['designerService']) {
  const highlightNode = ref<MNode>();
  const node = ref<MNode>();
  const page = computed(() => designerService?.get('page'));
  const root = computed(() => designerService?.get('root'));
  watchEffect(() => {
    if (!tree.value)
      return;
    node.value = designerService?.get('node');
    // node.value && tree.value.setCurrentKey(node.value.id, true);

    // const parent = editorService?.get('parent');
    // if (!parent?.id) return;

    // const treeNode = tree.value.getNode(parent.id);
    // treeNode?.updateChildren();

    highlightNode.value = designerService?.get('highlightNode');
  });

  return {
    values: computed(() => (page.value ? [page.value] : [])),
    expandedKeys: computed(() => (node.value ? getNodePath(node.value!.id, toRaw(root.value.items)).map(i => i.id) : [])),
    highlightNode,
    clickNode: node,
  };
}
const clicked = ref(false);
const tree = ref<InstanceType<typeof NTree>>();
const services = inject<Services>('services');
const editorService = services!.designerService;
const statusData = useStatus(tree, editorService);
const { values, expandedKeys, highlightNode } = statusData;
const canHighlight = computed(
  () => statusData.highlightNode.value?.id !== statusData.clickNode.value?.id && !clicked.value,
);

function toggleClickFlag() {
  clicked.value = !clicked.value;
}
function highlight(data: MNode, editorService?: DesignerService) {
  if (!data?.id) {
    throw new Error('没有id');
  }
  editorService?.highlight(data);
  editorService?.get<StageCore>('stage')?.highlight(data.id);
}
const highlightHandler = throttle((data: MNode) => {
  highlight(data, editorService);
}, throttleTime);
const searchText = ref('');
async function select(data: MNode, editorService?: DesignerService) {
  if (!data.id) {
    throw new Error('没有id');
  }

  await editorService?.select(data);
  editorService?.get<StageCore>('stage')?.select(data.id);
}
const override: TreeOverrideNodeClickBehavior = ({ option }): TreeOverrideNodeClickBehaviorReturn => {
  if (services?.uiService.get<boolean>('uiSelectMode')) {
    document.dispatchEvent(new CustomEvent('ui-select', { detail: option }));
    return 'toggleExpand';
  }
  select(option as MNode, editorService);
  return 'toggleExpand';
};
</script>

<template>
  <div class="lc-d-layer-panel">
    <div
      class="search-input"
    >
      <NInput
        v-model:value="searchText"
        placeholder="输入关键字进行过滤"
        size="tiny"
        clearable
      >
        <template #prefix>
          <NIcon :component="SearchOutlined" />
        </template>
      </NInput>
    </div>
    <NTree
      ref="tree"
      class="lc-d-layer-panel__tree"
      block-line
      show-line
      draggable
      key-field="id"
      label-field="name"
      children-field="items"
      :override-default-node-click-behavior="override"
      :expand-on-click="false"
      :data="values"
      :render-label="({ option, selected }) => h('div', {
        id: option.key,
        class: {
          'cus-tree-node-hover': canHighlight && option.key === highlightNode?.id,
        },
        onMousedown: toggleClickFlag,
        onMouseup: toggleClickFlag,
        onMousemove: highlightHandler,
      }, h('span', `${option.name} (${option.id})`))"
    />
    {{ expandedKeys }}
  </div>
</template>

<style lang="scss" scoped></style>
