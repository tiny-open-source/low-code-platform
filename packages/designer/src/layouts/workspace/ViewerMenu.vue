<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);

defineExpose({
  show: () => {
    visible.value = true;
  },
});
</script>

<template>
  <div v-if="visible">
    contextMenu
  </div>
</template>
