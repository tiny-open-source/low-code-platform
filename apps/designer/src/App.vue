<script setup lang="ts">
import type { Services } from './type';
import uiService from '@/services/ui.service';
import Framework from './layouts/Framework.vue';

const services: Services = {
  uiService,
};

provide<Services>('services', services);
</script>

<template>
  <Framework />
</template>

<style>
#app {
  width: 100%;
  height: 100%;
  display: flex;
}
</style>
