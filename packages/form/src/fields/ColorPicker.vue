<script setup lang="ts">
import type { ColorInputWithoutInstance } from 'tinycolor2';
import type { HiddenConfig } from '../schema';
import { computed, type PropType, ref } from 'vue';
import fieldProps from '../utils/fieldProps';

defineOptions({
  name: 'l-fields-color-picker',
});
const props = defineProps({
  ...fieldProps,
  config: {
    type: Object as PropType<HiddenConfig>,
    required: true,
  },
});
const emit = defineEmits(['change']);
const name = computed(() => props.name || props.config.name || '');
function handleColor(value: string) {
  console.log('🚀 ~ handleColor ~ value:', value);
  emit('change', value);
}
</script>

<template>
  <color-picker v-if="model" v-model:pure-color="model[name]" format="hex" @pure-color-change="handleColor" />
</template>
