import type { EventItemConfig, Id, MApp } from '@lowcode/schema';
import { EventEmitter } from 'eventemitter3';
import Env from './Env';
import { bindCommonEventListener, DEFAULT_EVENTS, getCommonEventName, isCommonMethod, triggerCommonMethod } from './events';
import Page from './Page';
import { fillBackgroundImage, style2Obj } from './utils';

interface AppOptionsConfig {
  ua?: string;
  config?: MApp;
  platform?: 'designer' | 'device';
  jsEngine?: 'browser';
  curPage?: Id;
  transformStyle?: (style: Record<string, any>) => Record<string, any>;
}

interface EventCache {
  eventConfig: EventItemConfig;
  fromCpt: any;
  args: any[];
}
class App extends EventEmitter {
  public env;

  public pages = new Map<Id, Page>();

  public page: Page | undefined;

  public platform = 'device';
  public jsEngine = 'browser';

  public rootFontSize = document.documentElement.style.fontSize;
  public zoomRatio = {
    x: 1,
    y: 1,
  };

  public components = new Map();

  public eventQueueMap: Record<string, EventCache[]> = {};

  constructor(options: AppOptionsConfig) {
    super();
    this.env = new Env();

    options.platform && (this.platform = options.platform);
    options.jsEngine && (this.jsEngine = options.jsEngine);

    // 根据屏幕大小计算出跟节点的font-size，用于rem样式的适配
    if (this.platform === 'device' || this.platform === 'browser') {
      const calcFontsize = () => {
        let { width } = document.documentElement.getBoundingClientRect();
        width = Math.max(600, width);
        const fontSize = width / 10.24;
        this.rootFontSize = document.documentElement.style.fontSize = `${fontSize}px`;
      };

      calcFontsize();

      document.body.style.fontSize = '14px';

      globalThis.addEventListener('resize', calcFontsize);
    }

    if (options.transformStyle) {
      this.transformStyle = options.transformStyle;
    }

    options.config && this.setConfig(options.config, options.curPage);

    bindCommonEventListener(this);
  }

  /**
   * 将dsl中的style配置转换成css，主要是将数子转成rem为单位的样式值，例如100将被转换成1rem
   * @param style Object
   * @returns Object
   */
  public transformStyle(style: Record<string, any>) {
    if (!style) {
      return {};
    }

    let styleObj: Record<string, any> = {};

    const results: Record<string, any> = {};

    if (typeof style === 'string') {
      styleObj = style2Obj(style);
    }
    else {
      styleObj = { ...style };
    }

    const whiteList = ['zIndex', 'opacity', 'fontWeight'];

    Object.entries(styleObj).forEach(([key, value]) => {
      if (key === 'backgroundImage') {
        value && (results[key] = fillBackgroundImage(value));
      }
      else if (key === 'transform' && typeof value !== 'string') {
        results[key] = Object.entries(value as Record<string, string>)
          .map(([transformKey, transformValue]) => {
            let defaultValue = 0;
            if (transformKey === 'scale') {
              defaultValue = 1;
            }
            return `${transformKey}(${transformValue || defaultValue})`;
          })
          .join(' ');
      }
      else if (!whiteList.includes(key) && value && /^-?\d*(?:\.\d*)?$/.test(value)) {
        let radio = 1;
        if (key === 'height' || key === 'top') {
          radio = this.zoomRatio.y;
        }
        else {
          radio = this.zoomRatio.x;
        }
        results[key] = `${value * radio}px`;
      }
      else {
        results[key] = value;
      }
    });
    return results;
  }

  /**
   * 设置dsl
   * @param config dsl跟节点
   * @param curPage 当前页面id
   */
  public setConfig(config: MApp, curPage?: Id) {
    this.pages = new Map();

    config.items?.forEach((page) => {
      this.pages.set(
        page.id,
        new Page({
          config: page,
          app: this,
        }),
      );
    });

    this.setPage(curPage || this.page?.data?.id);
  }

  public setPage(id?: Id) {
    let page;

    if (id) {
      page = this.pages.get(id);
    }

    if (!page) {
      page = this.pages.get(this.pages.keys().next().value!);
    }

    this.page = page;

    if (this.platform !== 'browser') {
      this.bindEvents();
    }
    this.calcZoomRatio(page);
  }

  public calcZoomRatio(page?: Page) {
    if (!page)
      return;
    if (this.platform !== 'device')
      return;

    const templateWidth = Number(page.data.style!.width);
    const templateHeight = Number(page.data.style!.height);
    if (!templateWidth || !templateHeight)
      throw new Error('模板页面宽高不明确');
    const { width: screenWidth, height: screenHeight } = document.documentElement.getBoundingClientRect(); ;

    this.zoomRatio = {
      x: screenWidth / templateWidth,
      y: screenHeight / templateHeight,
    };
  }

  public registerComponent(type: string, Component: any) {
    this.components.set(type, Component);
  }

  public unregisterComponent(type: string) {
    this.components.delete(type);
  }

  public resolveComponent(type: string) {
    return this.components.get(type);
  }

  public bindEvents() {
    if (!this.page)
      return;

    this.removeAllListeners();

    for (const [, value] of this.page.nodes) {
      value.events?.forEach(event => this.bindEvent(event, `${value.data.id}`));
    }
  }

  public bindEvent(event: EventItemConfig, id: string) {
    let { name: eventName } = event;
    if (DEFAULT_EVENTS.findIndex(defaultEvent => defaultEvent.value === eventName) > -1) {
      // common 事件名通过 node id 避免重复触发
      eventName = getCommonEventName(eventName, id);
    }

    this.on(eventName, (fromCpt, ...args) => {
      this.eventHandler(event, fromCpt, args);
    });
  }

  public eventHandler(eventConfig: EventItemConfig, fromCpt: any, args: any[]) {
    if (!this.page)
      throw new Error('当前没有页面');

    const { method: methodName, to } = eventConfig;

    const toNode = this.page.getNode(to);
    if (!toNode)
      throw new Error(`ID为${to}的组件不存在`);

    if (isCommonMethod(methodName)) {
      return triggerCommonMethod(methodName, toNode);
    }

    if (toNode.instance) {
      if (typeof toNode.instance[methodName] === 'function') {
        toNode.instance[methodName](fromCpt, ...args);
      }
    }
    else {
      this.addEventToMap({
        eventConfig,
        fromCpt,
        args,
      });
    }
  }

  public destroy() {
    this.removeAllListeners();
    this.pages.clear();
  }

  private addEventToMap(event: EventCache) {
    if (this.eventQueueMap[event.eventConfig.to]) {
      this.eventQueueMap[event.eventConfig.to].push(event);
    }
    else {
      this.eventQueueMap[event.eventConfig.to] = [event];
    }
  }
}

export default App;
