<script setup lang="ts">
import type { MApp, MContainer, MNode, MPage } from '@lowcode/schema';
import type { Runtime, SortEventData, UpdateEventData } from '@lowcode/stage';
import ScrollViewer from '@designer/components/ScrollViewer.vue';
import { H_GUIDE_LINE_STORAGE_KEY, Layout, type Services, type StageOptions, type StageRect, V_GUIDE_LINE_STORAGE_KEY } from '@designer/type';
import { getGuideLineFromCache } from '@designer/utils/editor';
import StageCore, { calcValueByFontsize, getOffset, GuidesType } from '@lowcode/stage';
import { cloneDeep } from 'lodash-es';
import { computed, inject, markRaw, onMounted, onUnmounted, ref, toRaw, watch, watchEffect } from 'vue';
import ViewerMenu from './ViewerMenu.vue';

const stageContainer = ref<HTMLDivElement | null>(null);
const stageOptions = inject<StageOptions>('stageOptions');
const services = inject<Services>('services');

let runtime: Runtime | null = null;

const root = computed(() => services?.designerService.get<MApp>('root'));
const stageRect = computed(() => services?.uiService.get<StageRect>('stageRect'));
const zoom = computed(() => services?.uiService.get<number>('zoom') || 1);
const uiSelectMode = computed(() => services?.uiService.get<boolean>('uiSelectMode'));
const page = computed(() => services?.designerService.get<MPage>('page'));
const node = computed(() => services?.designerService.get<MNode>('node'));
const stageWrap = ref<InstanceType<typeof ScrollViewer> | null>(null);
const menu = ref<InstanceType<typeof ViewerMenu>>();
let stage: StageCore | null = null;
const getGuideLineKey = (key: string) => `${key}_${root.value?.id}_${page.value?.id}`;

watchEffect(() => {
  if (stage)
    return;
  if (!stageContainer.value)
    return;
  if (!(stageOptions?.runtimeUrl || stageOptions?.render) || !root.value)
    return;
  if (!root.value)
    return;
  stage = new StageCore({
    runtimeUrl: stageOptions?.runtimeUrl,
    autoScrollIntoView: true,
    zoom: zoom.value,
    isContainer: stageOptions.isContainer,
    containerHighlightClassName: stageOptions.containerHighlightClassName,
    containerHighlightDuration: stageOptions.containerHighlightDuration,
    canSelect: (el, event, stop) => {
      const elCanSelect = stageOptions.canSelect(el);
      // 在组件联动过程中不能再往下选择，返回并触发 ui-select
      if (uiSelectMode.value && elCanSelect && event.type === 'mousedown') {
        document.dispatchEvent(new CustomEvent('ui-select', { detail: el }));
        return stop();
      }
      return elCanSelect;
    },
    moveableOptions: stageOptions.moveableOptions,
    updateDragEl: stageOptions.updateDragEl,
  });
  services?.designerService.set('stage', markRaw(stage));

  stage.mount(stageContainer.value);

  stage.mask.setGuides([
    getGuideLineFromCache(getGuideLineKey(H_GUIDE_LINE_STORAGE_KEY)),
    getGuideLineFromCache(getGuideLineKey(V_GUIDE_LINE_STORAGE_KEY)),
  ]);

  stage?.on('select', (el: HTMLElement) => {
    services?.designerService.select(el.id);
  });

  stage?.on('highlight', (el: HTMLElement) => {
    services?.designerService.highlight(el.id);
  });

  stage?.on('update', (ev: UpdateEventData) => {
    if (ev.parentEl) {
      services?.designerService.moveToContainer({ id: ev.el.id, style: ev.style }, ev.parentEl.id);
      return;
    }
    services?.designerService.update({ id: ev.el.id, style: ev.style });
  });

  stage?.on('sort', (ev: SortEventData) => {
    services?.designerService.sort(ev.src, ev.dist);
  });

  stage?.on('changeGuides', (e) => {
    services?.uiService.set('showGuides', true);

    if (!root.value || !page.value)
      return;

    const storageKey = getGuideLineKey(
      e.type === GuidesType.HORIZONTAL ? H_GUIDE_LINE_STORAGE_KEY : V_GUIDE_LINE_STORAGE_KEY,
    );
    if (e.guides.length) {
      globalThis.localStorage.setItem(storageKey, JSON.stringify(e.guides));
    }
    else {
      globalThis.localStorage.removeItem(storageKey);
    }
  });
  if (!node.value?.id)
    return;
  stage.on('runtime-ready', (rt) => {
    runtime = rt;
    // toRaw返回的值是一个引用而非快照，需要cloneDeep
    root.value && runtime?.updateRootConfig?.(cloneDeep(toRaw(root.value)));
    page.value?.id && runtime?.updatePageId?.(page.value.id);
    setTimeout(() => {
      node.value && stage?.select(toRaw(node.value.id));
    });
  });
});
watch(zoom, (zoom) => {
  if (!stage || !zoom)
    return;
  stage.setZoom(zoom);
});

watch(root, (root) => {
  if (runtime && root) {
    runtime.updateRootConfig?.(cloneDeep(toRaw(root)));
  }
});
const resizeObserver = new ResizeObserver((entries) => {
  for (const { contentRect } of entries) {
    services?.uiService.set('stageContainerRect', {
      width: contentRect.width,
      height: contentRect.height,
    });
  }
});
async function dropHandler(e: DragEvent) {
  e.preventDefault();

  const doc = stage?.renderer.contentWindow?.document;
  const parentEl: HTMLElement | null | undefined = doc?.querySelector(
    `.${stageOptions?.containerHighlightClassName}`,
  );

  let parent: MContainer | undefined = page.value;
  if (parentEl) {
    parent = services?.designerService.getNodeById(parentEl.id, false) as MContainer;
  }

  if (e.dataTransfer && parent && stageContainer.value && stage) {
    // eslint-disable-next-line no-eval
    const config = eval(`(${e.dataTransfer.getData('data')})`);
    const layout = await services?.designerService.getLayout(parent);

    const containerRect = stageContainer.value.getBoundingClientRect();
    const { scrollTop, scrollLeft } = stage.mask;

    const { style = {} } = config;

    let top = 0;
    let left = 0;
    let position = 'relative';

    if (layout === Layout.ABSOLUTE) {
      position = 'absolute';
      top = e.clientY - containerRect.top + scrollTop;
      left = e.clientX - containerRect.left + scrollLeft;

      if (parentEl && doc) {
        const { left: parentLeft, top: parentTop } = getOffset(parentEl);
        left = left - calcValueByFontsize(doc, parentLeft);
        top = top - calcValueByFontsize(doc, parentTop);
      }
    }

    config.style = {
      ...style,
      position,
      top,
      left,
    };

    config.inputEvent = e;
    services?.designerService.add(config, parent);
  }
}
function dragoverHandler(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
}
function contextmenuHandler(e: MouseEvent) {
  e.preventDefault();
  if (menu.value) {
    menu.value.show(e);
  }
}
onMounted(() => {
  stageWrap.value?.container && resizeObserver.observe(stageWrap.value.container);
});
onUnmounted(() => {
  stage?.destroy();
  resizeObserver.disconnect();
  services?.designerService.set('stage', null);
});
</script>

<template>
  <ScrollViewer ref="stageWrap" class="lc-d-stage" :width="stageRect?.width" :height="stageRect?.height" :zoom="zoom">
    <div
      ref="stageContainer"
      class="lc-d-stage-container"
      :style="`transform: scale(${zoom})`"
      @contextmenu="contextmenuHandler"
      @drop="dropHandler"
      @dragover="dragoverHandler"
    />
    <teleport to="body">
      <ViewerMenu ref="menu" />
    </teleport>
  </ScrollViewer>
</template>
