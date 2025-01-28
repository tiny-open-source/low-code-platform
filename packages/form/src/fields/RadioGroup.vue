<script setup lang="ts">
import type { PropType } from 'vue';
import { NButton, NIcon, NRadioButton, NRadioGroup } from 'naive-ui';
import fieldProps from '../utils/fieldProps';
import { useAddField } from '../utils/useAddField';

defineOptions({
  name: 'LFieldsRadioGroup',
});
const props = defineProps({
  ...fieldProps,
  size: {
    type: String as PropType<'small' | 'medium' | 'large' | undefined>,
    default: 'medium',
  },
  config: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(['change', 'input']);
useAddField(props.prop);

function changeHandler(v: string | number | boolean) {
  emit('change', v);
}
</script>

<template>
  <NRadioGroup v-if="model" v-model:value="model[name]" :size="size" name="radiobuttongroup1" @update:value="changeHandler">
    <NRadioButton
      v-for="option in config.options"
      :key="option.value"
      :value="option.value"
      :label="option.text"
      @change.stop
    >
      <NIcon v-if="option.icon">
        <component :is="option.icon" />
      </NIcon>
      <span>{{ option.text }}</span>
    </NRadioButton>
  </NRadioGroup>
</template>

<style lang="scss" scoped></style>
