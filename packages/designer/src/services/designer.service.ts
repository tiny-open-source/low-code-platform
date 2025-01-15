import type { AddMNode, DesignerNodeInfo, StoreState } from '@designer/type';
import type StageCore from '@lowcode/stage';
import type { StepValue } from './history.service';
import { Layout } from '@designer/type';

import { change2Fixed, COPY_STORAGE_KEY, Fixed2Other, generatePageNameByApp, getNodeIndex, initPosition, isFixed, setLayout } from '@designer/utils/editor';
import { type Id, type MApp, type MComponent, type MContainer, type MNode, type MPage, NodeType } from '@lowcode/schema';
import { getNodePath, isNumber, isPage, isPop } from '@lowcode/utils';
import { cloneDeep, mergeWith } from 'lodash-es';
import serialize from 'serialize-javascript';
import { reactive, toRaw } from 'vue';
import BaseService from './base.service';
import historyService from './history.service';
import propsService from './props.service';

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
    // log('store set ', name, ' ', value);

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
   * 将组将节点配置转化成string，然后存储到localStorage中
   * @param config 组件节点配置
   * @returns 组件节点配置
   */
  public async copy(config: MNode): Promise<void> {
    globalThis.localStorage.setItem(COPY_STORAGE_KEY, serialize(config));
  }

  /**
   * 从localStorage中获取节点，然后添加到当前容器中
   * @param position 如果设置，指定组件位置
   * @returns 添加后的组件节点配置
   */
  public async paste(position: { left?: number; top?: number } = {}): Promise<MNode | void> {
    const configStr = globalThis.localStorage.getItem(COPY_STORAGE_KEY);
    // eslint-disable-next-line prefer-const
    let config: any = {};
    if (!configStr) {
      return;
    }

    try {
      // eslint-disable-next-line no-eval
      eval(`config = ${configStr}`);
    }
    catch (e) {
      console.error(e);
      return;
    }

    await propsService.setNewItemId(config, this.get('root'));
    if (config.style) {
      config.style = {
        ...config.style,
        ...position,
      };
    }

    if (isPage(config)) {
      config.name = generatePageNameByApp(this.get('root'));
    }

    return await this.add(config);
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
   * 根据ID获取指点节点的父节点配置
   * @param id 组件ID
   * @param {boolean} raw 是否使用toRaw
   * @returns 指点组件的父节点配置
   */
  public getParentById(id: Id, raw = true): MContainer | undefined {
    if (!this.get<MApp | null>('root'))
      return;
    const { parent } = this.getNodeInfo(id, raw);
    return parent;
  }

  /**
   * 向指点容器添加组件节点
   * @param addConfig 将要添加的组件节点配置
   * @param parent 要添加到的容器组件节点配置，如果不设置，默认为当前选中的组件的父节点
   * @returns 添加后的节点
   */
  public async add(addNode: AddMNode, parent?: MContainer | null): Promise<MNode> {
    const { type, ...config } = addNode;
    const curNode = this.get<MContainer>('node');

    let parentNode: MNode | undefined;
    const isPage = type === NodeType.PAGE;

    if (isPage) {
      parentNode = this.get<MApp>('root');
      // 由于支持中间件扩展，在parent参数为undefined时，parent会变成next函数
    }
    else if (parent && typeof parent !== 'function') {
      parentNode = parent;
    }
    else if (curNode.items) {
      parentNode = curNode;
    }
    else {
      parentNode = this.getParentById(curNode.id, false);
    }

    if (!parentNode)
      throw new Error('未找到父元素');

    const layout = await this.getLayout(toRaw(parentNode), addNode as MNode);
    const newNode = initPosition(
      { ...toRaw(await propsService.getPropsValue(type, config)) },
      layout,
      parentNode,
      this.get<StageCore>('stage'),
    );

    if ((parentNode?.type === NodeType.ROOT || curNode.type === NodeType.ROOT) && newNode.type !== NodeType.PAGE) {
      throw new Error('app下不能添加组件');
    }

    parentNode?.items?.push(newNode);

    const stage = this.get<StageCore | null>('stage');

    await stage?.add({ config: cloneDeep(newNode), root: cloneDeep(this.get('root')) });

    await this.select(newNode);

    this.addModifiedNodeId(newNode.id);
    if (!isPage) {
      this.pushHistoryState();
    }

    stage?.select(newNode.id);

    if (isPage) {
      this.state.pageLength += 1;
    }

    this.emit('add', newNode);

    return newNode;
  }

  public async move(left: number, top: number) {
    console.log('🚀 ~ Designer ~ move ~ top:', top);
    console.log('🚀 ~ Designer ~ move ~ left:', left);
    const node = toRaw(this.get('node'));
    if (!node || isPage(node))
      return;

    const { style, id } = node;
    console.log('🚀 ~ Designer ~ move ~ style:', style);
    if (!style || style.position !== 'absolute')
      return;

    if (top && !isNumber(style.top))
      return;
    if (left && !isNumber(style.left))
      return;

    this.update({
      id,
      style: {
        ...style,
        left: Number(style.left) + left,
        top: Number(style.top) + top,
      },
    });
  }

  public async selectNextNode(): Promise<MNode> | never {
    const node = toRaw(this.get('node'));

    if (!node || isPage(node) || node.type === NodeType.ROOT)
      return node;

    const parent = toRaw(this.getParentById(node.id));

    if (!parent)
      return node;

    const index = getNodeIndex(node, parent);

    const nextNode = parent.items[index + 1] || parent.items[0];

    await this.select(nextNode);
    this.get<StageCore>('stage')?.select(nextNode.id);

    return nextNode;
  }

  public async selectNextPage(): Promise<MNode> | never {
    const root = toRaw(this.get<MApp>('root'));
    const page = toRaw(this.get('page'));

    const index = getNodeIndex(page, root);

    const nextPage = root.items[index + 1] || root.items[0];

    await this.select(nextPage);
    this.get<StageCore>('stage')?.select(nextPage.id);

    return nextPage;
  }

  /**
   * 删除组件
   * @param {object} node
   * @return {object} 删除的组件配置
   */
  public async remove(node: MNode): Promise<MNode | void> {
    if (!node?.id)
      return;

    const root = this.get<MApp | null>('root');

    if (!root)
      throw new Error('没有root');

    const { parent, node: curNode } = this.getNodeInfo(node.id, false);

    if (!parent || !curNode)
      throw new Error('找不要删除的节点');

    const index = getNodeIndex(curNode, parent);

    if (typeof index !== 'number' || index === -1)
      throw new Error('找不要删除的节点');

    parent.items?.splice(index, 1);
    const stage = this.get<StageCore | null>('stage');
    stage?.remove({ id: node.id, root: this.get('root') });

    if (node.type === NodeType.PAGE) {
      this.state.pageLength -= 1;

      if (root.items[0]) {
        await this.select(root.items[0]);
        stage?.select(root.items[0].id);
      }
      else {
        this.set('node', null);
        this.set('parent', null);
        this.set('page', null);
        this.set('stage', null);
        this.set('highlightNode', null);
        this.resetModifiedNodeId();
        historyService.reset();

        this.emit('remove', node);

        return node;
      }
    }
    else {
      await this.select(parent);
      stage?.select(parent.id);
    }

    this.addModifiedNodeId(parent.id);
    this.pushHistoryState();

    this.emit('remove', node);

    return node;
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

  public resetModifiedNodeId() {
    this.get<Map<Id, Id>>('modifiedNodeIds').clear();
  }

  /**
   * 撤销当前操作
   * @returns 上一次数据
   */
  public async undo(): Promise<StepValue | null> {
    const value = historyService.undo();
    await this.changeHistoryState(value);
    return value;
  }

  /**
   * 恢复到下一步
   * @returns 下一步数据
   */
  public async redo(): Promise<StepValue | null> {
    const value = historyService.redo();
    await this.changeHistoryState(value);
    return value;
  }

  private async changeHistoryState(value: StepValue | null) {
    if (!value)
      return;

    this.isHistoryStateChange = true;
    await this.update(value.data);
    this.set('modifiedNodeIds', value.modifiedNodeIds);
    setTimeout(async () => {
      if (!value.nodeId)
        return;
      await this.select(value.nodeId);
      this.get<StageCore | null>('stage')?.select(value.nodeId);
    }, 0);
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
const designer = new Designer();
export default designer;
