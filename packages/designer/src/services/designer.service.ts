import type StageCore from '@lowcode/stage';
import { type DesignerNodeInfo, Layout, type StoreState } from '@designer/type';
import { change2Fixed, Fixed2Other, getNodeIndex, isFixed, setLayout } from '@designer/utils/editor';

import { log } from '@designer/utils/logger';
import { type Id, type MApp, type MComponent, type MContainer, type MNode, type MPage, NodeType } from '@lowcode/schema';
import { getNodePath, isPop } from '@lowcode/utils';
import { cloneDeep, mergeWith } from 'lodash-es';
import { reactive, toRaw } from 'vue';
import BaseService from './base.service';
import historyService from './history.service';

class Designer extends BaseService {
  private isHistoryStateChange = false;
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

  constructor() {
    super(
      [
        'getLayout',
        'select',
        'add',
        'remove',
        'update',
        'sort',
        'copy',
        'paste',
        'alignCenter',
        'moveLayer',
        'move',
        'undo',
        'redo',
        'highlight',
      ],
      // 需要注意循环依赖问题，如果函数间有相互调用的话，不能设置为串行调用
      ['select', 'update', 'moveLayer'],
    );
  }

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
    log('store set ', name, ' ', value);

    if (name === 'root') {
      this.state.pageLength = (value as unknown as MApp)?.items?.length || 0;
      this.emit('root-change', value);
    }
  }

  /**
   * 只有容器拥有布局
   */
  public async getLayout(parent: MNode, node?: MNode): Promise<Layout> {
    if (node && typeof node !== 'function' && isFixed(node))
      return Layout.FIXED;

    if (parent.layout) {
      return parent.layout;
    }

    // 如果该节点没有设置position，则认为是流式布局，例如获取root的布局时
    if (!parent.style?.position) {
      return Layout.RELATIVE;
    }

    return Layout.ABSOLUTE;
  }

  /**
   * 选中指定节点（将指定节点设置成当前选中状态）
   * @param config 指定节点配置或者ID
   * @returns 当前选中的节点配置
   */
  public async select(config: MNode | Id): Promise<MNode> | never {
    const { node, page, parent } = this.selectedConfigExceptionHandler(config);
    this.set('node', node);
    this.set('page', page || null);
    this.set('parent', parent || null);

    if (page) {
      historyService.changePage(toRaw(page));
    }
    else {
      historyService.reset();
    }

    if (node?.id) {
      this.get<StageCore>('stage')
        ?.renderer
        ?.runtime
        ?.getApp?.()
        ?.emit(
          'editor:select',
          {
            node,
            page,
            parent,
          },
          getNodePath(node.id, this.get<MApp>('root').items),
        );
    }

    this.emit('select', node);

    return node!;
  }

  /**
   * 高亮指定节点
   * @param config 指定节点配置或者ID
   */
  public highlight(config: MNode | Id): void {
    const { node } = this.selectedConfigExceptionHandler(config);
    const currentHighlightNode = this.get('highlightNode');
    if (currentHighlightNode === node)
      return;
    this.set('highlightNode', node);
  }

  /**
   * 将id为id1的组件移动到id为id2的组件位置上，例如：[1,2,3,4] -> sort(1,3) -> [2,1,3,4]
   * @param id1 组件ID
   * @param id2 组件ID
   * @returns void
   */
  public async sort(id1: Id, id2: Id): Promise<void> {
    const node = this.get<MNode>('node');
    const parent = cloneDeep(toRaw(this.get<MContainer>('parent')));
    const index2 = parent.items.findIndex((node: MNode) => `${node.id}` === `${id2}`);
    // 在 id1 的兄弟组件中若无 id2 则直接 return
    if (index2 < 0)
      return;
    const index1 = parent.items.findIndex((node: MNode) => `${node.id}` === `${id1}`);

    parent.items.splice(index2, 0, ...parent.items.splice(index1, 1));

    await this.update(parent);
    await this.select(node);

    this.get<StageCore | null>('stage')?.update({ config: cloneDeep(node), root: this.get('root') });

    this.addModifiedNodeId(parent.id);
    this.pushHistoryState();
  }

  /**
   * 更新节点
   * @param config 新的节点配置，配置中需要有id信息
   * @returns 更新后的节点配置
   */
  public async update(config: MNode): Promise<MNode> {
    if (!config?.id)
      throw new Error('没有配置或者配置缺少id值');

    const info = this.getNodeInfo(config.id, false);
    if (!info.node)
      throw new Error(`获取不到id为${config.id}的节点`);

    const node = cloneDeep(toRaw(info.node));

    let newConfig = await this.toggleFixedPosition(toRaw(config), node, this.get<MApp>('root'));

    newConfig = mergeWith(cloneDeep(node), newConfig, (objValue, srcValue) => {
      if (Array.isArray(srcValue)) {
        return srcValue;
      }
    });
    if (!newConfig.type)
      throw new Error('配置缺少type值');

    if (newConfig.type === NodeType.ROOT) {
      this.set('root', newConfig);
      return newConfig;
    }

    const { parent } = info;

    if (!parent)
      throw new Error('获取不到父级节点');

    const parentNodeItems = parent.items;
    const index = getNodeIndex(newConfig, parent);

    if (!parentNodeItems || typeof index === 'undefined' || index === -1)
      throw new Error('更新的节点未找到');

    const newLayout = await this.getLayout(newConfig);
    const layout = await this.getLayout(node);

    if (newLayout !== layout) {
      newConfig = setLayout(newConfig, newLayout);
    }
    parentNodeItems[index] = newConfig;

    if (`${newConfig.id}` === `${this.get('node').id}`) {
      this.set('node', newConfig);
    }

    this.get<StageCore | null>('stage')?.update({ config: cloneDeep(newConfig), root: this.get('root') });

    if (newConfig.type === NodeType.PAGE) {
      this.set('page', newConfig);
    }

    this.addModifiedNodeId(newConfig.id);
    this.pushHistoryState();
    this.emit('update', newConfig);

    return newConfig;
  }

  private pushHistoryState() {
    const curNode = cloneDeep(toRaw(this.get('node')));
    if (!this.isHistoryStateChange) {
      historyService.push({
        data: cloneDeep(toRaw(this.get('page'))),
        modifiedNodeIds: this.get<Map<Id, Id>>('modifiedNodeIds'),
        nodeId: curNode.id,
      });
    }
    this.isHistoryStateChange = false;
  }

  private addModifiedNodeId(id: Id) {
    if (!this.isHistoryStateChange) {
      this.get<Map<Id, Id>>('modifiedNodeIds').set(id, id);
    }
  }

  private async toggleFixedPosition(dist: MNode, src: MNode, root: MApp) {
    let newConfig = cloneDeep(dist);

    if (!isPop(src) && newConfig.style?.position) {
      if (isFixed(newConfig) && !isFixed(src)) {
        newConfig = change2Fixed(newConfig, root);
      }
      else if (!isFixed(newConfig) && isFixed(src)) {
        newConfig = await Fixed2Other(newConfig, root, this.getLayout);
      }
    }

    return newConfig;
  }

  /**
   * 根据id获取组件、组件的父组件以及组件所属的页面节点
   */
  public getNodeInfo(id: Id, raw = true): DesignerNodeInfo {
    let root = this.get<MApp | null>('root');
    if (raw) {
      root = toRaw(root);
    }
    if (!root)
      return {};

    if (id === root.id) {
      return { node: root };
    }

    const path = getNodePath(id, root.items);

    if (!path.length)
      return {};

    path.unshift(root);
    const info: DesignerNodeInfo = {};

    info.node = path[path.length - 1] as MComponent;
    info.parent = path[path.length - 2] as MContainer;

    path.forEach((item) => {
      if (item.type === NodeType.PAGE) {
        info.page = item as MPage;
      }
    });

    return info;
  }

  private selectedConfigExceptionHandler(config: MNode | Id): DesignerNodeInfo {
    let id: Id;
    if (typeof config === 'string' || typeof config === 'number') {
      id = config;
    }
    else {
      id = config.id;
    }
    if (!id) {
      throw new Error('没有ID，无法选中');
    }
    const { node, parent, page } = this.getNodeInfo(id);
    if (!node)
      throw new Error('获取不到组件信息');

    if (node.id === this.state.root?.id) {
      throw new Error('不能选根节点');
    }
    return {
      node,
      parent,
      page,
    };
  }

  /**
   * 根据ID获取指点节点配置
   */
  public getNodeById(id: Id, raw = true): MNode | undefined {
    const { node } = this.getNodeInfo(id, raw);
    return node;
  }

  public destroy() {
    this.removeAllListeners();
    this.set('root', null);
    this.set('node', null);
    this.set('page', null);
    this.set('parent', null);
  }
}
export type DesignerService = Designer;
export default new Designer();
