import type { ChildConfig, ContainerCommonConfig, DaterangeConfig, FormConfig, FormState, FormValue, HtmlField, TabPaneConfig, TypeFunction } from '../schema';
import { cloneDeep } from 'lodash-es';
import { toRaw } from 'vue';

interface DefaultItem {
  defaultValue: any;
  type: string;
  filter: string;
  multiple: boolean;
}
export function filterFunction(mForm: FormState | undefined, config: any, props: any) {
  if (typeof config !== 'function') {
    return config;
  }

  return config(mForm, {
    values: mForm?.initValues || {},
    model: props.model,
    parent: mForm?.parentValues || {},
    formValue: mForm?.values || props.model,
    prop: props.prop,
    config: props.config,
  });
}
export const display = function (mForm: FormState | undefined, config: any, props: any) {
  if (typeof config === 'function') {
    return filterFunction(mForm, config, props);
  }

  if (config === false) {
    return false;
  }

  return true;
};
function isTableSelect(type?: string | TypeFunction) {
  return typeof type === 'string' && ['table-select', 'tableSelect'].includes(type);
}
const init = function (
  lForm: FormState | undefined,
  config: FormConfig | TabPaneConfig[] = [],
  initValue: FormValue = {},
  value: FormValue = {},
) {
  if (Array.isArray(config)) {
    config.forEach((item: ChildConfig | TabPaneConfig) => {
      initValueItem(lForm, item, initValue, value);
    });
  }

  return value;
};
function initValueItem(
  mForm: FormState | undefined,
  item: ChildConfig | TabPaneConfig,
  initValue: FormValue,
  value: FormValue,
) {
  const { items } = item as ContainerCommonConfig;
  const { names } = item as DaterangeConfig;
  const { type, name } = item as ChildConfig;

  if (isTableSelect(type) && name) {
    value[name] = initValue[name] || '';
    return value;
  }

  asyncLoadConfig(value, initValue, item as HtmlField);

  // 这种情况比较多，提前结束
  if (name && !items && typeof initValue[name] !== 'undefined') {
    if (typeof value[name] === 'undefined') {
      if (type === 'number') {
        value[name] = Number(initValue[name]);
      }
      else {
        value[name] = typeof initValue[name] === 'object' ? cloneDeep(initValue[name]) : initValue[name];
      }
    }

    return value;
  }

  if (names) {
    return names.forEach((n: string) => (value[n] = initValue[n] || ''));
  }

  if (!name) {
    // 没有配置name，直接跳过
    return init(mForm, items, initValue, value);
  }

  setValue(mForm, value, initValue, item);

  return value;
};
function isMultipleValue(type?: string | TypeFunction) {
  return typeof type === 'string'
    && [
      'checkbox-group',
      'checkboxGroup',
      'table',
      'cascader',
      'group-list',
      'groupList',
      'dynamic-tab',
      'dynamicTab',
    ].includes(type);
}
function initItemsValue(mForm: FormState | undefined, value: FormValue, initValue: FormValue, { items, name, extensible }: any) {
  if (Array.isArray(initValue[name])) {
    value[name] = initValue[name].map((v: any) => init(mForm, items, v));
  }
  else {
    value[name] = init(mForm, items, initValue[name], value[name]);
    if (extensible) {
      value[name] = Object.assign({}, initValue[name], value[name]);
    }
  }
}

const getDefaultValue = function (mForm: FormState | undefined, { defaultValue, type, filter, multiple }: DefaultItem) {
  if (typeof defaultValue === 'function') {
    return defaultValue(mForm);
  }

  // 如果直接设置为undefined，在解析成js对象时会丢失这个配置，所以用'undefined'代替
  if (defaultValue === 'undefined') {
    return undefined;
  }

  if (typeof defaultValue !== 'undefined') {
    return defaultValue;
  }

  if (type === 'number' || filter === 'number') {
    return 0;
  }

  if (['switch', 'checkbox'].includes(type)) {
    return false;
  }

  if (multiple) {
    return [];
  }

  return '';
};
function setValue(mForm: FormState | undefined, value: FormValue, initValue: FormValue, item: any) {
  const { items, name, type, checkbox } = item;
  // 值是数组， 有可能也有items配置，所以不能放到getDefaultValue里赋值
  if (isMultipleValue(type)) {
    value[name] = initValue[name] || [];
  }

  // 有子项继续递归，没有的话有初始值用初始值，没有初始值用默认值
  if (items) {
    initItemsValue(mForm, value, initValue, item);
  }
  else {
    value[name] = getDefaultValue(mForm, item as DefaultItem);
  }

  // 如果fieldset配置checkbox，checkbox的值保存在value中
  if (type === 'fieldset' && checkbox) {
    if (typeof value[name] === 'object') {
      value[name].value = typeof initValue[name] === 'object' ? initValue[name].value || 0 : 0;
    }
  }
}
function asyncLoadConfig(value: FormValue, initValue: FormValue, { asyncLoad, name, type }: HtmlField) {
  // 富文本配置了异步加载
  if (type === 'html' && typeof asyncLoad === 'object' && typeof name !== 'undefined') {
    asyncLoad.name = name;
    value.asyncLoad = typeof initValue.asyncLoad === 'object' ? initValue.asyncLoad : asyncLoad;
  }
}
export async function initValue(lForm: FormState | undefined, { initValues, config }: { initValues: FormValue; config: FormConfig }) {
  if (!Array.isArray(config))
    throw new Error('config应该为数组');

  let valuesTmp = init(lForm, config, toRaw(initValues), {});

  const [firstForm] = config as [ContainerCommonConfig];
  if (firstForm && typeof firstForm.onInitValue === 'function') {
    valuesTmp = await firstForm.onInitValue(lForm, {
      formValue: valuesTmp,
      initValue: initValues,
    });
  }

  return valuesTmp || {};
}
