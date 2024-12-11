<script setup lang="ts">
const columnWidth = ref({
  left: '200px',
  center: '500px',
  right: '200px',
});
</script>

<template>
  <div class="framework w-full" flex="~ col">
    <div class="nav bg-blue text-[#070303] font-normal m-0" flex="~ justify-between items-center basis-[35px]">
      <slot />
    </div>
    <div class="content w-full h-[calc(100%-35px)]" flex="~ justify-between">
      <div class="left" :style="{ width: columnWidth.left }" />
      <div class="center" :style="{ width: columnWidth.center }">
        <slot />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
