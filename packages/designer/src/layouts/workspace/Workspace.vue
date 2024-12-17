<script setup lang="ts">
import { onMounted, ref } from 'vue';

defineOptions({
  name: 'Workspace',
});
const iframe = ref<HTMLIFrameElement | null>(null);
onMounted(async () => {
  if (!iframe.value)
    return;
  let html = await fetch('http://localhost:10002/lowcode/runtime/vue3/page').then(res => res.text());
  const base = `http://localhost:10002`;
  html = html.replace('<head>', `<head>\n<base href="${base}">`);
  iframe.value.srcdoc = html;
});
</script>

<template>
  <iframe ref="iframe" frameborder="1" />
</template>

<style>
#app {
  width: 100%;
  height: 100%;
  display: flex;
}
</style>
