import type { ModelSettings } from '../utils/storage';
import { isCustomModel } from '../db/models';
import { getCustomHeaders } from '../utils/clean-headers';
import { useMultiModelConfig } from '../utils/storage';
import { ChatOllama } from './ChatOllama';
import { CustomChatOpenAI } from './CustomChatOpenAI';

export interface ModelParams extends ModelSettings {
  model: string;
  apiKey?: string;
  customBaseUrl?: string;
  baseUrl: string;
}

/**
 * 创建页面助手模型实例
 * @param params 模型配置参数
 * @returns 聊天模型实例
 */
export async function pageAssistModel(params: ModelParams) {
  const {
    model,
    apiKey,
    customBaseUrl,
    baseUrl,
    keepAlive,
    temperature,
    topK,
    topP,
    numCtx,
    seed,
    numGpu,
    numPredict,
    useMMap,
    minP,
    repeatLastN,
    repeatPenalty,
    tfsZ,
    numKeep,
    numThread,
    useMlock,
  } = params;

  const isCustom = isCustomModel(model);
  if (isCustom) {
    const selectModelValue = useMultiModelConfig();

    return new CustomChatOpenAI({
      modelName: selectModelValue.value.mainModel!.model,
      openAIApiKey: apiKey,
      temperature,
      topP,
      maxTokens: numPredict,
      configuration: {
        apiKey,
        baseURL: customBaseUrl,
        defaultHeaders: getCustomHeaders({
          headers: [],
        }),
      },
    }) as any;
  }

  return new ChatOllama({
    baseUrl,
    keepAlive,
    temperature,
    topK,
    topP,
    numCtx,
    seed,
    model,
    numGpu,
    numPredict,
    useMMap,
    minP,
    repeatPenalty,
    repeatLastN,
    tfsZ,
    numKeep,
    numThread,
    useMlock,
  });
}
