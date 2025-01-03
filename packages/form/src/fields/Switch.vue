<script setup lang="ts">
import type { PropType } from 'vue';
import type { SwitchConfig } from '../schema';
import { NSwitch } from 'naive-ui';
import { computed } from 'vue';
import fieldProps from '../utils/fieldProps';

defineOptions({
  name: 'l-fields-switch',
});
const props = defineProps({
  ...fieldProps,
  config: {
    type: Object as PropType<SwitchConfig>,
    required: true,
  },
});
const emit = defineEmits(['change', 'input']);
const modelName = computed(() => props.name || props.config.name || '');
const activeValue = computed(() => {
  if (typeof props.config.activeValue === 'undefined') {
    if (props.config.filter === 'number') {
      return 1;
    }
  }
  else {
    return props.config.activeValue;
  }

  return true;
});
const inactiveValue = computed(() => {
  if (typeof props.config.inactiveValue === 'undefined') {
    if (props.config.filter === 'number') {
      return 0;
    }
  }
  else {
    return props.config.inactiveValue;
  }

  return false;
});
function changeHandler(v: boolean | number | string) {
  emit('change', v);
};
</script>

<template>
  <NSwitch v-model:value="model[modelName]" :checked-value="activeValue" :un-checked-value="inactiveValue" :disabled="disabled" @change="changeHandler" />
</template>
