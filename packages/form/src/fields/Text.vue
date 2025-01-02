<script setup lang="ts">
import type { ChangeEvent } from 'ant-design-vue/es/_util/EventInterface';
import type { PropType } from 'vue';
import type { FormState, TextConfig } from '../schema';
import { Input } from 'ant-design-vue';
import { computed, inject } from 'vue';
import fieldProps from '../utils/fieldProps';

defineOptions({
  name: 'l-fields-text',
});
const props = defineProps({
  ...fieldProps,
  config: {
    type: Object as PropType<TextConfig>,
    required: true,
  },
});
const emit = defineEmits(['change', 'input']);
const lForm = inject<FormState | undefined>('lForm');
const modelName = computed(() => props.name || props.config.name || '');
function changeHandler(e: ChangeEvent) {
  emit('change', e.target.value);
}
function inputHandler(e: ChangeEvent) {
  emit('input', modelName, e.target.value);
  lForm?.$emit('fieldInput', props.prop, e.target.value);
}
</script>

<template>
  <Input v-model:value="model[modelName]" allow-clear :size="size" :placeholder="config.placeholder" @change="changeHandler" @input="inputHandler" />
</template>
