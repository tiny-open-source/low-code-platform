<script setup lang="ts">
import type { HiddenConfig } from '../schema';
import { NColorPicker } from 'naive-ui';
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
  emit('change', value);
}
</script>

<template>
  <NColorPicker v-if="model" v-model:value="model[name]" @update:value="handleColor" />
</template>
