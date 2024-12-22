import type { StageMaskConfig } from './types';
import { ZIndex } from './const';
import Rule from './Ruler';
import { createDiv } from './utils';

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
  public wrapper: HTMLDivElement;
  constructor(config: StageMaskConfig) {
    console.log(config);

    const wrapper = createWrapper();
    super(wrapper);
    this.wrapper = wrapper;
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
