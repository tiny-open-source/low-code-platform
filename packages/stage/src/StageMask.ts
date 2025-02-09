import type StageCore from './StageCore';
import type { StageMaskConfig } from './types';
import { createDiv, injectStyle } from '@lowcode/utils';
import KeyController from 'keycon';
import { throttle } from 'lodash-es';
import { Mode, MouseButton, ZIndex } from './const';
import Rule from './Ruler';
import { getScrollParent, isFixedParent } from './utils';

const throttleTime = 100;
const wrapperClassName = 'designer-mask-wrapper';
function hideScrollbar() {
  injectStyle(globalThis.document, `.${wrapperClassName}::-webkit-scrollbar { width: 0 !important; display: none }`);
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
  public width = 0;
  public height = 0;
  public wrapper: HTMLDivElement;
  public wrapperHeight = 0;
  public wrapperWidth = 0;
  public maxScrollTop = 0;
  public maxScrollLeft = 0;

  public intersectionObserver: IntersectionObserver | null = null;
  public isMultiSelectStatus: boolean = false;
  public shiftKeyDown: boolean = false;
  private mode: Mode = Mode.ABSOLUTE;
  private pageResizeObserver: ResizeObserver | null = null;
  private wrapperResizeObserver: ResizeObserver | null = null;
  constructor(config: StageMaskConfig) {
    const wrapper = createWrapper();
    super(wrapper);
    this.wrapper = wrapper;

    this.core = config.core;

    this.content.addEventListener('mousedown', this.mouseDownHandler);
    this.wrapper.appendChild(this.content);

    this.content.addEventListener('wheel', this.mouseWheelHandler, { passive: true });
    this.content.addEventListener('mousemove', this.highlightHandler);
    this.content.addEventListener('mouseleave', this.mouseLeaveHandler);

    const isMac = /mac os x/.test(navigator.userAgent.toLowerCase());

    const ctrl = isMac ? 'meta' : 'ctrl';

    KeyController.global.keydown(ctrl, (e) => {
      e.inputEvent.preventDefault();
      this.isMultiSelectStatus = true;
    });

    // ctrl+tab切到其他窗口，需要将多选状态置为false
    KeyController.global.on('blur', () => {
      this.isMultiSelectStatus = false;
    });

    KeyController.global.keyup(ctrl, (e) => {
      e.inputEvent.preventDefault();
      this.isMultiSelectStatus = false;
    });
  };

  /**
   * 监听页面大小变化
   * @description 同步页面与mask的大小
   * @param page 页面Dom节点
   */
  public observe(page: HTMLElement): void {
    if (!page)
      return;

    this.page = page;
    this.pageScrollParent = getScrollParent(page) || this.core.renderer.contentWindow?.document.documentElement || null;
    this.pageResizeObserver?.disconnect();
    this.wrapperResizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();

    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const { target, intersectionRatio } = entry;
            if (intersectionRatio <= 0) {
              this.scrollIntoView(target);
            }
            this.intersectionObserver?.unobserve(target);
          });
        },
        {
          root: this.pageScrollParent,
          rootMargin: '0px',
          threshold: 1.0,
        },
      );
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.pageResizeObserver = new ResizeObserver((entries) => {
        const [entry] = entries;
        const { clientHeight, clientWidth } = entry.target;
        this.setHeight(clientHeight);
        this.setWidth(clientWidth);

        this.scroll();
        if (this.core.dr.moveable) {
          this.core.dr.updateMoveable();
        }
      });

      console.log('🚀 ~ StageMask ~ observe ~ page:', page);
      page && this.pageResizeObserver.observe(page);

      this.wrapperResizeObserver = new ResizeObserver((entries) => {
        const [entry] = entries;
        const { clientHeight, clientWidth } = entry.target;
        this.wrapperHeight = clientHeight;
        this.wrapperWidth = clientWidth;
        this.setMaxScrollLeft();
        this.setMaxScrollTop();
      });
      this.wrapper && this.wrapperResizeObserver.observe(this.wrapper);
    }
  }

  public scrollIntoView(el: Element): void {
    el.scrollIntoView();
    if (!this.pageScrollParent)
      return;
    this.scrollLeft = this.pageScrollParent.scrollLeft;
    this.scrollTop = this.pageScrollParent.scrollTop;
    this.scroll();
  }

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

  public setLayout(el: HTMLElement): void {
    this.setMode(isFixedParent(el) ? Mode.FIXED : Mode.ABSOLUTE);
  }

  public setMode(mode: Mode) {
    this.mode = mode;
    this.scroll();
    if (mode === Mode.FIXED) {
      this.content.style.width = `${this.wrapperWidth}px`;
      this.content.style.height = `${this.wrapperHeight}px`;
    }
    else {
      this.content.style.width = `${this.width}px`;
      this.content.style.height = `${this.height}px`;
    }
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.content?.remove();
    this.page = null;
    this.pageScrollParent = null;
    this.pageResizeObserver?.disconnect();
    this.wrapperResizeObserver?.disconnect();

    this.content.removeEventListener('mouseleave', this.mouseLeaveHandler);
    super.destroy();
  }

  private scrollTo(scrollLeft: number, scrollTop: number): void {
    this.content.style.transform = `translate3d(${-scrollLeft}px, ${-scrollTop}px, 0)`;
  }

  /**
   * 设置蒙层高度
   * @param height 高度
   */
  private setHeight(height: number): void {
    this.height = height;
    this.setMaxScrollTop();
    this.content.style.height = `${height}px`;
  }

  /**
   * 设置蒙层宽度
   * @param width 宽度
   */
  private setWidth(width: number): void {
    this.width = width;
    this.setMaxScrollLeft();
    this.content.style.width = `${width}px`;
  }

  /**
   * 计算并设置最大滚动宽度
   */
  private setMaxScrollLeft(): void {
    this.maxScrollLeft = Math.max(this.width - this.wrapperWidth, 0);
  }

  /**
   * 计算并设置最大滚动高度
   */
  private setMaxScrollTop(): void {
    this.maxScrollTop = Math.max(this.height - this.wrapperHeight, 0);
  }

  /**
   * 点击事件处理函数
   * @param event 事件对象
   */
  private mouseDownHandler = (event: MouseEvent): void => {
    this.emit('clearHighlight');
    event.stopImmediatePropagation();
    event.stopPropagation();

    if (event.button !== MouseButton.LEFT && event.button !== MouseButton.RIGHT)
      return;

    // 如果单击多选选中区域，则不需要再触发选中了，而可能是拖动行为
    if (!this.isMultiSelectStatus && (event.target as HTMLDivElement).className.includes('moveable-area')) {
      return;
    }
    // 点击对象如果是边框锚点，则可能是resize
    if ((event.target as HTMLDivElement).className.includes('moveable-control')) {
      return;
    }

    this.content.removeEventListener('mousemove', this.highlightHandler);

    // 判断触发多选还是单选
    if (this.isMultiSelectStatus) {
      this.emit('beforeMultiSelect', event);
    }
    else {
      this.emit('beforeSelect', event);
    }
    // 如果是右键点击，这里的mouseup事件监听没有效果
    globalThis.document.addEventListener('mouseup', this.mouseUpHandler);
  };

  private mouseUpHandler = (): void => {
    globalThis.document.removeEventListener('mouseup', this.mouseUpHandler);
    this.content.addEventListener('mousemove', this.highlightHandler);
    if (!this.isMultiSelectStatus) {
      this.emit('select');
    }
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
