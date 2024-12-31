<script setup lang="ts">
import type { ChildConfig, ContainerCommonConfig, FormState, FormValue } from '../schema';
import { computed, inject, ref, resolveComponent } from 'vue';
import { display as displayFunction, filterFunction } from '../utils/form';

defineOptions({
  name: 'LFormContainer',
});
const props = withDefaults(defineProps<{
  config: ChildConfig;
  model: FormValue;
  size?: 'small' | 'default' | 'large';
  prop?: string;
  labelWidth?: string;
  expandMore?: boolean;
  stepActive?: number | string;

}>(), {
  size: 'small',
  prop: '',
});
const lForm = inject<FormState | undefined>('lForm');
const expand = ref(false);
const name = computed(() => props.config.name || '');
const itemProp = computed(() => {
  let n: string | number = '';
  const { names } = props.config as any;
  if (names?.[0]) {
    [n] = names;
  }
  else if (name.value) {
    n = name.value;
  }
  else {
    return props.prop;
  }
  return `${props.prop}${props.prop ? '.' : ''}${n}`;
});
const items = computed(() => (props.config as ContainerCommonConfig).items);
const itemLabelWidth = computed(() => props.config.labelWidth || props.labelWidth);
const type = computed((): string => {
  let { type } = props.config;
  if (typeof type === 'function') {
    type = type(lForm, {
      model: props.model,
    });
  }
  if (type === 'form')
    return '';
  return type?.replace(/([A-Z])/g, '-$1').toLowerCase() || (items.value ? '' : 'text');
});
const disabled = computed(() => filterFunction(lForm, props.config.disabled, props));
const tagName = computed(() => {
  const component = resolveComponent(`l-${items.value ? 'form' : 'fields'}-${type.value}`);
  if (typeof component !== 'string')
    return component;
  return 'l-fields-text';
});
const display = computed((): boolean => {
  if (props.config.display === 'expand') {
    return expand.value;
  }

  return displayFunction(lForm, props.config.display, props);
});
const key = (config: any) => config[lForm?.keyProps];
const onChangeHandler = async function (v: FormValue, key?: string) {
  console.log('onChangeHandler', v, key);
};
</script>

<template>
  <div
    v-if="config"
    :style="config.tip ? 'display: flex;align-items: baseline;' : ''"
    :class="config.className"
    class="l-form-container"
  >
    <l-fields-hidden
      v-if="type === 'hidden'"
      :model="model"
      :config="config"
      :name="config.name"
      :disabled="disabled"
      :prop="itemProp"
    />

    <component
      :is="tagName"
      v-else-if="items && !config.text && type && display"
      :key="key(config)"
      :size="size"
      :model="model"
      :config="config"
      :name="name"
      :prop="itemProp"
      :step-active="stepActive"
      :expand-more="expand"
      :label-width="itemLabelWidth"
      @change="onChangeHandler"
    />
  </div>
</template>
