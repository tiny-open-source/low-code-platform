<script setup lang="ts">
import { ScrollViewer } from '@designer/utils/scroll-viewer';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  width?: number;
  height?: number;
  zoom: number;
}>(), {
  zoom: 1,
});
const target = ref<HTMLDivElement | null>(null);
const container = ref<HTMLDivElement | null>(null);

let scrollViewer: ScrollViewer;
onMounted(() => {
  if (!container.value || !target.value)
    return;
  scrollViewer = new ScrollViewer({
    container: container.value,
    target: target.value,
    zoom: props.zoom,
  });
});
const style = computed(() => (`
        width: ${props.width}px;
        height: ${(props.height || 0) - 40}px;
        position: absolute;
        margin-top: 30px;
      `));
watch(
  () => props.zoom,
  () => {
    scrollViewer.setZoom(props.zoom);
  },
);
onUnmounted(() => {
  scrollViewer.destroy();
});
defineExpose({
  container,
});
</script>

<template>
  <div ref="container" class="lc-d-scroll-viewer-container">
    <div ref="target" :style="style">
      <slot />
    </div>
  </div>
</template>
