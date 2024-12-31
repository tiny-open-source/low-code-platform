<script setup lang="ts">
import type { Services } from '@designer/type';
import type { FormConfig, FormValue } from '@lowcode/form';
import type { MNode } from '@lowcode/schema';
import { LForm } from '@lowcode/form';
import { computed, getCurrentInstance, inject, onMounted, ref, watchEffect } from 'vue';

defineOptions({
  name: 'PropsPanel',
});
const emit = defineEmits(['mounted']);

const configForm = ref<InstanceType<typeof LForm>>();
const services = inject<Services>('services');
const propsPanelSize = computed(() => services?.uiService.get('propsPanelSize') || 'small');
const internalInstance = getCurrentInstance();
const values = ref<FormValue>({});
const curFormConfig = ref<FormConfig>();
const node = computed(() => services?.designerService.get<MNode | null>('node'));

async function submit() {
  try {
    // const values = await configForm.value?.submitForm();
    // services?.editorService.update(values);
  }
  catch (e: any) {
    console.error(e);
  }
}

async function init() {
  if (!node.value) {
    curFormConfig.value = [];
    return;
  }
  // 先判断是容器还是纯文本
  const type = node.value.type || (node.value.items ? 'container' : 'text');

  curFormConfig.value = (await services?.propsService.getPropsConfig(type)) || [];

  values.value = node.value;
}

watchEffect(init);

services?.propsService.on('props-configs-change', init);

onMounted(() => {
  emit('mounted', internalInstance);
});
</script>

<template>
  <LForm
    ref="configForm"
    :class="`lc-d-props-panel ${propsPanelSize}`" :config="curFormConfig" :init-values="values" @change="submit"
  />
</template>
