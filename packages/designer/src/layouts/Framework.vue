<script setup lang="ts">
import type { GetColumnWidth, Services } from '@designer/type';
import type { MApp } from '@lowcode/schema';
import { NScrollbar } from 'naive-ui';
import { computed, inject } from 'vue';
import Resizer from './Resizer.vue';

defineProps<{
  codeOptions?: Record<string, any>;
}>();
const { uiService, designerService } = inject<Services>('services')!;
const columnWidth = computed(() => uiService.get<GetColumnWidth>('columnWidth'));

const showSrc = computed(() => uiService?.get<boolean>('showSrc'));
const root = computed(() => designerService?.get<MApp>('root'));
</script>

<template>
  <div class="lc-d-framework">
    <div class="lc-d-framework__nav">
      <slot name="header" />
    </div>

    <low-code-editor v-if="showSrc" :code-options="codeOptions" :init-values="root" class="lc-d-framework__content" />
    <div v-else class="lc-d-framework__content">
      <div class="lc-d-framework__content__left" :style="{ width: `${columnWidth.left}px` }">
        <slot name="sidebar" />
      </div>
      <Resizer type="left" />
      <div class="lc-d-framework__content__center" :style="{ width: `${columnWidth.center}px` }">
        <slot name="workspace" />
      </div>
      <Resizer type="right" />
      <div class="lc-d-framework__content__right" :style="{ width: `${columnWidth.right}px` }">
        <NScrollbar>
          <slot name="props-panel" />
        </NScrollbar>
      </div>
    </div>
  </div>
</template>
