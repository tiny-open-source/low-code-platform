<script setup lang="ts">
import type { StyleSchema } from '@lowcode/schema';
import { LFormContainer } from '@lowcode/form';
import Border from '../components/Border.vue';

defineProps<{
  values: Partial<StyleSchema>;
}>();
const emit = defineEmits(['change']);
const config = {
  type: '',
  items: [
    {
      labelWidth: '68px',
      name: 'borderRadius',
      text: '圆角',
      type: 'text',
    },
  ],
};
function change(value: string | StyleSchema, name?: string) {
  emit('change', value, name);
}
</script>

<template>
  <LFormContainer :config="config" :model="values" @change="change" />
  <Border :model="values" @change="change" />
</template>
