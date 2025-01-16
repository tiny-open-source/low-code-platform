import type { Id } from '@lowcode/schema';
import type { CanSelect, GuidesEventData, RemoveData, Runtime, StageCoreConfig, UpdateData, UpdateEventData } from './types';
// eslint-disable-next-line unicorn/prefer-node-protocol
import { EventEmitter } from 'events';
import { DEFAULT_ZOOM, GHOST_EL_ID_PREFIX } from './const';
import StageDragResize from './StageDragResize';
import StageHighlight from './StageHighlight';
import StageMask from './StageMask';
import StageRenderer from './StageRenderer';
import { addSelectedClassName, removeSelectedClassName } from './utils';

class StageCore extends EventEmitter {
  public selectedDom: Element | undefined;
  public highlightedDom: Element | undefined;

  public config: StageCoreConfig;
  public zoom = DEFAULT_ZOOM;

  public renderer: StageRenderer;
  public mask: StageMask;
  public dr: StageDragResize;
  public highlightLayer: StageHighlight;

  public container?: HTMLDivElement;
  private canSelect: CanSelect;
  constructor(config: StageCoreConfig) {
    super();
    this.config = config;
    this.setZoom(config.zoom);
    this.canSelect = config.canSelect || ((el: HTMLElement) => !!el.id);

    this.renderer = new StageRenderer({ core: this });
    this.mask = new StageMask({ core: this });
    this.dr = new StageDragResize({ core: this, container: this.mask.content });
    this.highlightLayer = new StageHighlight({ core: this, container: this.mask.wrapper });
    this.renderer.on('runtime-ready', (runtime: Runtime) => {
      this.emit('runtime-ready', runtime);
    });
    this.renderer.on('page-el-update', (el: HTMLElement) => {
      this.mask.observe(el);
    });

    this.mask
      .on('beforeSelect', (event: MouseEvent) => {
        this.setElementFromPoint(event);
      })
      .on('select', () => {
        this.emit('select', this.selectedDom);
      })
      .on('changeGuides', (data: GuidesEventData) => {
        this.dr.setGuidelines(data.type, data.guides);
        this.emit('changeGuides', data);
      })
      .on('highlight', async (event: MouseEvent) => {
        await this.setElementFromPoint(event);
        if (this.highlightedDom === this.selectedDom) {
          this.highlightLayer.clearHighlight();
          return;
        }
        this.highlightLayer.highlight(this.highlightedDom as HTMLElement);
        this.emit('highlight', this.highlightedDom);
      })
      .on('clearHighlight', async () => {
        this.highlightLayer.clearHighlight();
      });

    // 要先触发select，在触发update
    this.dr
      .on('update', (data: UpdateEventData) => {
        setTimeout(() => this.emit('update', data));
      })
      .on('sort', (data: UpdateEventData) => {
        setTimeout(() => this.emit('sort', data));
      });
  }

  public add(data: UpdateData): Promise<void> {
    return this.renderer?.getRuntime().then(runtime => runtime?.add?.(data));
  }

  public remove(data: RemoveData): Promise<void> {
    return this.renderer?.getRuntime().then(runtime => runtime?.remove?.(data));
  }

  public async setElementFromPoint(event: MouseEvent) {
    const { renderer, zoom } = this;
    const doc = renderer.contentWindow?.document;
    // 记录点击位置
    let x = event.clientX;
    let y = event.clientY;

    if (renderer.iframe) {
      const rect = renderer.iframe.getClientRects()[0];
      if (rect) {
        // 计算点击位置相对于iframe的位置
        x = x - rect.left;
        y = y - rect.top;
      }
    }

    const els = doc?.elementsFromPoint(x / zoom, y / zoom) as HTMLElement[];

    let stopped = false;
    const stop = () => (stopped = true);

    for (const el of els) {
      if (!el.id.startsWith(GHOST_EL_ID_PREFIX) && (await this.canSelect(el, event, stop))) {
        if (stopped)
          break;
        if (event.type === 'mousemove') {
          this.highlight(el);
          break;
        }
        this.select(el, event);
        break;
      }
    }
  }

  /**
   * 选中组件
   * @param idOrEl 组件Dom节点的id属性，或者Dom节点
   */
  public async select(idOrEl: Id | HTMLElement, event?: MouseEvent): Promise<void> {
    const el = await this.getTargetElement(idOrEl);
    if (el === this.selectedDom)
      return;

    const runtime = await this.renderer.getRuntime();

    await runtime?.select?.(el.id);

    if (runtime?.beforeSelect) {
      await runtime.beforeSelect(el);
    }

    this.mask.setLayout(el);
    this.dr.select(el, event);

    if (this.config.autoScrollIntoView || el.dataset.autoScrollIntoView) {
      this.mask.intersectionObserver?.observe(el);
    }

    this.selectedDom = el;
    if (this.renderer.contentWindow) {
      removeSelectedClassName(this.renderer.contentWindow.document);
      if (this.selectedDom) {
        addSelectedClassName(this.selectedDom, this.renderer.contentWindow.document);
      }
    }
  }

  /**
   * 更新选中的节点
   * @param data 更新的数据
   */
  public update(data: UpdateData): Promise<void> {
    const { config } = data;

    return this.renderer?.getRuntime().then((runtime) => {
      runtime?.update?.(data);
      // 更新配置后，需要等组件渲染更新
      setTimeout(() => {
        const el = this.renderer.contentWindow?.document.getElementById(`${config.id}`);
        // 有可能dom已经重新渲染，不再是原来的dom了，所以这里判断id，而不是判断el === this.selectedDom
        if (el && el.id === this.selectedDom?.id) {
          this.selectedDom = el;
          // 更新了组件的布局，需要重新设置mask是否可以滚动
          this.mask.setLayout(el);
          this.dr.updateMoveable(el);
        }
      }, 0);
    });
  }

  /**
   * 高亮选中组件
   * @param idOrEl 页面Dom节点
   */
  public async highlight(idOrEl: HTMLElement | Id): Promise<void> {
    let el;
    try {
      el = await this.getTargetElement(idOrEl);
    }
    catch {
      this.highlightLayer.clearHighlight();
      return;
    }
    if (el === this.highlightedDom)
      return;
    this.highlightLayer.highlight(el);
    this.highlightedDom = el;
  }

  public setZoom(zoom: number = DEFAULT_ZOOM) {
    this.zoom = zoom;
  }

  /**
   * 挂载Dom节点
   * @param el 将stage挂载到该Dom节点上
   */
  public async mount(el: HTMLDivElement) {
    this.container = el;
    const { renderer, mask } = this;

    await renderer.mount(el);
    mask.mount(el);

    this.emit('mounted');
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    const { renderer } = this;

    renderer.destroy();

    this.removeAllListeners();

    this.container = undefined;
  }

  /**
   * 清空所有参考线
   */
  public clearGuides() {
    this.mask.clearGuides();
    this.dr.clearGuides();
  }

  private async getTargetElement(idOrEl: Id | HTMLElement): Promise<HTMLElement> {
    if (typeof idOrEl === 'string' || typeof idOrEl === 'number') {
      const el = this.renderer.contentWindow?.document.getElementById(`${idOrEl}`);
      if (!el)
        throw new Error(`不存在ID为${idOrEl}的元素`);
      return el;
    }
    return idOrEl;
  }
}

export default StageCore;
