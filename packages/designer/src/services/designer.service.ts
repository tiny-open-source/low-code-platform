import type { Id, MApp, MContainer, MNode, MPage } from '@low-code/schema';

import type { AddMNode, DesignerNodeInfo, PastePosition, StoreState } from '../type';
import type { StepValue } from './history.service';
import { NodeType } from '@low-code/schema';

import { getNodePath, isNumber, isPage, isPop } from '@low-code/utils';
import { cloneDeep, isObject, mergeWith, uniq } from 'lodash-es';
import { reactive, toRaw } from 'vue';

import { LayerOffset, Layout } from '../type';
import { change2Fixed, COPY_STORAGE_KEY, Fixed2Other, fixNodePosition, getInitPositionStyle, getNodeIndex, getNodeInfo, getPageList, isFixed, setLayout } from '../utils/editor';
import { beforePaste, getAddParent } from '../utils/operator';
import BaseService from './base.service';
import historyService from './history.service';
import propsService from './props.service';
import storageService, { Protocol } from './storage.service';

const canUsePluginMethods = {
  async: [
    'getLayout',
    'select',
    'doAdd',
    'add',
    'doRemove',
    'remove',
    'doUpdate',
    'update',
    'sort',
    'copy',
    'paste',
    'doPaste',
    'duAlignCenter',
    'alignCenter',
    'moveLayer',
    'moveToContainer',
    'move',
    'undo',
    'redo',
    'highlight',
  ] as const,
  sync: [],
};
class Designer extends BaseService {
  public state: StoreState = reactive({
    root: null,
    page: null,
    parent: null,
    node: null,
    nodes: [],
    stage: null,
    highlightNode: null,
    modifiedNodeIds: new Map(),
    pageLength: 0,
    stageLoading: true,
  });

  private isHistoryStateChange = false;

  constructor() {
    super(
      canUsePluginMethods.async.map(methodName => ({ name: methodName, isAsync: true })),
      // 需要注意循环依赖问题，如果函数间有相互调用的话，不能设置为串行调用
      ['select', 'update', 'moveLayer'],
    );
  }

  /**
   * 获取当前指点节点配置
   * @param name  'root' | 'page' | 'parent' | 'node' | 'highlightNode' | 'nodes'
   * @returns MNode
   */
  public get<K extends keyof StoreState>(name: K): StoreState[K] {
    return this.state[name];
  }

  /**
   * 设置当前指点节点配置
   * @param name 'root' | 'page' | 'parent' | 'node' | 'highlightNode' | 'nodes' | 'stageLoading'
   * @param value MNode
   */
  public set<K extends keyof StoreState>(name: K, value: StoreState[K]) {
    this.state[name] = value;
    // log('store set ', name, ' ', value);
    // set nodes时将node设置为nodes第一个元素
    if (name === 'nodes') {
      this.set('node', (value as unknown as MNode[])[0]);
    }
    if (name === 'root') {
      if (Array.isArray(value)) {
        throw new TypeError('root 不能为数组');
      }
      if (value && isObject(value)) {
        const app = value as unknown as MApp;
        this.state.pageLength = getPageList(app).length || 0;
        this.state.stageLoading = this.state.pageLength !== 0;
      }
      else {
        this.state.pageLength = 0;
        this.state.stageLoading = false;
      }
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
  public async copy(config: MNode | MNode[]): Promise<void> {
    await storageService.setItem(COPY_STORAGE_KEY, Array.isArray(config) ? config : [config], {
      protocol: Protocol.OBJECT,
    });
  }

  public async paste(position: PastePosition = {}): Promise<MNode | MNode[] | void> {
    const config: MNode[] = await storageService.getItem(COPY_STORAGE_KEY);

    if (!Array.isArray(config))
      return;

    const pasteConfigs = await this.doPaste(config, position);

    return this.add(pasteConfigs);
  }

  public async doPaste(config: MNode[], position: PastePosition = {}): Promise<MNode[]> {
    const pasteConfigs = await beforePaste(position, cloneDeep(config));
    return pasteConfigs;
  }

  public async replace(nodes: MNode[], config: MNode[] | MNode) {
    if (config && !Array.isArray(config)) {
      config = [config];
    }
    // 如果粘贴的节点和当前选中的节点相同，则不进行替换
    if (config![0]!.id === nodes[0].id)
      return;

    const { parent } = this.getNodeInfo(nodes[0].id, false);
    const configs = await this.doReplace(nodes, config);
    await this.remove(nodes);
    await this.add(configs, parent!);
  }

  public async doReplace(beReplacedNode: MNode[], replacedNode: MNode[]) {
    const left = Math.min(...beReplacedNode.map(item => item.style?.left || 0));
    const top = Math.min(...beReplacedNode.map(item => item.style?.top || 0));
    const pasteConfigs = await beforePaste({
      left,
      top,
    }, replacedNode);
    if (pasteConfigs.length > 1) {
      return pasteConfigs;
    }
    return pasteConfigs[0] as AddMNode;
  }

  /**
   * 选中指定节点（将指定节点设置成当前选中状态）
   * @param config 指定节点配置或者ID
   * @returns 当前选中的节点配置
   */
  public async select(config: MNode | Id): Promise<MNode> | never {
    const { node, page, parent } = this.selectedConfigExceptionHandler(config);
    this.set('node', node!);
    this.set('nodes', [node!]);
    this.set('page', page || null);
    this.set('parent', parent || null);

    if (page) {
      historyService.changePage(toRaw(page));
    }
    else {
      historyService.reset();
    }

    if (node?.id) {
      this.get('stage')
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
          getNodePath(node.id, this.get('root')?.items),
        );
    }

    this.emit('select', node);

    return node!;
  }

  /**
   * 多选
   * @param ids 指定节点ID
   * @returns 加入多选的节点配置
   */
  public multiSelect(ids: Id[]): void {
    const nodes: MNode[] = [];
    const idsUnique = uniq(ids);
    idsUnique.forEach((id) => {
      const { node } = this.getNodeInfo(id);
      if (!node)
        return;
      nodes.push(node);
    });
    this.set('nodes', nodes);
  }

  public async doAdd(node: MNode, parent: MContainer): Promise<MNode> {
    const root = this.get('root');

    if (!root)
      throw new Error('root为空');

    const curNode = this.get('node');
    const stage = this.get('stage');

    if (!curNode)
      throw new Error('当前选中节点为空');

    if ((parent?.type === NodeType.ROOT || curNode.type === NodeType.ROOT) && node.type !== NodeType.PAGE) {
      throw new Error('app下不能添加组件');
    }

    if (parent.id !== curNode.id) {
      const index = parent.items.indexOf(curNode);
      parent?.items?.splice(index + 1, 0, node);
    }
    else {
      // 新增节点添加到配置中
      parent?.items?.push(node);
    }

    const layout = await this.getLayout(toRaw(parent), node as MNode);
    node.style = getInitPositionStyle(node.style, layout);

    await stage?.add({
      config: cloneDeep(node),
      parent: cloneDeep(parent),
      parentId: parent.id,
      root: cloneDeep(root),
    });

    const newStyle = fixNodePosition(node, parent, stage);

    if (newStyle && (newStyle.top !== node.style.top || newStyle.left !== node.style.left)) {
      node.style = newStyle;
      await stage?.update({ config: cloneDeep(node), parentId: parent.id, root: cloneDeep(root) });
    }

    this.addModifiedNodeId(node.id);

    return node;
  }

  /**
   * 向指点容器添加组件节点
   * @param addConfig 将要添加的组件节点配置
   * @param parent 要添加到的容器组件节点配置，如果不设置，默认为当前选中的组件的父节点
   * @returns 添加后的节点
   */
  public async add(addNode: AddMNode | MNode[], parent?: MContainer | null): Promise<MNode | MNode[]> {
    const stage = this.get('stage');

    // 新增多个组件只存在于粘贴多个组件,粘贴的是一个完整的config,所以不再需要getPropsValue
    const addNodes: any[] = [];
    if (!Array.isArray(addNode)) {
      const { type, inputEvent, ...config } = addNode;

      if (!type)
        throw new Error('组件类型不能为空');

      addNodes.push({ ...toRaw(await propsService.getPropsValue(type, config)) });
    }
    else {
      addNodes.push(...addNode);
    }

    const newNodes = await Promise.all(
      addNodes.map((node) => {
        const root = this.get('root');
        if ((isPage(node)) && root) {
          return this.doAdd(node, root);
        }
        const parentNode = parent && typeof parent !== 'function' ? parent : getAddParent(node);
        if (!parentNode)
          throw new Error('未找到父元素');
        return this.doAdd(node, parentNode);
      }),
    );
    if (newNodes.length > 1) {
      const newNodeIds = newNodes.map(node => node.id);
      // 触发选中样式
      stage?.multiSelect(newNodeIds);
      await this.multiSelect(newNodeIds);
    }
    else {
      await this.select(newNodes[0]);

      if (isPage(newNodes[0])) {
        this.state.pageLength += 1;
      }
      else {
        // 新增页面，这个时候页面还没有渲染出来，此时select会出错，在runtime-ready的时候回去select
        stage?.select(newNodes[0].id);
      }
    }

    this.pushHistoryState();

    this.emit('add', newNodes);

    return newNodes.length > 1 ? newNodes : newNodes[0];
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
    this.set('highlightNode', node!);
  }

  /**
   * 将id为id1的组件移动到id为id2的组件位置上，例如：[1,2,3,4] -> sort(1,3) -> [2,1,3,4]
   * @param id1 组件ID
   * @param id2 组件ID
   * @returns void
   */
  public async sort(id1: Id, id2: Id): Promise<void> {
    const root = this.get('root');
    if (!root)
      throw new Error('root为空');

    const node = this.get('node');
    if (!node)
      throw new Error('当前节点为空');

    const parent = cloneDeep(toRaw(this.get('parent')));
    if (!parent)
      throw new Error('父节点为空');

    const index2 = parent.items.findIndex((node: MNode) => `${node.id}` === `${id2}`);
    // 在 id1 的兄弟组件中若无 id2 则直接 return
    if (index2 < 0)
      return;
    const index1 = parent.items.findIndex((node: MNode) => `${node.id}` === `${id1}`);

    parent.items.splice(index2, 0, ...parent.items.splice(index1, 1));

    await this.update(parent);
    await this.select(node);

    this.get('stage')?.update({
      config: cloneDeep(node),
      parentId: parent.id,
      root: cloneDeep(root),
    });

    this.addModifiedNodeId(parent.id);
    this.pushHistoryState();
  }

  /**
   * 根据ID获取指点节点的父节点配置
   * @param id 组件ID
   * @param {boolean} raw 是否使用toRaw
   * @returns 指点组件的父节点配置
   */
  public getParentById(id: Id, raw = true): MContainer | null {
    const { parent } = this.getNodeInfo(id, raw);
    return parent;
  }

  public async doAlignCenter(config: MNode): Promise<MNode> {
    const parent = this.getParentById(config.id);

    if (!parent)
      throw new Error('找不到父节点');

    const node = cloneDeep(toRaw(config));
    const layout = await this.getLayout(parent, node);
    if (layout === Layout.RELATIVE) {
      return config;
    }

    if (!node.style)
      return config;

    const stage = this.get('stage');
    const doc = stage?.renderer.contentWindow?.document;

    if (doc) {
      const el = doc.getElementById(`${node.id}`);
      const parentEl = el?.offsetParent;
      if (parentEl && el) {
        node.style.left = (parentEl.clientWidth - el.clientWidth) / 2;
      }
    }
    else if (parent.style && isNumber(parent.style?.width) && isNumber(node.style?.width)) {
      node.style.left = (parent.style.width - node.style.width) / 2;
    }

    return node;
  }

  /**
   * 将指点节点设置居中
   * @param config 组件节点配置
   * @returns 当前组件节点配置
   */
  public async alignCenter(config: MNode | MNode[]): Promise<MNode | MNode[]> {
    const nodes = Array.isArray(config) ? config : [config];
    const stage = this.get('stage');

    const newNodes = await Promise.all(nodes.map(node => this.doAlignCenter(node)));

    const newNode = await this.update(newNodes);

    if (newNodes.length > 1) {
      await stage?.multiSelect(newNodes.map(node => node.id));
    }
    else {
      await stage?.select(newNodes[0].id);
    }

    return newNode;
  }

  /**
   * 移动当前选中节点位置
   * @param offset 偏移量
   */
  public async moveLayer(offset: number | LayerOffset): Promise<void> {
    const root = this.get('root');
    if (!root)
      throw new Error('root为空');

    const parent = this.get('parent');
    if (!parent)
      throw new Error('父节点为空');

    const node = this.get('node');
    if (!node)
      throw new Error('当前节点为空');

    const brothers: MNode[] = parent?.items || [];
    const index = brothers.findIndex(item => `${item.id}` === `${node?.id}`);

    if (offset === LayerOffset.TOP) {
      brothers.splice(brothers.length - 1, 0, brothers.splice(index, 1)[0]);
    }
    else if (offset === LayerOffset.BOTTOM) {
      brothers.splice(0, 0, brothers.splice(index, 1)[0]);
    }
    else {
      brothers.splice(index + Number.parseInt(`${offset}`, 10), 0, brothers.splice(index, 1)[0]);
    }

    const grandparent = this.getParentById(parent!.id);
    this.get('stage')?.update({
      config: cloneDeep(toRaw(parent)),
      parentId: grandparent?.id,
      root: cloneDeep(root),
    });

    this.addModifiedNodeId(parent.id);
    this.pushHistoryState();
  }

  /**
   * 移动到指定容器中
   * @param config 需要移动的节点
   * @param targetId 容器ID
   */
  public async moveToContainer(config: MNode, targetId: Id): Promise<MNode | undefined> {
    const root = this.get('root');
    const { node, parent } = this.getNodeInfo(config.id, false);
    const target = this.getNodeById(targetId, false) as MContainer;

    const stage = this.get('stage');
    if (root && node && parent && stage) {
      const index = getNodeIndex(node.id, parent);
      parent.items?.splice(index, 1);

      await stage.remove({ id: node.id, parentId: parent.id, root: cloneDeep(root) });

      const layout = await this.getLayout(target);

      const newConfig = mergeWith(cloneDeep(node), config, (_objValue, srcValue) => {
        if (Array.isArray(srcValue)) {
          return srcValue;
        }
      });
      newConfig.style = getInitPositionStyle(newConfig.style, layout);

      target.items.push(newConfig);

      await stage.select(targetId);

      const targetParent = this.getParentById(target.id);
      await stage.update({
        config: cloneDeep(target),
        parentId: targetParent?.id,
        root: cloneDeep(root),
      });

      await this.select(newConfig);
      stage.select(newConfig.id);

      this.addModifiedNodeId(target.id);
      this.addModifiedNodeId(parent.id);
      this.pushHistoryState();

      return newConfig;
    }
  }

  public async move(left: number, top: number) {
    const node = toRaw(this.get('node'));
    if (!node || isPage(node))
      return;

    const { style, id, type } = node;
    if (!style || style.position !== 'absolute')
      return;

    if (top && !isNumber(style.top))
      return;
    if (left && !isNumber(style.left))
      return;

    this.update({
      id,
      type,
      style: {
        ...style,
        left: Number(style.left) + left,
        top: Number(style.top) + top,
      },
    });
  }

  public async selectNextNode(): Promise<MNode | null> | never {
    const node = toRaw(this.get('node'));

    if (!node || isPage(node) || node.type === NodeType.ROOT)
      return node;

    const parent = toRaw(this.getParentById(node.id));

    if (!parent)
      return node;

    const index = getNodeIndex(node.id, parent);

    const nextNode = parent.items[index + 1] || parent.items[0];

    await this.select(nextNode);
    this.get('stage')?.select(nextNode.id);

    return nextNode;
  }

  public async selectNextPage(): Promise<MNode> | never {
    const root = toRaw(this.get('root'));
    const page = toRaw(this.get('page'));

    if (!page)
      throw new Error('page不能为空');
    if (!root)
      throw new Error('root不能为空');

    const index = getNodeIndex(page.id, root);

    const nextPage = root.items[index + 1] || root.items[0];

    await this.select(nextPage);
    this.get('stage')?.select(nextPage.id);

    return nextPage;
  }

  public selectRoot() {
    const root = this.get('root');
    if (!root)
      return;

    this.set('nodes', [root]);
    this.set('parent', null);
    this.set('page', null);
    this.set('stage', null);
    this.set('highlightNode', null);
  }

  public async doRemove(node: MNode): Promise<void> {
    const root = this.get('root');
    if (!root)
      throw new Error('root不能为空');

    const { parent, node: curNode } = this.getNodeInfo(node.id, false);

    if (!parent || !curNode)
      throw new Error('找不到删除的节点');

    const index = getNodeIndex(curNode.id, parent);

    if (typeof index !== 'number' || index === -1)
      throw new Error('找不到删除的节点');

    parent.items?.splice(index, 1);
    const stage = this.get('stage');
    stage?.remove({ id: node.id, parentId: parent.id, root: cloneDeep(root) });

    const selectDefault = async (pages: MNode[]) => {
      if (pages[0]) {
        await this.select(pages[0]);
        stage?.select(pages[0].id);
      }
      else {
        this.selectRoot();

        historyService.resetPage();
      }
    };

    const rootItems = root.items || [];

    if (isPage(node)) {
      this.state.pageLength -= 1;

      await selectDefault(rootItems);
    }
    else {
      await this.select(parent);
      stage?.select(parent.id);

      this.addModifiedNodeId(parent.id);
    }

    if (!rootItems.length) {
      this.resetModifiedNodeId();
      historyService.reset();
    }
  }

  /**
   * 删除组件
   * @param {object} nodeOrNodeList
   */
  public async remove(nodeOrNodeList: MNode | MNode[]): Promise<void> {
    const nodes = Array.isArray(nodeOrNodeList) ? nodeOrNodeList : [nodeOrNodeList];

    await Promise.all(nodes.map(node => this.doRemove(node)));

    if (!(isPage(nodes[0]))) {
      // 更新历史记录
      this.pushHistoryState();
    }

    this.emit('remove', nodes);
  }

  public async doUpdate(config: MNode): Promise<MNode> {
    const root = this.get('root');
    if (!root)
      throw new Error('root为空');

    if (!config?.id)
      throw new Error('没有配置或者配置缺少id值');

    const info = this.getNodeInfo(config.id, false);

    if (!info.node)
      throw new Error(`获取不到id为${config.id}的节点`);

    const node = toRaw(info.node);

    let newConfig = await this.toggleFixedPosition(toRaw(config), node, root);

    newConfig = mergeWith(cloneDeep(node), newConfig, (objValue, srcValue, key, object: any, source: any) => {
      if (typeof srcValue === 'undefined' && Object.hasOwn(source, key)) {
        return '';
      }

      if (isObject(srcValue) && Array.isArray(objValue)) {
        // 原来的配置是数组，新的配置是对象，则直接使用新的值
        return srcValue;
      }
      if (Array.isArray(srcValue)) {
        return srcValue;
      }
    });

    if (!newConfig.type)
      throw new Error('配置缺少type值');

    if (newConfig.type === NodeType.ROOT) {
      this.set('root', newConfig as MApp);
      return newConfig;
    }

    const { parent } = info;
    if (!parent)
      throw new Error('获取不到父级节点');

    const parentNodeItems = parent.items;
    const index = getNodeIndex(newConfig.id, parent);

    if (!parentNodeItems || typeof index === 'undefined' || index === -1)
      throw new Error('更新的节点未找到');

    const newLayout = await this.getLayout(newConfig);
    const layout = await this.getLayout(node);

    if (newLayout !== layout) {
      newConfig = setLayout(newConfig, newLayout);
    }
    parentNodeItems[index] = newConfig;

    // 将update后的配置更新到nodes中
    const nodes = this.get('nodes');
    const targetIndex = nodes.findIndex((nodeItem: MNode) => `${nodeItem.id}` === `${newConfig.id}`);
    nodes.splice(targetIndex, 1, newConfig);
    this.set('nodes', [...nodes]);

    this.get('stage')?.update({
      config: cloneDeep(newConfig),
      parentId: parent.id,
      root: cloneDeep(root),
    });
    if (newConfig.type === NodeType.PAGE) {
      this.set('page', newConfig as MPage);
    }

    this.addModifiedNodeId(newConfig.id);

    return newConfig;
  }

  /**
   * 更新节点
   * @param config 新的节点配置，配置中需要有id信息
   * @returns 更新后的节点配置
   */
  public async update(config: MNode | MNode[]): Promise<MNode | MNode[]> {
    const nodes = Array.isArray(config) ? config : [config];

    const newNodes = await Promise.all(nodes.map(node => this.doUpdate(node)));

    this.pushHistoryState();

    this.emit('update', newNodes);

    return newNodes.length > 1 ? newNodes[0] : newNodes;
  }

  private pushHistoryState() {
    const curNode = cloneDeep(toRaw(this.get('node')));
    const page = this.get('page');
    if (!this.isHistoryStateChange && curNode && page) {
      historyService.push({
        data: cloneDeep(toRaw(page)),
        modifiedNodeIds: this.get('modifiedNodeIds'),
        nodeId: curNode.id,
      });
    }
    this.isHistoryStateChange = false;
  }

  private addModifiedNodeId(id: Id) {
    if (!this.isHistoryStateChange) {
      this.get('modifiedNodeIds').set(id, id);
    }
  }

  public resetModifiedNodeId() {
    this.get('modifiedNodeIds').clear();
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
      this.get('stage')?.select(value.nodeId);
    }, 0);
  }

  private async toggleFixedPosition(dist: MNode, src: MNode, root: MApp) {
    const newConfig = cloneDeep(dist);

    if (!isPop(src) && newConfig.style?.position) {
      if (isFixed(newConfig) && !isFixed(src)) {
        newConfig.style = change2Fixed(newConfig, root);
      }
      else if (!isFixed(newConfig) && isFixed(src)) {
        newConfig.style = await Fixed2Other(newConfig, root, this.getLayout);
      }
    }

    return newConfig;
  }

  /**
   * 根据id获取组件、组件的父组件以及组件所属的页面节点
   */
  public getNodeInfo(id: Id, raw = true): DesignerNodeInfo {
    let root = this.get('root');
    if (raw) {
      root = toRaw(root);
    }

    return getNodeInfo(id, root);
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
  public getNodeById(id: Id, raw = true): MNode | null {
    const { node } = this.getNodeInfo(id, raw);
    return node;
  }

  public destroy() {
    this.removeAllListeners();
    this.set('root', null);
    this.set('node', null);
    this.set('nodes', []);
    this.set('page', null);
    this.set('parent', null);
    this.set('stage', null);
    this.set('highlightNode', null);
    this.set('modifiedNodeIds', new Map());
    this.set('pageLength', 0);
  }
}
export type DesignerService = Designer;
const designer = new Designer();

export default designer;
