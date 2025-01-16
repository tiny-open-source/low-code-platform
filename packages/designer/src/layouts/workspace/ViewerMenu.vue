<script setup lang="ts">
import type { MenuItem, Services } from '@designer/type';
import type StageCore from '@lowcode/stage';
import ContentMenu from '@designer/components/ContentMenu.vue';

import { LayerOffset, Layout } from '@designer/type';
import { COPY_STORAGE_KEY } from '@designer/utils/editor';
import { NodeType } from '@lowcode/schema';
import { CopyOutlined } from '@vicons/antd';
import { computed, inject, markRaw, onMounted, reactive, ref, watch } from 'vue';

const services = inject<Services>('services');
const stageContentMenu = inject<MenuItem[]>('stageContentMenu', []);
const designerService = services?.designerService;

const menu = ref<InstanceType<typeof ContentMenu>>();

const allowCenter = ref(false);
const allowPaste = ref(false);
const node = computed(() => designerService?.get('node'));
const parent = computed(() => designerService?.get('parent'));
const isPage = computed(() => node.value?.type === NodeType.PAGE);
onMounted(() => {
  const data = globalThis.localStorage.getItem(COPY_STORAGE_KEY);
  allowPaste.value = data !== 'undefined' && !!data;
});
watch(
  parent,
  async () => {
    if (!parent.value || !designerService)
      return (allowCenter.value = false);
    const layout = await designerService.getLayout(parent.value);
    allowCenter.value
          = [Layout.ABSOLUTE, Layout.FIXED].includes(layout)
          && ![NodeType.ROOT, NodeType.PAGE, 'pop'].includes(`${node.value?.type}`);
  },
  { immediate: true },
);
const menuData: MenuItem[] = reactive([
  {
    type: 'button',
    text: '水平居中',
    display: () => allowCenter.value,
    handler: () => {
      node.value && designerService?.alignCenter(node.value);
    },

  },
  {
    type: 'button',
    text: '复制',
    icon: markRaw(CopyOutlined),
    handler: () => {
      node.value && designerService?.copy(node.value);
      allowPaste.value = true;
    },
  },
  {
    type: 'button',
    text: '粘贴',
    display: () => allowPaste.value,
    handler: () => {
      const stage = designerService?.get<StageCore>('stage');

      const rect = menu.value?.$el.getBoundingClientRect();
      const parentRect = stage?.container?.getBoundingClientRect();
      let left = (rect?.left || 0) - (parentRect?.left || 0);
      let top = (rect?.top || 0) - (parentRect?.top || 0);

      if (node.value?.items && stage) {
        const parentEl = stage.renderer.contentWindow?.document.getElementById(`${node.value.id}`);
        const parentElRect = parentEl?.getBoundingClientRect();
        left = left - (parentElRect?.left || 0);
        top = top - (parentElRect?.top || 0);
      }

      designerService?.paste({ left, top });
    },
  },
  {
    type: 'divider',
    direction: 'horizontal',
    display: () => !isPage.value,
  },
  {
    type: 'button',
    text: '上移一层',
    icon: markRaw(CopyOutlined),
    display: () => !isPage.value,
    handler: () => {
      designerService?.moveLayer(1);
    },
  },
  {
    type: 'button',
    text: '下移一层',
    icon: markRaw(CopyOutlined),
    display: () => !isPage.value,
    handler: () => {
      designerService?.moveLayer(-1);
    },
  },
  {
    type: 'button',
    text: '置顶',
    display: () => !isPage.value,
    handler: () => {
      designerService?.moveLayer(LayerOffset.TOP);
    },
  },
  {
    type: 'button',
    text: '置底',
    display: () => !isPage.value,
    handler: () => {
      designerService?.moveLayer(LayerOffset.BOTTOM);
    },
  },
  {
    type: 'divider',
    direction: 'horizontal',
    display: () => !isPage.value,
  },
  {
    type: 'button',
    text: '删除',
    icon: markRaw(CopyOutlined),
    display: () => !isPage.value,
    handler: () => {
      node.value && designerService?.remove(node.value);
    },
  },
  {
    type: 'divider',
    direction: 'horizontal',
  },
  {
    type: 'button',
    text: '清空参考线',
    handler: () => {
      designerService?.get<StageCore>('stage').clearGuides();
    },
  },
  ...stageContentMenu,
]);
defineExpose({
  show(e: MouseEvent) {
    menu.value?.show(e);
  },
});
</script>

<template>
  <ContentMenu ref="menu" :menu-data="menuData" />
</template>
