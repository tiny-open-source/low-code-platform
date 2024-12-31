<script setup lang="ts" name="LForm">
import type { FormConfig, FormState, FormValue } from './schema';
import { Form } from 'ant-design-vue';
import { isEqual } from 'lodash-es';
import { provide, reactive, ref, toRaw, watch } from 'vue';
import { initValue } from './utils/form';

defineOptions({
  name: 'LForm',
});
const props = withDefaults(defineProps<{
  initValues: Record<string, any>;
  parentValues?: Record<string, any>;
  config?: FormConfig;

  labelCol?: Record<string, any>;
  wrapperCol?: Record<string, any>;
  disabled?: boolean;

  height?: string;

  stepActive?: number | string;
  size?: 'small' | 'default' | 'large';
  layout?: 'horizontal' | 'vertical' | 'inline';
  labelPosition?: 'left' | 'right';
  keyProp?: string;
  popperClass?: string;
}>(), {
  initValues: () => ({}),
  parentValues: () => ({}),
  config: () => [],
  labelCol: () => ({ span: 8 }),
  wrapperCol: () => ({ span: 16 }),
  disabled: false,
  height: 'auto',
  stepActive: 1,

  size: 'default',
  layout: 'horizontal',
  labelPosition: 'right',
  keyProp: '__key',
  popperClass: '',
});
const emit = defineEmits(['change', 'field-input', 'field-change']);
const lForm = ref<InstanceType<typeof Form>>();

const initialized = ref(false);
const values = ref<FormValue>({});
const fields = new Map<string, any>();
const formState: FormState = reactive<FormState>({
  keyProp: props.keyProp,
  popperClass: props.popperClass,
  config: props.config,
  initValues: props.initValues,
  parentValues: props.parentValues,
  values,
  $emit: emit as (event: string, ...args: any[]) => void,
  fields,
  setField: (prop: string, field: any) => fields.set(prop, field),
  getField: (prop: string) => fields.get(prop),
  deleteField: (prop: string) => fields.delete(prop),
  post: () => {
    // TODO
  },
});
provide('lForm', formState);
watch(
  [() => props.config, () => props.initValues],
  ([config], [preConfig]) => {
    if (!isEqual(toRaw(config), toRaw(preConfig))) {
      initialized.value = false;
    }

    initValue(formState, {
      initValues: props.initValues,
      config: props.config,
    }).then((value) => {
      values.value = value;
      initialized.value = true;
    });
  },
  { immediate: true },
);
</script>

<template>
  <Form ref="lForm" class="lc-f" :model="values" :label-col="labelCol" :wrapper-col="wrapperCol" :label-align="labelPosition" :disabled="disabled" :layout="layout">
    <template v-if="initialized && Array.isArray(config)">
      <LFormContainer
        v-for="(item, index) in config"
        :key="item[keyProp] ?? index"
        :config="item"
        :model="values"
      />
    </template>
  </Form>
</template>
