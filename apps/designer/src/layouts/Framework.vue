<script setup lang="ts">
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue';
import Resizer from './Resizer.vue';

const columnWidth = ref({
  left: '200px',
  center: '500px',
  right: '200px',
});
</script>

<template>
  <div class="framework w-full h-full flex-1" flex="~ col">
    <div class="nav bg-blue text-[#070303] font-normal m-0" flex="~ justify-between items-center basis-[35px]">
      <slot />
    </div>
    <div class="content w-full h-[calc(100%-35px)]" flex="~ justify-between">
      <div class="left" :style="{ width: columnWidth.left }">
        <slot name="sidebar" />
      </div>
      <Resizer type="left" />
      <div class="center relative transform-gpu flex-1 h-full" :style="{ width: columnWidth.center }">
        <slot name="workspace" />
      </div>
      <Resizer type="right" />
      <div class="right" :style="{ width: columnWidth.right }">
        <div class="h-full overflow-auto scrollbar scrollbar-rounded scrollbar-w-8px scrollbar-radius-2 scrollbar-track-radius-4 scrollbar-thumb-radius-4">
          <slot name="propsPanel" />
        </div>
      </div>
    </div>
  </div>
</template>
