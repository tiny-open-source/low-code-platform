import { isCustomModel } from '../db/models';
import { getCustomHeaders } from '../utils/clean-headers';
import { ChatOllama } from './ChatOllama';
import { CustomChatOpenAI } from './CustomChatOpenAI';

export async function pageAssistModel({
  model,
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
    return new CustomChatOpenAI({
      modelName: model,
      openAIApiKey: 'sk-wqzwhlgzlqtpxkuyauddasdrikgckebavajsdfscqrxnzwld',
      temperature,
      topP,
      maxTokens: numPredict,
      configuration: {
        apiKey: 'sk-wqzwhlgzlqtpxkuyauddasdrikgckebavajsdfscqrxnzwld',
        baseURL: 'https://api.siliconflow.cn/v1',
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
