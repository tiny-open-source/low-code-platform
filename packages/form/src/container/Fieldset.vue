<script setup lang="ts">
import type { FieldsetConfig, FormState } from '../schema';
import { Checkbox } from 'ant-design-vue';
import { computed, inject, type PropType } from 'vue';

defineOptions({
  name: 'l-form-fieldset',
});
const props = defineProps({
  labelCol: String,
  model: {
    type: Object,
    default: () => ({}),
  },

  config: {
    type: Object as PropType<FieldsetConfig>,
    default: () => ({}),
  },

  prop: {
    type: String,
    default: () => '',
  },

  size: String,
});
const emit = defineEmits(['change']);
const lForm = inject<FormState | undefined>('lForm');
const name = computed(() => props.config.name || '');
const show = computed(() => {
  if (props.config.expand && name.value) {
    return props.model[name.value]?.value;
  }
  return true;
});
const lCol = computed(() => {
  if (props.config.items) {
    return props.config.labelCol || props.labelCol;
  }
  return props.config.labelCol || props.labelCol || (props.config.text ? null : '0');
});
const key = (item: any, index: number) => item[lForm?.keyProp || '__key'] ?? index;
function change() {
  emit('change', props.model);
}
</script>

<template>
  <fieldset v-if="name ? model[name] : model" class="l-fieldset">
    <Checkbox
      v-if="!show && name"
      v-model:checked="
        //eslint-disable-next-line vue/no-mutating-props
        model[name].value"
      :prop="`${prop}${prop ? '.' : ''}${config.name}.value`"
      :true-label="1"
      :false-label="0"
      @change="change"
    >
      <span v-html="config.legend" /><span v-if="config.extra" class="l-form-tip" v-html="config.extra" />
    </Checkbox>
    <legend v-else-if="config.checkbox && name">
      <Checkbox
        v-model:checked="
          //eslint-disable-next-line vue/no-mutating-props
          model[name].value"
        :prop="`${prop}${prop ? '.' : ''}${config.name}.value`"
        :true-label="1"
        :false-label="0"
        @change="change"
      >
        <span v-html="config.legend" /><span v-if="config.extra" class="l-form-tip" v-html="config.extra" />
      </Checkbox>
    </legend>
    <legend v-else>
      <span v-html="config.legend" />
      <span v-if="config.extra" class="l-form-tip" v-html="config.extra" />
    </legend>
    <div v-if="config.schematic && show" style="display: flex">
      <div style="flex: 1">
        <l-form-container
          v-for="(item, index) in config.items"
          :key="key(item, index)"
          :model="name ? model[name] : model"
          :config="item"
          :prop="prop"
          :label-col="lCol"
          :size="size"
          @change="change"
        />
      </div>

      <img class="m-form-schematic" :src="config.schematic">
    </div>

    <template v-else-if="show">
      <l-form-container
        v-for="(item, index) in config.items"
        :key="key(item, index)"
        :model="name ? model[name] : model"
        :config="item"
        :prop="prop"
        :label-col="lCol"
        :size="size"
        @change="change"
      />
    </template>
  </fieldset>
</template>
