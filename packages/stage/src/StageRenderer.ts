import type StageCore from './StageCore';
import type { Runtime, RuntimeWindow } from './types';

import { getHost, injectStyle, isSameDomain } from '@low-code/utils';
import { EventEmitter } from 'eventemitter3';
import style from './style.css?raw';

export default class StageRenderer extends EventEmitter {
  core: StageCore;
  /** 组件的js、css执行的环境，直接渲染为当前window，iframe渲染则为iframe.contentWindow */
  public contentWindow: RuntimeWindow | null = null;
  public runtime: Runtime | null = null;
  public runtimeUrl?: string;
  public iframe?: HTMLIFrameElement;
  private render?: (stage: StageCore) => HTMLDivElement | void | Promise<HTMLDivElement | void>;

  constructor({ core }: { core: StageCore }) {
    super();
    this.core = core;
    this.runtimeUrl = core.config.runtimeUrl || '';
    this.render = core.config.render;
    this.iframe = globalThis.document.createElement('iframe');

    // 同源，直接加载
    this.iframe.src = isSameDomain(this.runtimeUrl) ? this.runtimeUrl : '';

    this.iframe.style.cssText = `
      border: 0;
      width: 100%;
      height: 100%;
    `;

    this.iframe.addEventListener('load', this.loadHandler);
  }

  /**
   * 挂载Dom节点
   * @param el 将页面挂载到该Dom节点上
   */
  public async mount(el: HTMLDivElement) {
    if (!this.iframe) {
      throw new Error('mount 失败');
    }

    if (!isSameDomain(this.runtimeUrl) && this.runtimeUrl) {
      // 不同域，使用srcdoc发起异步请求，需要目标地址支持跨域
      let html = await fetch(this.runtimeUrl).then(res => res.text());
      // 使用base, 解决相对路径或绝对路径的问题
      const base = `${location.protocol}//${getHost(this.runtimeUrl)}`;
      html = html.replace('<head>', `<head>\n<base href="${base}">`);
      this.iframe.srcdoc = html;
    }

    el.appendChild<HTMLIFrameElement>(this.iframe);

    this.postLowCodeRuntimeReady();
  }

  public getRuntime = (): Promise<Runtime> => {
    if (this.runtime)
      return Promise.resolve(this.runtime);
    return new Promise((resolve) => {
      const listener = (runtime: Runtime) => {
        this.off('runtime-ready', listener);
        resolve(runtime);
      };
      this.on('runtime-ready', listener);
    });
  };

  public getDocument(): Document | undefined {
    return this.contentWindow?.document;
  }

  public getLowCodeApi = () => ({
    onPageElUpdate: (el: HTMLElement) => this.emit('page-el-update', el),
    onRuntimeReady: (runtime: Runtime) => {
      this.runtime = runtime;
      // @ts-ignore
      globalThis.runtime = runtime;
      this.emit('runtime-ready', runtime);
    },
  });

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.iframe?.removeEventListener('load', this.loadHandler);
    this.contentWindow = null;
    this.iframe?.remove();
    this.iframe = undefined;
    this.removeAllListeners();
  }

  private loadHandler = async () => {
    if (!this.contentWindow?.['low-code']) {
      this.postLowCodeRuntimeReady();
    }

    if (!this.contentWindow)
      return;

    if (this.render) {
      const el = await this.render(this.core);
      if (el) {
        this.contentWindow.document?.body?.appendChild(el);
      }
    }

    this.emit('onload');

    injectStyle(this.contentWindow.document, style);
  };

  private postLowCodeRuntimeReady() {
    this.contentWindow = this.iframe?.contentWindow as RuntimeWindow;

    this.contentWindow['low-code'] = this.getLowCodeApi();

    this.contentWindow.postMessage(
      {
        lowCodeRuntimeReady: true,
      },
      '*',
    );
  }
}
