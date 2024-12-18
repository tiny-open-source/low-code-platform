import type { StoreState } from '@designer/type';
import type { MApp, MNode } from '@lowcode/schema';
import { reactive } from 'vue';
import BaseService from './base.service';

class Designer extends BaseService {
  private state = reactive<StoreState>({
    root: null,
    page: null,
    parent: null,
    node: null,
    stage: null,
    highlightNode: null,
    modifiedNodeIds: new Map(),
    pageLength: 0,
  });

  /**
   * 获取当前指点节点配置
   * @param name  'root' | 'page' | 'parent' | 'node'
   * @returns MNode
   */
  public get<T = MNode>(name: keyof StoreState): T {
    return (this.state as any)[name];
  }

  /**
   * 设置当前指点节点配置
   * @param name 'root' | 'page' | 'parent' | 'node' | 'highlightNode'
   * @param value MNode
   */
  public set<T = MNode>(name: keyof StoreState, value: T) {
    this.state[name] = value as any;

    if (name === 'root') {
      this.state.pageLength = (value as unknown as MApp)?.items?.length || 0;
      this.emit('root-change', value);
    }
  }
}
export type DesignerService = Designer;
export default new Designer();
