import type { MoveableOptions } from 'moveable';
import type StageCore from './StageCore';
import type StageMask from './StageMask';
import type { StageDragResizeConfig } from './types';

import { removeClassNameByClassName } from '@low-code/utils';
import { EventEmitter } from 'eventemitter3';
import KeyController from 'keycon';
import Moveable from 'moveable';
import MoveableHelper from 'moveable-helper';
import { DRAG_EL_ID_PREFIX, GHOST_EL_ID_PREFIX, GuidesType, Mode, ZIndex } from './const';
import { ContainerHighlightType, StageDragStatus } from './types';

import { calcValueByFontsize, down, getAbsolutePosition, getMode, getOffset, getTargetElStyle, up } from './utils';

class StageDragResize extends EventEmitter {
  public core: StageCore;
  public mask: StageMask;
  /** 画布容器 */
  public container: HTMLElement;
  /** 目标节点 */
  public target?: HTMLElement;
  /** 对齐元素集合 */
  public elementGuidelines: HTMLElement[] = [];
  /** 布局方式：流式布局、绝对定位、固定定位 */
  public mode: Mode = Mode.ABSOLUTE;

  /** Moveable拖拽类实例 */
  public moveable?: Moveable;
  private moveableOptions: MoveableOptions = {};
  private moveableHelper?: MoveableHelper;
  /** 拖动状态 */
  private dragStatus: StageDragStatus = StageDragStatus.END;

  /** 水平参考线 */
  public horizontalGuidelines: number[] = [];
  /** 垂直参考线 */
  public verticalGuidelines: number[] = [];
  /** 目标节点在蒙层中的占位节点 */
  public dragEl?: HTMLDivElement;
  /** 流式布局下，目标节点的镜像节点 */
  private ghostEl: HTMLElement | undefined;

  private isContainerHighlight: boolean = false;

  constructor(config: StageDragResizeConfig) {
    super();

    this.core = config.core;
    this.container = config.container;

    this.mask = config.mask;

    KeyController.global.keydown('alt', (e) => {
      e.inputEvent.preventDefault();
      this.isContainerHighlight = true;
    });
    KeyController.global.keyup('alt', (e) => {
      e.inputEvent.preventDefault();

      const doc = this.core.renderer.contentWindow?.document;
      if (doc && this.canContainerHighlight()) {
        removeClassNameByClassName(doc, this.core.containerHighlightClassName);
      }
      this.isContainerHighlight = false;
    });
  }

  public clearSelectStatus(): void {
    if (!this.moveable)
      return;
    this.destroyDragEl();
    this.moveable.target = null;
    this.moveable.updateRect();
  }

  /**
   * 将选中框渲染并覆盖到选中的组件Dom节点上方
   * 当选中的节点是不是absolute时，会创建一个新的节点出来作为拖拽目标
   * @param el 选中组件的Dom节点元素
   * @param event 鼠标事件
   */
  public select(el: HTMLElement, event?: MouseEvent): void {
    const oldTarget = this.target;
    this.target = el;

    if (!this.moveable || this.target !== oldTarget) {
      this.init(el);
      this.moveableHelper = MoveableHelper.create({
        useBeforeRender: true,
        useRender: false,
        createAuto: true,
      });
      this.initMoveable();
    }
    else {
      this.updateMoveable();
    }

    if (event) {
      this.moveable?.dragStart(event);
    }
  }

  private generateGhostEl(el: HTMLElement): HTMLElement {
    if (this.ghostEl) {
      this.destroyGhostEl();
    }

    const ghostEl = el.cloneNode(true) as HTMLElement;
    const { top, left } = getAbsolutePosition(el, getOffset(el));
    ghostEl.id = `${GHOST_EL_ID_PREFIX}${el.id}`;
    ghostEl.style.zIndex = ZIndex.GHOST_EL;
    ghostEl.style.opacity = '.5';
    ghostEl.style.position = 'absolute';
    ghostEl.style.left = `${left}px`;
    ghostEl.style.top = `${top}px`;
    el.after(ghostEl);
    return ghostEl;
  }

  /**
   * 初始化选中框并渲染出来
   */
  public updateMoveable(el = this.target): void {
    if (!this.moveable)
      throw new Error('未初始化moveable');
    if (!el)
      throw new Error('未选中任何节点');

    this.target = el;

    this.init(el);

    Object.entries(this.moveableOptions).forEach(([key, value]) => {
      (this.moveable as any)[key] = value;
    });
    this.moveable.updateRect();
  }

  private initMoveable() {
    this.moveable?.destroy();

    this.moveable = new Moveable(this.container, {
      ...this.moveableOptions,
    });

    this.bindResizeEvent();
    this.bindDragEvent();
    this.bindRotateEvent();
    this.bindScaleEvent();
  }

  private bindScaleEvent(): void {
    if (!this.moveable)
      throw new Error('moveable 未初始化');

    this.moveable
      .on('scaleStart', (e) => {
        this.dragStatus = StageDragStatus.START;
        this.moveableHelper?.onScaleStart(e);
      })
      .on('scale', (e) => {
        if (!this.target || !this.dragEl)
          return;
        this.dragStatus = StageDragStatus.ING;
        this.moveableHelper?.onScale(e);
        const frame = this.moveableHelper?.getFrame(e.target);
        this.target.style.transform = frame?.toCSSObject().transform || '';
      })
      .on('scaleEnd', (e) => {
        this.dragStatus = StageDragStatus.END;
        const frame = this.moveableHelper?.getFrame(e.target);
        this.emit('update', {
          el: this.target,
          style: {
            transform: frame?.get('transform'),
          },
        });
      });
  }

  private bindRotateEvent(): void {
    if (!this.moveable)
      throw new Error('moveable 未初始化');

    this.moveable
      .on('rotateStart', (e) => {
        this.dragStatus = StageDragStatus.START;
        this.moveableHelper?.onRotateStart(e);
      })
      .on('rotate', (e) => {
        if (!this.target || !this.dragEl)
          return;
        this.dragStatus = StageDragStatus.ING;
        this.moveableHelper?.onRotate(e);
        const frame = this.moveableHelper?.getFrame(e.target);
        this.target.style.transform = frame?.toCSSObject().transform || '';
      })
      .on('rotateEnd', (e) => {
        this.dragStatus = StageDragStatus.END;
        const frame = this.moveableHelper?.getFrame(e.target);
        this.emit('update', {
          el: this.target,
          style: {
            transform: frame?.get('transform'),
          },
        });
      });
  }

  private bindDragEvent(): void {
    if (!this.moveable)
      throw new Error('moveable 未初始化');

    const frame = {
      left: 0,
      top: 0,
    };

    let timeout: NodeJS.Timeout | undefined;

    const { contentWindow } = this.core.renderer;
    const doc = contentWindow?.document;

    this.moveable
      .on('dragStart', (e) => {
        if (!this.target)
          throw new Error('未选中组件');

        this.dragStatus = StageDragStatus.START;

        this.moveableHelper?.onDragStart(e);

        if (this.mode === Mode.SORTABLE) {
          this.ghostEl = this.generateGhostEl(this.target);
        }

        frame.top = this.target.offsetTop;
        frame.left = this.target.offsetLeft;
      })
      .on('drag', (e) => {
        if (!this.target || !this.dragEl)
          return;

        if (timeout) {
          globalThis.clearTimeout(timeout);
          timeout = undefined;
        }

        if (this.canContainerHighlight()) {
          timeout = this.core.getAddContainerHighlightClassNameTimeout(e.inputEvent, [this.target]);
        }

        this.dragStatus = StageDragStatus.ING;

        // 流式布局
        if (this.ghostEl) {
          this.ghostEl.style.top = `${frame.top + e.beforeTranslate[1]}px`;
          return;
        }

        this.moveableHelper?.onDrag(e);

        this.target.style.left = `${frame.left + e.beforeTranslate[0]}px`;
        this.target.style.top = `${frame.top + e.beforeTranslate[1]}px`;
      })
      .on('dragEnd', () => {
        if (timeout) {
          globalThis.clearTimeout(timeout);
          timeout = undefined;
        }

        let parentEl: HTMLElement | null = null;

        if (doc && this.canContainerHighlight()) {
          parentEl = removeClassNameByClassName(doc, this.core.containerHighlightClassName);
        }

        // 点击不拖动时会触发dragStart和dragEnd，但是不会有drag事件
        if (this.dragStatus === StageDragStatus.ING) {
          if (parentEl) {
            this.update(false, parentEl);
          }
          else {
            switch (this.mode) {
              case Mode.SORTABLE:
                this.sort();
                break;
              default:
                this.update();
            }
          }
        }

        this.dragStatus = StageDragStatus.END;
        this.destroyGhostEl();
      });
  }

  // 使用 requestAnimationFrame 优化拖拽动画
  private updatePosition(x: number, y: number) {
    requestAnimationFrame(() => {
      this.target!.style.left = `${x}px`;
      this.target!.style.top = `${y}px`;
    });
  }

  private bindResizeEvent(): void {
    if (!this.moveable)
      throw new Error('moveable 未初始化');

    const frame = {
      left: 0,
      top: 0,
    };

    this.moveable
      .on('resizeStart', (e) => {
        if (!this.target)
          return;

        this.dragStatus = StageDragStatus.START;
        this.moveableHelper?.onResizeStart(e);

        frame.top = this.target.offsetTop;
        frame.left = this.target.offsetLeft;
      })
      .on('resize', (e) => {
        const { width, height, drag } = e;
        if (!this.moveable || !this.target || !this.dragEl)
          return;

        const { beforeTranslate } = drag;
        this.dragStatus = StageDragStatus.ING;

        // 流式布局
        if (this.mode === Mode.SORTABLE) {
          this.target.style.top = '0px';
          this.dragEl.style.width = `${width}px`;
          this.dragEl.style.height = `${height}px`;
        }
        else {
          this.moveableHelper?.onResize(e);
          this.target.style.left = `${frame.left + beforeTranslate[0]}px`;
          this.target.style.top = `${frame.top + beforeTranslate[1]}px`;
        }

        this.target.style.width = `${width}px`;
        this.target.style.height = `${height}px`;
      })
      .on('resizeEnd', () => {
        this.dragStatus = StageDragStatus.END;
        this.update(true);
      });
  }

  private sort(): void {
    if (!this.target || !this.ghostEl)
      throw new Error('未知错误');
    const { top } = this.ghostEl.getBoundingClientRect();
    const { top: oriTop } = this.target.getBoundingClientRect();
    const deltaTop = top - oriTop;
    if (Math.abs(deltaTop) >= this.target.clientHeight / 2) {
      if (deltaTop > 0) {
        this.emit('sort', down(deltaTop, this.target));
      }
      else {
        this.emit('sort', up(deltaTop, this.target));
      }
    }
    else {
      this.emit('sort', {
        src: this.target.id,
        dist: this.target.id,
      });
    }
  }

  private update(isResize = false, parentEl: HTMLElement | null = null): void {
    if (!this.target)
      return;

    const { contentWindow } = this.core.renderer;
    const doc = contentWindow?.document;

    if (!doc)
      return;

    const offset
      = this.mode === Mode.SORTABLE ? { left: 0, top: 0 } : { left: this.target.offsetLeft, top: this.target.offsetTop };

    let left = calcValueByFontsize(doc, offset.left);
    let top = calcValueByFontsize(doc, offset.top);
    const width = calcValueByFontsize(doc, this.target.clientWidth);
    const height = calcValueByFontsize(doc, this.target.clientHeight);

    if (parentEl && this.mode === Mode.ABSOLUTE && this.dragEl) {
      const [translateX, translateY] = this.moveableHelper?.getFrame(this.dragEl).properties.transform.translate.value;
      const { left: parentLeft, top: parentTop } = getOffset(parentEl);
      left
        = calcValueByFontsize(doc, this.dragEl.offsetLeft)
          + Number.parseFloat(translateX)
          - calcValueByFontsize(doc, parentLeft);
      top
        = calcValueByFontsize(doc, this.dragEl.offsetTop) + Number.parseFloat(translateY) - calcValueByFontsize(doc, parentTop);
    }

    this.emit('update', {
      data: [
        {
          el: this.target,
          style: isResize ? { left, top, width, height } : { left, top },
        },
      ],
      parentEl,
    });
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.moveable?.destroy();
    this.destroyGhostEl();
    this.destroyDragEl();
    this.dragStatus = StageDragStatus.END;

    this.removeAllListeners();
  }

  public destroyDragEl(): void {
    this.dragEl?.remove();
  }

  private init(el: HTMLElement): void {
    // 如果有滚动条会导致resize时获取到width，height不准确
    if (/auto|scroll/.test(el.style.overflow)) {
      el.style.overflow = 'hidden';
    }
    this.mode = getMode(el);

    this.destroyGhostEl();
    this.destroyDragEl();
    this.dragEl = globalThis.document.createElement('div');
    this.container.append(this.dragEl);
    this.dragEl.style.cssText = getTargetElStyle(el);
    this.dragEl.id = `${DRAG_EL_ID_PREFIX}${el.id}`;

    if (typeof this.core.config.updateDragEl === 'function') {
      this.core.config.updateDragEl(this.dragEl, el);
    }
    console.log('🚀 ~ StageDragResize ~ init ~ this.dragEl:', this.dragEl);
    this.moveableOptions = this.getOptions({
      target: this.dragEl,
    });
  }

  public setGuidelines(type: GuidesType, guidelines: number[]): void {
    if (type === GuidesType.HORIZONTAL) {
      this.horizontalGuidelines = guidelines;
      this.moveableOptions.horizontalGuidelines = guidelines;
    }
    else if (type === GuidesType.VERTICAL) {
      this.verticalGuidelines = guidelines;
      this.moveableOptions.verticalGuidelines = guidelines;
    }

    if (this.moveable) {
      this.updateMoveable();
    }
  }

  public clearGuides() {
    this.horizontalGuidelines = [];
    this.verticalGuidelines = [];
    this.moveableOptions.horizontalGuidelines = [];
    this.moveableOptions.verticalGuidelines = [];
    this.updateMoveable();
  }

  private destroyGhostEl(): void {
    this.ghostEl?.remove();
    this.ghostEl = undefined;
  }

  private setElementGuidelines(nodes: HTMLElement[]) {
    this.elementGuidelines.forEach((node) => {
      node.remove();
    });
    this.elementGuidelines = [];

    if (this.mode === Mode.ABSOLUTE) {
      this.container.append(this.createGuidelineElements(nodes));
    }
  }

  private createGuidelineElements(nodes: HTMLElement[]) {
    const frame = globalThis.document.createDocumentFragment();

    for (const node of nodes) {
      const { width, height } = node.getBoundingClientRect();
      if (node === this.target)
        continue;
      const { left, top } = getOffset(node as HTMLElement);
      const elementGuideline = globalThis.document.createElement('div');
      elementGuideline.style.cssText = `position: absolute;width: ${width}px;height: ${height}px;top: ${top}px;left: ${left}px`;
      this.elementGuidelines.push(elementGuideline);
      frame.append(elementGuideline);
    }

    return frame;
  }

  private canContainerHighlight() {
    return (
      this.core.containerHighlightType === ContainerHighlightType.DEFAULT
      || (this.core.containerHighlightType === ContainerHighlightType.ALT && this.isContainerHighlight)
    );
  }

  private getOptions(options: MoveableOptions = {}): MoveableOptions {
    if (!this.target)
      return {};

    const isAbsolute = this.mode === Mode.ABSOLUTE;
    const isFixed = this.mode === Mode.FIXED;
    const isSortable = this.mode === Mode.SORTABLE;

    let { moveableOptions = {} } = this.core.config;

    if (typeof moveableOptions === 'function') {
      moveableOptions = moveableOptions(this.core);
      console.log('🚀 ~ StageDragResize ~ getOptions ~ moveableOptions:', moveableOptions);
    }

    const elementGuidelines: any = moveableOptions.elementGuidelines || this.target.parentElement?.children || [];

    this.setElementGuidelines(elementGuidelines);

    if (moveableOptions.elementGuidelines) {
      delete moveableOptions.elementGuidelines;
    }

    return {
      origin: false,
      rootContainer: this.core.container,
      zoom: 1,
      dragArea: false,
      draggable: true,
      resizable: true,
      scalable: false,
      rotatable: false,
      snappable: isAbsolute || isFixed,
      snapGap: isAbsolute || isFixed,
      snapThreshold: 5,
      snapDigit: 0,
      throttleDrag: 0,
      isDisplaySnapDigit: isAbsolute,
      snapDirections: {
        top: isAbsolute,
        right: isAbsolute,
        bottom: isAbsolute,
        left: isAbsolute,
        center: isAbsolute,
        middle: isAbsolute,
      },
      elementSnapDirections: {
        top: isAbsolute,
        right: isAbsolute,
        bottom: isAbsolute,
        left: isAbsolute,
      },
      isDisplayInnerSnapDigit: true,
      horizontalGuidelines: this.horizontalGuidelines,
      verticalGuidelines: this.verticalGuidelines,
      elementGuidelines: this.elementGuidelines,

      bounds: {
        top: 0,
        // 设置0的话无法移动到left为0，所以只能设置为-1
        left: -1,
        right: this.container.clientWidth - 1,
        bottom: isSortable ? undefined : this.container.clientHeight,
        ...(moveableOptions.bounds || {}),
      },
      ...options,
      ...moveableOptions,
    };
  }
}
export default StageDragResize;
