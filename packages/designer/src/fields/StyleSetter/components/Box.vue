<script lang="ts" setup>
import type { FormValue } from '@lowcode/form';

withDefaults(
  defineProps<{
    model: FormValue;
  }>(),
  {},
);

const emit = defineEmits(['change']);

const list = [
  {
    name: 'marginTop',
    class: 'outer-top-border',
  },
  {
    name: 'marginRight',
    class: 'outer-right-border',
  },
  {
    name: 'marginBottom',
    text: 'MARGIN',
    class: 'outer-bottom-border',
  },
  {
    name: 'marginLeft',
    class: 'outer-left-border',
  },
  {
    name: 'paddingTop',
    class: 'inner-top-border',
  },
  {
    name: 'paddingRight',
    class: 'inner-right-border',
  },
  {
    name: 'paddingBottom',
    text: 'PADDING',
    class: 'inner-bottom-border',
  },
  {
    name: 'paddingLeft',
    class: 'inner-left-border',
  },
];

function change(event: Event, name: string) {
  emit('change', (event.target as HTMLInputElement).value, name);
}
</script>

<template>
  <div class="layout-box-container">
    <div v-for="(item, index) in list" :key="index" :class="item.class">
      <span v-if="item.text" class="help-txt">{{ item.text }}</span>
      <span class="next-input">
        <input
          v-model="
            // eslint-disable-next-line vue/no-mutating-props
            model[item.name]"
          :title="model[item.name]"
          placeholder="0"
          @change="change($event, item.name)"
        >
      </span>
    </div>
  </div>
</template>
