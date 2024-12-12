<script setup lang="ts">
import Gesto from 'gesto';

defineOptions({
  name: 'Resizer',
});

const target = ref<HTMLElement | null>(null);

let getso: Gesto;

onMounted(() => {
  if (!target.value)
    return;

  getso = new Gesto(target.value, {
    container: window,
    pinchOutside: true,
  }).on('drag', (e) => {
    if (!target.value)
      return;
    console.log(e.deltaX);
  });
});
onUnmounted(() => {
  getso?.unset();
});
</script>

<template>
  <div ref="target" class="w-2 bg-coolGray-300 mx--2 h-full op-80 b-x-1 cursor-col-resize z-1 hover:b-coolGray-300 transition-border">
    <slot />
  </div>
</template>
