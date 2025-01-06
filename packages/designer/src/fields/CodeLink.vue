<script setup lang="ts">
import serialize from 'serialize-javascript';
import { ref, watchEffect } from 'vue';

interface CodeLinkConfig {
  type: 'code-link';
  name: string;
  text?: string;
  formTitle?: string;
}
defineOptions({
  name: 'l-fields-code-link',
});
const props = withDefaults(defineProps<{
  config: CodeLinkConfig;
  model: Record<string, any>;
  name: string;
  prop: string;
}>(), {
  model: () => ({}),
  name: '',
  prop: '',
});
// const emit = defineEmits(['change']);

const dslModelValue = ref<{ form: Record<string, any> }>({
  form: {},
});

watchEffect(() => {
  if (!props.model || !props.name)
    return;

  dslModelValue.value.form[props.name] = serialize(props.model[props.name], {
    space: 2,
    unsafe: true,
  }).replace(/"(\w+)":\s/g, '$1: ');
  console.log('🚀 ~ watchEffect ~ dslModelValue:', dslModelValue);
});
</script>

<template>
  <div />
</template>
