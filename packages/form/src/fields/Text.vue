<script setup lang="ts">
import { Input } from 'ant-design-vue';
import fieldProps from '../utils/fieldProps';

defineOptions({
  name: 'l-fields-text',
});
defineProps(fieldProps);
</script>

<template>
  <Input v-model="model[name]" />
</template>
