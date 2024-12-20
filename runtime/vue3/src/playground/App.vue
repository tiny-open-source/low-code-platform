<script setup lang="ts">
import type { Id, MApp, MNode } from '@lowcode/schema';
import type { LowCode, RemoveData, UpdateData } from '@lowcode/stage';
import Core from '@lowcode/core';
import { getNodePath } from '@lowcode/utils';
import { computed, nextTick, onMounted, provide, reactive, ref, watch } from 'vue';

declare global {
  interface Window {
    lowcode: LowCode;
  }
}

const root = ref<MApp>();

const curPageId = ref<Id>();

const selectedId = ref<Id>();

const pageConfig = computed(
  () => root.value?.items?.find((item: MNode) => item.id === curPageId.value) || root.value?.items?.[0],
);

const app = new Core({
  config: root.value,
  platform: 'designer',
});

provide('app', app);

watch(pageConfig, async () => {
  await nextTick();
  const page = document.querySelector<HTMLElement>('.lowcode-ui-page');
  page && window.lowcode.onPageElUpdate(page);
});

onMounted(() => {
  setTimeout(() => {
    window.lowcode?.onRuntimeReady({
      getApp() {
        return app;
      },
      updateRootConfig(config: MApp) {
        console.log('update config', config);
        root.value = config;
      },
      updatePageId(id: Id) {
        console.log('update page id', id);
        curPageId.value = id;
        app?.setPage(id);
      },
      getSnapElements() {
        return Array.from(document.querySelectorAll<HTMLElement>('[class*=magic-ui][id]'));
      },
      select(id: Id) {
        console.log('select config', id);
        selectedId.value = id;
        const el = document.getElementById(`${id}`);
        if (el)
          return el;
        return nextTick().then(() => document.getElementById(`${id}`) as HTMLElement);
      },
      add({ config }: UpdateData) {
        console.log('add config', config);
        if (!root.value)
          throw new Error('error');
        if (!selectedId.value)
          throw new Error('error');
        const path = getNodePath(selectedId.value, [root.value]);
        const node = path.pop();
        const parent = node?.items ? node : path.pop();
        if (!parent)
          throw new Error('未找到父节点');
        // 当前选中节点作为父节点
        parent.items?.push(config);
      },
      update({ config }: UpdateData) {
        console.log('update config', config);
        if (!root.value)
          throw new Error('error');
        const path = getNodePath(config.id, [root.value]);
        const node = path.pop();
        const parent = path.pop();
        if (!node)
          throw new Error('未找到目标节点');
        if (!parent)
          throw new Error('未找到父节点');
        const index = parent.items?.findIndex((child: MNode) => child.id === node.id);
        parent.items.splice(index, 1, reactive(config));
      },
      remove({ id }: RemoveData) {
        if (!root.value)
          throw new Error('error');
        const path = getNodePath(id, [root.value]);
        const node = path.pop();
        if (!node)
          throw new Error('未找到目标元素');
        const parent = path.pop();
        if (!parent)
          throw new Error('未找到父元素');
        const index = parent.items?.findIndex((child: MNode) => child.id === node.id);
        parent.items.splice(index, 1);
      },
    });
  });
});
</script>

<template>
  <low-code-runtime-ui-page v-if="pageConfig" :config="pageConfig" />
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
