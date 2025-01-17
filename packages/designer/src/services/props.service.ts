import type { PropsState } from '@designer/type';
import type { FormConfig } from '@lowcode/form';
import type { Id, MComponent, MNode, MPage } from '@lowcode/schema';
import { DEFAULT_CONFIG, fillConfig, getDefaultPropsValue } from '@designer/utils/props';
import { NodeType } from '@lowcode/schema';
import { isPop, toLine } from '@lowcode/utils';
import { cloneDeep, mergeWith, random } from 'lodash-es';
import { reactive } from 'vue';
import BaseService from './base.service';

class Props extends BaseService {
  private state = reactive<PropsState>({
    propsConfigMap: {},
    propsValueMap: {},
  });

  constructor() {
    super(['setPropsConfig', 'getPropsConfig', 'setPropsValue', 'getPropsValue', 'createId', 'setNewItemId']);
  }

  public setPropsConfigs(configs: Record<string, FormConfig>) {
    Object.keys(configs).forEach((type: string) => {
      this.setPropsConfig(toLine(type), configs[type]);
    });
    this.emit('props-configs-change');
  }

  /**
   * 为指定类型组件设置组件属性表单配置
   * @param type 组件类型
   * @param config 组件属性表单配置
   */
  public setPropsConfig(type: string, config: FormConfig) {
    this.state.propsConfigMap[type] = fillConfig(Array.isArray(config) ? config : [config]);
  }

  /**
   * 获取指点类型的组件属性表单配置
   * @param type 组件类型
   * @returns 组件属性表单配置
   */
  public async getPropsConfig(type: string): Promise<FormConfig> {
    if (type === 'area') {
      return await this.getPropsConfig('button');
    }

    return cloneDeep(this.state.propsConfigMap[type] || DEFAULT_CONFIG);
  }

  public setPropsValues(values: Record<string, MNode>) {
    Object.keys(values).forEach((type: string) => {
      this.setPropsValue(toLine(type), values[type]);
    });
  }

  /**
   * 为指点类型组件设置组件初始值
   * @param type 组件类型
   * @param value 组件初始值
   */
  public setPropsValue(type: string, value: MNode) {
    this.state.propsValueMap[type] = value;
  }

  /**
   * 获取指定类型的组件初始值
   * @param type 组件类型
   * @returns 组件初始值
   */
  public async getPropsValue(type: string, { inputEvent, ...defaultValue }: Record<string, any> = {}) {
    if (type === 'area') {
      const value = (await this.getPropsValue('button')) as MComponent;
      value.className = 'action-area';
      value.text = '';
      if (value.style) {
        value.style.backgroundColor = 'rgba(255, 255, 255, 0)';
      }
      return value;
    }

    const data = cloneDeep(defaultValue as any);

    await this.setNewItemId(data);

    return {
      ...getDefaultPropsValue(type, await this.createId(type)),
      ...mergeWith(cloneDeep(this.state.propsValueMap[type] || {}), data),
    };
  }

  public async createId(type: string | number): Promise<string> {
    return `${type}_${random(10000, false)}`;
  }

  /**
   * 将组件与组件的子元素配置中的id都设置成一个新的ID
   * @param {object} config 组件配置
   */
  public async setNewItemId(config: MNode, parent?: MPage) {
    const oldId = config.id;

    config.id = await this.createId(config.type || 'component');

    // 只有弹窗在页面下的一级子元素才有效
    if (isPop(config) && parent?.type === NodeType.PAGE) {
      updatePopId(oldId, config.id, parent);
    }

    if (config.items && Array.isArray(config.items)) {
      for (const item of config.items) {
        await this.setNewItemId(item, config as MPage);
      }
    }
  }
}
/**
 * 复制页面时，需要把组件下关联的弹窗id换测复制出来的弹窗的id
 * @param {number} oldId 复制的源弹窗id
 * @param {number} popId 新的弹窗id
 * @param {object} pageConfig 页面配置
 */
function updatePopId(oldId: Id, popId: Id, pageConfig: MPage) {
  pageConfig.items?.forEach((config) => {
    if (config.pop === oldId) {
      config.pop = popId;
      return;
    }

    if (config.popId === oldId) {
      config.popId = popId;
      return;
    }

    if (Array.isArray(config.items)) {
      updatePopId(oldId, popId, config as MPage);
    }
  });
}
export type PropsService = Props;

export default new Props();
