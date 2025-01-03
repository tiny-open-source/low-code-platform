<script setup lang="ts">
import type { GetColumnWidth, Services } from '@designer/type';
import { NScrollbar } from 'naive-ui';
import { computed, inject } from 'vue';
import Resizer from './Resizer.vue';

const { uiService } = inject<Services>('services')!;
const columnWidth = computed(() => uiService.get<GetColumnWidth>('columnWidth'));
</script>

<template>
  <div class="lc-d-framework">
    <div class="lc-d-framework__nav">
      <slot name="header" />
    </div>
    <div class="lc-d-framework__content">
      <div class="lc-d-framework__content__left" :style="{ width: `${columnWidth.left}px` }">
        <NScrollbar>
          <slot name="sidebar" />
        </NScrollbar>
      </div>
      <Resizer type="left" />
      <div class="lc-d-framework__content__center" :style="{ width: `${columnWidth.center}px` }">
        <slot name="workspace" />
      </div>
      <Resizer type="right" />
      <div class="lc-d-framework__content__right" :style="{ width: `${columnWidth.right}px` }">
        <NScrollbar>
          <slot name="propsPanel" />
        </NScrollbar>
      </div>
    </div>
  </div>
</template>
