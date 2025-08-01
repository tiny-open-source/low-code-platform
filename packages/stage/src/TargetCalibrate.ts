import type StageCore from './StageCore';
import type StageDragResize from './StageDragResize';
import type StageMask from './StageMask';
import type { Offset, TargetCalibrateConfig } from './types';

import { EventEmitter } from 'eventemitter3';
import { Mode, ZIndex } from './const';
import { getMode } from './utils';
/**
 * 将选中的节点修正定位后，添加一个操作节点到蒙层上
 */
export default class TargetCalibrate extends EventEmitter {
  public parent: HTMLElement;
  public mask: StageMask;
  public dr: StageDragResize;
  public core: StageCore;
  public operationEl: HTMLDivElement;

  constructor(config: TargetCalibrateConfig) {
    super();

    this.parent = config.parent;
    this.mask = config.mask;
    this.dr = config.dr;
    this.core = config.core;

    this.operationEl = globalThis.document.createElement('div');
    this.parent.append(this.operationEl);
  }

  public update(el: HTMLElement, prefix: string): HTMLElement {
    const { left, top } = this.getOffset(el);
    const { transform } = getComputedStyle(el);
    this.operationEl.style.cssText = `
      position: absolute;
      transform: ${transform};
      left: ${left}px;
      top: ${top}px;
      width: ${el.offsetWidth}px;
      height: ${el.offsetHeight}px;
      z-index: ${ZIndex.DRAG_EL};
    `;

    this.operationEl.id = `${prefix}${el.id}`;

    if (typeof this.core.config.updateDragEl === 'function') {
      this.core.config.updateDragEl(this.operationEl, el);
    }

    return this.operationEl;
  }

  public destroy(): void {
    this.operationEl?.remove();
  }

  private getOffset(el: HTMLElement): Offset {
    const { offsetParent } = el;

    const left = el.offsetLeft;
    const top = el.offsetTop;

    if (offsetParent) {
      const parentOffset = this.getOffset(offsetParent as HTMLElement);
      return {
        left: left + parentOffset.left,
        top: top + parentOffset.top,
      };
    }

    // 选中固定定位元素后editor-mask高度被置为视窗大小
    if (this.dr.mode === Mode.FIXED) {
      // 弹窗的情况
      if (getMode(el) === Mode.FIXED) {
        return {
          left,
          top,
        };
      }

      return {
        left: left - this.mask.scrollLeft,
        top: top - this.mask.scrollTop,
      };
    }

    // 无父元素的固定定位需按滚动值计算
    if (getMode(el) === Mode.FIXED) {
      return {
        left: left + this.mask.scrollLeft,
        top: top + this.mask.scrollTop,
      };
    }

    return {
      left,
      top,
    };
  }
}
