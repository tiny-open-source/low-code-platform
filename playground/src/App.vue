<script setup lang="ts">
import { mockDSL } from './config/dsl';

const value = ref(mockDSL);
</script>

<template>
  <LowCodeDesigner v-model="value" />
</template>

<style>
#app {
  width: 100%;
  height: 100%;
  display: flex;
}
</style>
