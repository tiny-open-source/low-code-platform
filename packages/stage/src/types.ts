import type Core from '@lowcode/core';
import type { Id, MApp, MNode } from '@lowcode/schema';
import type { MoveableOptions } from 'moveable';
import type StageCore from './StageCore';

export type CanSelect = (el: HTMLElement, event: MouseEvent, stop: () => boolean) => boolean | Promise<boolean>;
export interface StageCoreConfig {
  /** 需要对齐的dom节点的CSS选择器字符串 */
  snapElementQuerySelector?: string;
  /** 放大倍数，默认1倍 */
  zoom?: number;
  canSelect?: CanSelect;
  moveableOptions?: ((core?: StageCore) => MoveableOptions) | MoveableOptions;
  /** runtime 的HTML地址，可以是一个HTTP地址，如果和编辑器不同域，需要设置跨域，也可以是一个相对或绝对路径 */
  runtimeUrl?: string;
  render?: (renderer: StageCore) => Promise<HTMLElement> | HTMLElement;
  autoScrollIntoView?: boolean;
  updateDragEl?: (el: HTMLDivElement, target: HTMLElement) => void;
}
export interface SortEventData {
  src: Id;
  dist: Id;
  root?: MApp;
}
export interface UpdateData {
  config: MNode;
  root: MApp;
}
export interface RemoveData {
  id: Id;
  root: MApp;
}
export interface Runtime {
  getApp?: () => Core;
  beforeSelect?: (el: HTMLElement) => Promise<boolean> | boolean;
  getSnapElements?: (el?: HTMLElement) => HTMLElement[];
  updateRootConfig?: (config: MApp) => void;
  updatePageId?: (id: Id) => void;
  select?: (id: Id) => Promise<HTMLElement> | HTMLElement;
  add?: (data: UpdateData) => void;
  update?: (data: UpdateData) => void;
  sortNode?: (data: SortEventData) => void;
  remove?: (data: RemoveData) => void;
}

export interface LowCode {
  /** 当前页面的根节点变化时调用该方法，编辑器会同步该el和stage的大小，该方法由stage注入到iframe.contentWindow中 */
  onPageElUpdate: (el: HTMLElement) => void;

  onRuntimeReady: (runtime: Runtime) => void;
}

export interface RuntimeWindow extends Window {
  lowcode: LowCode;
}
