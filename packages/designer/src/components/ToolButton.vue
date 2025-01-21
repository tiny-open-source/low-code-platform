<script lang="ts">
import type { PropType } from 'vue';
import type { MenuButton, MenuComponent, MenuItem, Services } from '../type';
import { NodeType } from '@lowcode/schema';
import { ArrowLeftOutlined, ArrowRightOutlined, BorderInnerOutlined, BorderOuterOutlined, DeleteOutlined, TableOutlined, ZoomInOutlined, ZoomOutOutlined } from '@vicons/antd';
import { NButton, NDivider, NTooltip } from 'naive-ui';
import { computed, defineComponent, inject, markRaw } from 'vue';
import MIcon from '../components/Icon.vue';

export default defineComponent({
  components: { MIcon, NDivider, NButton, NTooltip },

  props: {
    data: {
      type: [Object, String] as PropType<MenuItem | string>,
      require: true,
      default: () => ({
        type: 'text',
        display: false,
      }),
    },

    eventType: {
      type: String as PropType<'mousedown' | 'mouseup' | 'click'>,
      default: 'click',
    },
  },

  setup(props) {
    const services = inject<Services>('services');
    const uiService = services?.uiService;

    const zoom = computed((): number => uiService?.get<number>('zoom') ?? 1);
    const showGuides = computed((): boolean => uiService?.get<boolean>('showGuides') ?? true);
    const showRule = computed((): boolean => uiService?.get<boolean>('showRule') ?? true);

    const zoomInHandler = () => uiService?.zoom(0.1);
    const zoomOutHandler = () => uiService?.zoom(-0.1);

    const item = computed((): MenuButton | MenuComponent => {
      if (typeof props.data !== 'string') {
        return props.data;
      }
      switch (props.data) {
        case '/':
          return {
            type: 'divider',
          };
        case 'zoom':
          return {
            type: 'zoom',
          };
        case 'delete':
          return {
            type: 'button',
            icon: DeleteOutlined,
            tooltip: '刪除',
            disabled: () => services?.designerService.get('node')?.type === NodeType.PAGE,
            handler: () => services?.designerService.remove(services?.designerService.get('node')),
          };
        case 'undo':
          return {
            type: 'button',
            icon: ArrowLeftOutlined,
            tooltip: '后退',
            disabled: () => !services?.historyService.state.canUndo,
            handler: () => services?.designerService.undo(),
          };
        case 'redo':
          return {
            type: 'button',
            icon: ArrowRightOutlined,
            tooltip: '前进',
            disabled: () => !services?.historyService.state.canRedo,
            handler: () => services?.designerService.redo(),
          };
        case 'zoom-in':
          return {
            type: 'button',
            icon: ZoomOutOutlined,
            tooltip: '放大',
            handler: zoomInHandler,
          };
        case 'zoom-out':
          return {
            type: 'button',
            icon: ZoomInOutlined,
            tooltip: '缩小',
            handler: zoomOutHandler,
          };
        case 'rule':
          return {
            type: 'button',
            icon: BorderInnerOutlined,
            tooltip: showRule.value ? '隐藏标尺' : '显示标尺',
            handler: () => uiService?.set('showRule', !showRule.value),
          };
        case 'guides':
          return {
            type: 'button',
            icon: TableOutlined,
            tooltip: showGuides.value ? '隐藏参考线' : '显示参考线',
            handler: () => uiService?.set('showGuides', !showGuides.value),
          };
        default:
          return {
            type: 'text',
            text: props.data,
          };
      }
    });

    const disabled = computed(() => {
      if (typeof item.value === 'string')
        return false;
      if (item.value.type === 'component')
        return false;
      if (typeof item.value.disabled === 'function') {
        return item.value.disabled(services);
      }
      return item.value.disabled;
    });

    const buttonHandler = (item: MenuButton | MenuComponent, event: MouseEvent) => {
      if (disabled.value)
        return;
      if (typeof (item as MenuButton).handler === 'function' && services) {
        (item as MenuButton).handler?.(services, event);
      }
    };

    return {
      ZoomIn: markRaw(ZoomInOutlined),
      ZoomOut: markRaw(ZoomOutOutlined),

      item,
      zoom,
      disabled,
      display: computed(() => {
        if (!item.value)
          return false;
        if (typeof item.value === 'string')
          return true;
        if (typeof item.value.display === 'function') {
          return item.value.display(services);
        }
        return item.value.display ?? true;
      }),

      zoomInHandler,
      zoomOutHandler,

      dropdownHandler(command: any) {
        if (command.item.handler) {
          command.item.handler(services);
        }
      },

      clickHandler(item: MenuButton | MenuComponent, event: MouseEvent) {
        if (props.eventType !== 'click')
          return;
        if (item.type === 'button') {
          buttonHandler(item, event);
        }
      },

      mousedownHandler(item: MenuButton | MenuComponent, event: MouseEvent) {
        if (props.eventType !== 'mousedown')
          return;
        if (item.type === 'button') {
          buttonHandler(item, event);
        }
      },

      mouseupHandler(item: MenuButton | MenuComponent, event: MouseEvent) {
        if (props.eventType !== 'mouseup')
          return;
        if (item.type === 'button') {
          buttonHandler(item, event);
        }
      },
    };
  },
});
</script>

<template>
  <div
    v-if="display"
    class="menu-item"
    :class="item.type"
    @click="clickHandler(item, $event)"
    @mousedown="mousedownHandler(item, $event)"
    @mouseup="mouseupHandler(item, $event)"
  >
    <NDivider v-if="item.type === 'divider'" :vertical="!item.direction || item.direction === 'vertical'" />
    <div v-else-if="item.type === 'text'" class="menu-item-text">
      {{ item.text }}
    </div>

    <template v-else-if="item.type === 'zoom'">
      <tool-button
        :data="{ type: 'button', icon: ZoomOut, handler: zoomOutHandler, tooltip: '缩小' }"
        :event-type="eventType"
      />
      <span class="menu-item-text" style="margin: 0 5px">{{ parseInt(`${zoom * 100}`, 10) }}%</span>
      <tool-button
        :data="{ type: 'button', icon: ZoomIn, handler: zoomInHandler, tooltip: '放大' }"
        :event-type="eventType"
      />
    </template>

    <template v-else-if="item.type === 'button'">
      <NTooltip v-if="item.tooltip" effect="dark" placement="bottom" trigger="hover">
        <template #trigger>
          <NButton size="small" quaternary circle :disabled="disabled">
            <template v-if="item.icon" #icon>
              <MIcon :icon="item.icon" /><span>{{ item.text }}</span>
            </template>
          </NButton>
        </template>
        {{ item.tooltip }}
      </NTooltip>
      <NButton v-else size="small" quaternary :disabled="disabled">
        <template v-if="item.icon" #icon>
          <MIcon :icon="item.icon" />
        </template><span>{{ item.text }}</span>
      </NButton>
    </template>

    <!-- <NDropdown v-else-if="item.type === 'dropdown'" trigger="click" :disabled="disabled" :options="[]" @select="dropdownHandler" /> -->

    <component v-bind="item.props || {}" :is="item.component" v-else-if="item.type === 'component'" />
  </div>
</template>
