import type { UiService } from '@designer/services/ui.service';

export interface InstallOptions {
  [key: string]: any;
}
export interface Services {
  uiService: UiService;
}
export interface SetColumnWidth {
  left?: number;
  center?: number | 'auto';
  right?: number;
}
export interface GetColumnWidth {
  left: number;
  center: number;
  right: number;
}
export interface StageRect {
  width: number;
  height: number;
}
export interface UiState {
  /** 当前点击画布是否触发选中，true: 不触发，false: 触发，默认为false */
  uiSelectMode: boolean;
  /** 是否显示整个配置源码， true: 显示， false: 不显示，默认为false */
  showSrc: boolean;
  /** 画布显示放大倍数，默认为 1 */
  zoom: number;
  /** 画布容器的宽高 */
  stageContainerRect: StageRect;
  /** 画布顶层div的宽高，可用于改变画布的大小 */
  stageRect: StageRect;
  /** 编辑器列布局每一列的宽度，分为左中右三列 */
  columnWidth: GetColumnWidth;
  /** 是否显示画布参考线，true: 显示，false: 不显示，默认为true */
  showGuides: boolean;
  /** 是否显示标尺，true: 显示，false: 不显示，默认为true */
  showRule: boolean;
  /** 用于控制该属性配置表单内组件的尺寸 */
  propsPanelSize: 'large' | 'default' | 'small';
}
declare global {
  interface Window {
    global: any;
  }
}
