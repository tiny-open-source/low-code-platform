<script setup lang="ts" name="UISelect">
import { useElementBounding, useElementByPoint, useMouse } from '@vueuse/core';

import { NButton } from 'naive-ui';
import { computed, reactive } from 'vue';

defineOptions({
  name: 'l-fields-ui-select',
});

const { x, y } = useMouse({ type: 'client' });
const { element } = useElementByPoint({ x, y });
const bounding = reactive(useElementBounding(element));
const boxStyles = computed(() => {
  if (element.value) {
    return {
      display: 'block',
      width: `${bounding.width}px`,
      height: `${bounding.height}px`,
      left: `${bounding.left}px`,
      top: `${bounding.top}px`,
      backgroundColor: '#3eaf7c44',
      transition: 'all 0.05s linear',
    } as Record<string, string | number>;
  }
  return {
    display: 'none',
  };
});
</script>

<template>
  <NButton text type="primary">
    点击此处选择
  </NButton>
</template>
