<script setup lang="ts">
import type { StyleSchema } from '@lowcode/schema';
import { LFormContainer } from '@lowcode/form';

const props = defineProps<{
  values: Partial<StyleSchema>;
}>();
const emit = defineEmits(['change']);
const config = {
  type: '',
  items: [
    {
      name: 'position',
      text: '定位',
      labelWidth: '68px',
      type: 'select',
      options: ['static', 'relative', 'absolute', 'fixed', 'sticky'].map(item => ({
        value: item,
        text: item,
      })),
    },
    {
      type: 'row',
      labelWidth: '68px',
      display: () => props.values.position !== 'static',
      items: [
        {
          name: 'left',
          text: 'left',
          type: 'text',
        },
        {
          name: 'top',
          text: 'top',
          type: 'text',
        },
      ],
    },
    {
      type: 'row',
      labelWidth: '68px',
      display: () => props.values.position !== 'static',
      items: [
        {
          name: 'right',
          text: 'right',
          type: 'text',
        },
        {
          name: 'bottom',
          text: 'bottom',
          type: 'text',
        },
      ],
    },
    {
      labelWidth: '68px',
      name: 'zIndex',
      text: 'zIndex',
      type: 'text',
    },
  ],
};
function change(value: string | StyleSchema) {
  emit('change', value);
}
</script>

<template>
  <LFormContainer :config="config" :model="values" @change="change" />
</template>

<style lang="scss" scoped></style>
