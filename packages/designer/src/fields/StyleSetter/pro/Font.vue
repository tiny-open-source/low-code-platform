<script setup lang="ts">
import type { StyleSchema } from '@lowcode/schema';
import { LFormContainer } from '@lowcode/form';
import { PicLeftOutlined } from '@vicons/antd';
import { markRaw } from 'vue';

defineProps<{
  values: Partial<StyleSchema>;
}>();
const emit = defineEmits(['change']);
const config = {
  type: '',
  items: [
    {
      type: 'row',
      items: [
        {
          labelWidth: '68px',
          name: 'fontSize',
          text: '字号',
          type: 'text',
        },
        {
          labelWidth: '68px',
          name: 'lineHeight',
          text: '行高',
          type: 'text',
        },
      ],
    },
    {
      name: 'fontWeight',
      text: '字重',
      labelWidth: '68px',
      type: 'select',
      options: ['normal', 'bold']
        .concat(
          Array.from({ length: 7 })
            .fill(1)
            .map((x, i) => `${i + 1}00`),
        )
        .map(item => ({
          value: item,
          text: item,
        })),
    },
    {
      labelWidth: '68px',
      name: 'color',
      text: '颜色',
      type: 'colorPicker',
    },
    {
      name: 'textAlign',
      text: '对齐',
      type: 'radioGroup',
      childType: 'button',
      labelWidth: '68px',
      options: [
        { value: 'left', icon: markRaw(PicLeftOutlined), tooltip: '左对齐 row' },
        { value: 'center', icon: markRaw(PicLeftOutlined), tooltip: '居中对齐 center' },
        { value: 'right', icon: markRaw(PicLeftOutlined), tooltip: '右对齐 right' },
      ],
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
