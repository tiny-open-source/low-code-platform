import { isCustomModel } from '../db/models';
import { getCustomHeaders } from '../utils/clean-headers';
import { ChatOllama } from './ChatOllama';
import { CustomChatOpenAI } from './CustomChatOpenAI';

export async function pageAssistModel({
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
}: {
  model: string;
  apiKey?: string;
  customBaseUrl?: string;
  baseUrl: string;
  keepAlive?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  numCtx?: number;
  seed?: number;
  numGpu?: number;
  numPredict?: number;
  useMMap?: boolean;
  minP?: number;
  repeatPenalty?: number;
  repeatLastN?: number;
  tfsZ?: number;
  numKeep?: number;
  numThread?: number;
  useMlock?: boolean;
}) {
  const isCustom = isCustomModel(model);
  if (isCustom) {
    const selectModelValue = useLocalStorage<any>('selectModel', {});

    return new CustomChatOpenAI({
      modelName: selectModelValue.value.model,
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
