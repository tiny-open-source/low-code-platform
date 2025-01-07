<script lang="ts">
import type { Component, PropType } from 'vue';
import { Accessibility } from '@vicons/ionicons5';
import { NIcon } from 'naive-ui';
import { defineComponent, toRaw } from 'vue';

export default defineComponent({
  name: 'm-icon',

  components: { Accessibility, NIcon },

  props: {
    icon: {
      type: [String, Object] as PropType<string | Component>,
    },
  },

  setup() {
    return {
      toRaw,
    };
  },
});
</script>

<template>
  <NIcon v-if="!icon">
    <Accessibility />
  </NIcon>
  <img v-else-if="typeof icon === 'string' && icon.startsWith('http')" :src="icon">
  <i v-else-if="typeof icon === 'string'" :class="icon" />
  <NIcon v-else>
    <component :is="toRaw(icon)" />
  </NIcon>
</template>
