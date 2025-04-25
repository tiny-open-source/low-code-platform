import { useLocalStorage as _useLocalStorage } from '@vueuse/core';
import { getOllamaURL } from '../service/ollama';

export interface ModelConfig {
  model: string;
  value: string;
  provider?: string;
  label?: string;
}

export interface LLMSettings {
  ollamaUrl?: string;
  model?: string;
  modelId?: string;
  customServiceProvider?: string;
  customServiceProviderName?: string;
  customServiceProviderBaseUrl?: string;
  apiKey?: string;
  prompt?: string;
}

export interface ModelSettings {
  f16KV?: boolean;
  frequencyPenalty?: number;
  keepAlive?: string;
  logitsAll?: boolean;
  mirostat?: number;
  mirostatEta?: number;
  mirostatTau?: number;
  numBatch?: number;
  numCtx?: number;
  numGpu?: number;
  numGqa?: number;
  numKeep?: number;
  numPredict?: number;
  numThread?: number;
  penalizeNewline?: boolean;
  seed?: number;
  presencePenalty?: number;
  repeatLastN?: number;
  repeatPenalty?: number;
  ropeFrequencyBase?: number;
  ropeFrequencyScale?: number;
  temperature?: number;
  tfsZ?: number;
  topK?: number;
  topP?: number;
  typicalP?: number;
  useMLock?: boolean;
  useMMap?: boolean;
  vocabOnly?: boolean;
  minP?: number;
  useMlock?: boolean;
}

// 存储键名常量
export const STORAGE_KEYS = {
  FORM_SETTINGS: 'settingValue',
  SELECT_MODEL: 'selectModel',
  MODEL_SETTINGS: 'modelSettings',
};

/**
 * 创建一个封装了localStorage的类型安全的状态存储
 * @param key 存储的键名
 * @param initialValue 初始值
 * @returns 响应式存储对象
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  return _useLocalStorage<T>(key, initialValue);
}

/**
 * 获取模型配置存储对象
 * @returns 模型配置存储
 */
export function useModelConfig() {
  return useLocalStorage<ModelConfig>(STORAGE_KEYS.SELECT_MODEL, {} as ModelConfig);
}

/**
 * 获取LLM设置存储对象
 * @returns LLM设置存储
 */
export function useLLMSettings() {
  return useLocalStorage<LLMSettings>(STORAGE_KEYS.FORM_SETTINGS, {
    ollamaUrl: getOllamaURL(),
    model: '',
    modelId: '',
    customServiceProvider: 'custom',
    customServiceProviderName: '',
    customServiceProviderBaseUrl: '',
    apiKey: '',
    prompt: '',
  });
}

/**
 * 获取模型设置存储对象
 * @returns 模型设置存储
 */
export function useModelSettings() {
  return useLocalStorage<ModelSettings>(STORAGE_KEYS.MODEL_SETTINGS, {});
}

/**
 * 合并模型配置
 * @param baseSettings 基础配置
 * @param overrideSettings 覆盖配置
 * @returns 合并后的配置
 */
export function mergeModelSettings(baseSettings: ModelSettings = {}, overrideSettings: ModelSettings = {}): ModelSettings {
  return { ...baseSettings, ...overrideSettings };
}
