<script setup lang="ts">
import type { PropType } from 'vue';
import type { FormState, SelectConfig, SelectGroupOption, SelectOption } from '../schema';
import { SelectOption as Option, Select } from 'ant-design-vue';
import { computed, inject, onBeforeMount, ref, watch } from 'vue';
import fieldProps from '../utils/fieldProps';

defineOptions({
  name: 'l-fields-select',
});
const props = defineProps({
  ...fieldProps,
  config: {
    type: Object as PropType<SelectConfig>,
    required: true,
  },
});
const emit = defineEmits(['change', 'input']);
const options = ref<any[]>([]);
const lForm = inject<FormState | undefined>('lForm');
const modelName = computed(() => props.name || props.config.name || '');
if (typeof props.config.options === 'function') {
  watch(
    () => lForm?.values,
    () => {
      typeof props.config.options === 'function'
      && Promise.resolve(
        props.config.options(lForm, {
          model: props.model,
          prop: props.prop,
          formValues: lForm?.values,
          formValue: lForm?.values,
          config: props.config,
        }),
      ).then((data) => {
        options.value = data;
      });
    },
    {
      deep: true,
      immediate: true,
    },
  );
}
else if (Array.isArray(props.config.options)) {
  watch(
    () => props.config.options,
    () => {
      options.value = props.config.options as SelectOption[] | SelectGroupOption[];
    },
    { immediate: true },
  );
}
else if (props.config.option) {
  onBeforeMount(() => {
    if (!props.model)
      return;
    const v = props.model[props.name];
    if (Array.isArray(v) ? v.length : v) {
      getInitOption().then((data) => {
        options.value = data;
      });
    }
  });
}
function getInitOption() {
  return Promise.resolve([]);
}
function changeHandler(value: any) {
  emit('change', value);
}
</script>

<template>
  <Select
    v-if="model"
    v-model:value="model[modelName]"
    class="l-select" allow-clear :size="size" :placeholder="config.placeholder" @change="changeHandler"
  >
    <template v-if="config.group" />
    <template v-else>
      <Option v-for="item in options" :key="item.value" :value="item.value">
        {{ item.text }}
      </Option>
    </template>
  </Select>
</template>
