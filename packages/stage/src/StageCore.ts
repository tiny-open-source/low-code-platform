import type { CanSelect, Runtime, StageCoreConfig } from './types';
// eslint-disable-next-line unicorn/prefer-node-protocol
import { EventEmitter } from 'events';
import { DEFAULT_ZOOM } from './const';
import StageMask from './StageMask';
import StageRenderer from './StageRenderer';

class StageCore extends EventEmitter {
  public config: StageCoreConfig;
  public zoom = DEFAULT_ZOOM;
  public renderer: StageRenderer;
  public mask: StageMask;
  public container?: HTMLDivElement;
  private canSelect: CanSelect;
  constructor(config: StageCoreConfig) {
    super();
    this.config = config;
    this.setZoom(config.zoom);
    this.canSelect = config.canSelect || ((el: HTMLElement) => !!el.id);

    this.renderer = new StageRenderer({ core: this });
    this.mask = new StageMask({ core: this });

    this.renderer.on('runtime-ready', (runtime: Runtime) => {
      this.emit('runtime-ready', runtime);
    });
    this.renderer.on('page-el-update', (el: HTMLElement) => {
      console.log('page-el-update', el);
    });
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
}

export default StageCore;
