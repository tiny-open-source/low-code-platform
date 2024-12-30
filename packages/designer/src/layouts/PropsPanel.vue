<script setup lang="ts">
import type { FormConfig, FormValue } from '@lowcode/form';
import { LForm } from '@lowcode/form';
import { ref } from 'vue';

defineOptions({
  name: 'PropsPanel',
});

const values = ref<FormValue>({});
const curFormConfig = ref<FormConfig>();
</script>

<template>
  <LForm :config="curFormConfig" :init-values="values" />
</template>
