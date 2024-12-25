import type StageCore from './StageCore';
import type { StageMaskConfig } from './types';
import { throttle } from 'lodash-es';
import { Mode, MouseButton, ZIndex } from './const';
import Rule from './Ruler';
import { createDiv } from './utils';

const throttleTime = 100;
const wrapperClassName = 'designer-mask-wrapper';
function hideScrollbar() {
  const style = globalThis.document.createElement('style');
  style.innerHTML = `
    .${wrapperClassName}::-webkit-scrollbar { width: 0 !important; display: none }
  `;
  globalThis.document.head.appendChild(style);
}

function createContent(): HTMLDivElement {
  return createDiv({
    className: 'designer-mask',
    cssText: `
    position: absolute;
    top: 0;
    left: 0;
    transform: translate3d(0, 0, 0);
  `,
  });
}

function createWrapper(): HTMLDivElement {
  const el = createDiv({
    className: wrapperClassName,
    cssText: `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      z-index: ${ZIndex.MASK};
    `,
  });

  hideScrollbar();

  return el;
}

/**
 * 蒙层
 * @description 用于拦截页面的点击动作，避免点击时触发组件自身动作；在编辑器中点击组件应当是选中组件；
 */
export default class StageMask extends Rule {
  public content: HTMLDivElement = createContent();
  public core: StageCore;
  public page: HTMLElement | null = null;
  public pageScrollParent: HTMLElement | null = null;
  public scrollTop = 0;
  public scrollLeft = 0;
  public wrapper: HTMLDivElement;
  public wrapperHeight = 0;
  public wrapperWidth = 0;
  public maxScrollTop = 0;
  public maxScrollLeft = 0;

  private mode: Mode = Mode.ABSOLUTE;
  constructor(config: StageMaskConfig) {
    const wrapper = createWrapper();
    super(wrapper);
    this.wrapper = wrapper;

    this.core = config.core;

    this.content.addEventListener('mousedown', this.mouseDownHandler);
    this.wrapper.appendChild(this.content);

    this.content.addEventListener('wheel', this.mouseWheelHandler);
    this.content.addEventListener('mousemove', this.highlightHandler);
    this.content.addEventListener('mouseleave', this.mouseLeaveHandler);
  };

  private mouseWheelHandler = (event: WheelEvent) => {
    this.emit('clearHighlight');
    if (!this.page)
      throw new Error('page 未初始化');

    const { deltaY, deltaX } = event;

    if (this.page.clientHeight < this.wrapperHeight && deltaY)
      return;
    if (this.page.clientWidth < this.wrapperWidth && deltaX)
      return;

    if (this.maxScrollTop > 0) {
      this.scrollTop = this.scrollTop + deltaY;
    }

    if (this.maxScrollLeft > 0) {
      this.scrollLeft = this.scrollLeft + deltaX;
    }

    this.scroll();

    this.emit('scroll', event);
  };

  /**
   * 修复滚动距离
   * 由于滚动容器变化等因素，会导致当前滚动的距离不正确
   */
  private fixScrollValue(): void {
    if (this.scrollTop < 0)
      this.scrollTop = 0;
    if (this.scrollLeft < 0)
      this.scrollLeft = 0;
    if (this.maxScrollTop < this.scrollTop)
      this.scrollTop = this.maxScrollTop;
    if (this.maxScrollLeft < this.scrollLeft)
      this.scrollLeft = this.maxScrollLeft;
  }

  private scroll() {
    this.fixScrollValue();

    let { scrollLeft, scrollTop } = this;

    if (this.pageScrollParent) {
      this.pageScrollParent.scrollTo({
        top: scrollTop,
        left: scrollLeft,
      });
    }

    if (this.mode === Mode.FIXED) {
      scrollLeft = 0;
      scrollTop = 0;
    }

    this.scrollRule(scrollTop);
    this.scrollTo(scrollLeft, scrollTop);
  }

  private scrollTo(scrollLeft: number, scrollTop: number): void {
    this.content.style.transform = `translate3d(${-scrollLeft}px, ${-scrollTop}px, 0)`;
  }

  private mouseDownHandler = (event: MouseEvent): void => {
    this.emit('clearHighlight');

    event.stopImmediatePropagation();

    event.stopPropagation();

    if (event.button !== MouseButton.LEFT && event.button !== MouseButton.RIGHT)
      return;

    // 点击的对象如果是选中框，则不需要再触发选中了，而可能是拖动行为
    if ((event.target as HTMLDivElement).className.includes('moveable-control'))
      return;

    this.content.removeEventListener('mousemove', this.highlightHandler);

    this.emit('beforeSelect', event);

    globalThis.document.addEventListener('mouseup', this.mouseUpHandler);
  };

  private mouseUpHandler = (): void => {
    globalThis.document.removeEventListener('mouseup', this.mouseUpHandler);
    this.content.addEventListener('mousemove', this.highlightHandler);
    this.emit('select');
  };

  /**
   * 高亮事件处理函数
   * @param event 事件对象
   */
  private highlightHandler = throttle((event: MouseEvent): void => {
    this.emit('highlight', event);
  }, throttleTime);

  private mouseLeaveHandler = () => {
    setTimeout(() => this.emit('clearHighlight'), throttleTime);
  };

  /**
   * 挂载Dom节点
   * @param el 将蒙层挂载到该Dom节点上
   */
  public mount(el: HTMLDivElement): void {
    if (!this.content)
      throw new Error('content 不存在');

    el.appendChild(this.wrapper);
  }
}
