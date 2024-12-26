import type { HistoryService } from '@designer/services/history.service';
import type { UiService } from '@designer/services/ui.service';
import type { Id, MApp, MContainer, MNode, MPage } from '@lowcode/schema';
import type StageCore from '@lowcode/stage';
import type { MoveableOptions } from '@lowcode/stage';
import type { DesignerService } from './services/designer.service';

export interface InstallOptions {
  [key: string]: any;
}
export interface Services {
  uiService: UiService;
  historyService: HistoryService;
  designerService: DesignerService;
}

export interface StageOptions {
  runtimeUrl: string;
  autoScrollIntoView: boolean;
  render: () => HTMLDivElement;
  moveableOptions: MoveableOptions | ((core?: StageCore) => MoveableOptions);
  canSelect: (el: HTMLElement) => boolean | Promise<boolean>;
  updateDragEl: (el: HTMLDivElement) => void;
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
export interface StoreState {
  root: MApp | null;
  page: MPage | null;
  parent: MContainer | null;
  node: MNode | null;
  highlightNode: MNode | null;
  stage: StageCore | null;
  modifiedNodeIds: Map<Id, Id>;
  pageLength: number;
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

/** 容器布局 */
export enum Layout {
  FLEX = 'flex',
  FIXED = 'fixed',
  RELATIVE = 'relative',
  ABSOLUTE = 'absolute',
}

export enum Keys {
  ESCAPE = 'Space',
}

export const H_GUIDE_LINE_STORAGE_KEY = '$MagicStageHorizontalGuidelinesData';
export const V_GUIDE_LINE_STORAGE_KEY = '$MagicStageVerticalGuidelinesData';

declare global {
  interface Window {
    global: any;
  }
}
