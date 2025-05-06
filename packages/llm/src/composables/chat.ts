import type { ComputedRef, Ref } from 'vue';
import type { ModelParams } from '../models';
import { SystemMessage } from '@langchain/core/messages';
import { ref } from 'vue';
import { generateID } from '../db';
import { cleanUrl } from '../libs/clean-url';
import { isReasoningEnded, isReasoningStarted, mergeReasoningContent } from '../libs/reasoning';
import { pageAssistModel } from '../models';
import { getAllDefaultModelSettings } from '../service/model-settings';
import { getOllamaURL } from '../service/ollama';
import { generateHistory } from '../utils/generate-history';
import { humanMessageFormatter } from '../utils/human-message';
import { useMultiModelConfig, useMultiModelSettings } from '../utils/storage';

export interface Message {
  isBot: boolean;
  name: string;
  message: string;
  sources: any[];
  images?: string[];
  reasoning_time_taken?: number;
  id?: string;
  messageType?: string;
  generationInfo?: any;
}

export type ChatHistory = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  messageType?: string;
}[];

/**
 * 创建聊天对话处理钩子
 * @param options 选项配置
 * @returns 聊天对话处理方法和状态
 */
export function useMessageOption({ prompt }: { prompt?: Ref<string> | ComputedRef<string> }) {
  // 状态管理
  const streaming = ref(false);
  const isProcessing = ref(false);
  const messages = ref<Message[]>([]);
  const history = ref<ChatHistory>([]);

  // 配置存储
  const llmSettings = useMultiModelSettings();
  const modelConfig = useMultiModelConfig();

  // 控制器
  let abortController: AbortController | undefined;

  /**
   * 设置流式传输状态
   * @param value 状态值
   */
  const setStreaming = (value: boolean) => {
    streaming.value = value;
  };

  /**
   * 设置处理中状态
   * @param value 状态值
   */
  const setIsProcessing = (value: boolean) => {
    isProcessing.value = value;
  };

  /**
   * 更新消息列表
   * @param message 消息列表
   */
  const setMessages = (message: Message[]) => {
    messages.value = message;
  };

  /**
   * 更新历史记录
   * @param value 历史记录
   */
  const setHistory = (value: ChatHistory) => {
    history.value = value;
  };

  /**
   * 停止流式请求
   */
  const stopStreamingRequest = () => {
    if (abortController) {
      abortController.abort();
      abortController = undefined;
    }
  };

  /**
   * 常规聊天模式处理
   * @param message 消息内容
   * @param image 图片内容
   * @param isRegenerate 是否重新生成
   * @param messages 消息状态
   * @param history 历史记录状态
   * @param signal 中断信号
   */
  const normalChatMode = async (
    message: string,
    image: string,
    isRegenerate: boolean,
    messages: Ref<Message[]>,
    history: Ref<ChatHistory>,
    signal: AbortSignal,
  ) => {
    const url = await getOllamaURL();
    const userDefaultModelSettings = await getAllDefaultModelSettings();
    console.log(image);

    if (image.length > 0) {
      image = `data:image/jpeg;base64,${image.split(',')[1]}`;
    }
    // 合并模型设置
    const modelParams: ModelParams = {
      // 使用模型配置
      model: modelConfig.value.mainModel!.name,
      apiKey: llmSettings.value.mainModel!.apiKey,
      customBaseUrl: llmSettings.value.mainModel!.customServiceProviderBaseUrl,
      baseUrl: cleanUrl(url),
      // 默认配置
      keepAlive: undefined,
      temperature: 0.0,
      // 使用用户默认配置
      topK: userDefaultModelSettings?.topK,
      topP: userDefaultModelSettings?.topP,
      numCtx: 8192, // 影响的是模型可以一次记住的最大 token 数量
      seed: undefined,
      numGpu: userDefaultModelSettings?.numGpu,
      numPredict: 4096, // 影响模型最大可以生成的 token 数量
      useMMap: userDefaultModelSettings?.useMMap,
      minP: userDefaultModelSettings?.minP,
      repeatLastN: userDefaultModelSettings?.repeatLastN,
      repeatPenalty: userDefaultModelSettings?.repeatPenalty,
      tfsZ: userDefaultModelSettings?.tfsZ,
      numKeep: userDefaultModelSettings?.numKeep,
      numThread: userDefaultModelSettings?.numThread,
      useMlock: userDefaultModelSettings?.useMlock,
    };

    const ollama = await pageAssistModel(modelParams);

    let newMessage: Message[] = [];
    const generateMessageId = generateID();

    // 准备消息数据
    if (!isRegenerate) {
      newMessage = [
        ...messages.value,
        {
          isBot: false,
          name: 'You',
          message,
          images: [image],
          sources: [],
        },
        {
          isBot: true,
          name: llmSettings.value.mainModel!.model!,
          message: '▋',
          sources: [],
          id: generateMessageId,
        },
      ];
    }
    else {
      newMessage = [
        ...messages.value,
        {
          isBot: true,
          name: llmSettings.value.mainModel!.model!,
          message: '▋',
          sources: [],
          id: generateMessageId,
        },
      ];
    }
    setMessages(newMessage);

    let fullText = '';
    let timetaken = 0;

    try {
      // 格式化人类消息
      let humanMessage = await humanMessageFormatter({
        content: [
          {
            text: message,
            type: 'text',
          },
        ],
        model: llmSettings.value.mainModel!.model!,
      });
      if (image.length > 0) {
        humanMessage = await humanMessageFormatter({
          content: [
            {
              text: message,
              type: 'text',
            },
            {
              image_url: image,
              type: 'image_url',
            },
          ],
          model: llmSettings.value.mainModel!.model!,
        });
      }
      // 生成聊天历史
      const applicationChatHistory = generateHistory(history.value, modelConfig.value.mainModel!.value);

      // 添加系统提示
      if (prompt?.value) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: prompt?.value,
          }),
        );
      }

      let generationInfo: any | undefined;

      // 发起流式请求
      const chunks = await ollama.stream(
        [...applicationChatHistory, humanMessage],
        {
          signal,
          callbacks: [
            {
              handleLLMEnd(output: any): any {
                try {
                  generationInfo = output?.generations?.[0][0]?.generationInfo;
                }
                catch (e) {
                  console.error('handleLLMEnd error', e);
                }
              },
            },
          ],
        },
      );

      // 处理流式响应
      let count = 0;
      let reasoningStartTime: Date | null = null;
      let reasoningEndTime: Date | null = null;
      let apiReasoning: boolean = false;

      for await (const chunk of chunks) {
        if (chunk?.additional_kwargs?.reasoning_content) {
          const reasoningContent = mergeReasoningContent(
            fullText,
            chunk?.additional_kwargs?.reasoning_content as string || '',
          );
          fullText = reasoningContent;
          apiReasoning = true;
        }
        else {
          if (apiReasoning) {
            fullText += '</think>';
            apiReasoning = false;
          }
        }

        fullText += chunk?.content;

        // 计算推理时间
        if (isReasoningStarted(fullText) && !reasoningStartTime) {
          reasoningStartTime = new Date();
        }

        if (
          reasoningStartTime
          && !reasoningEndTime
          && isReasoningEnded(fullText)
        ) {
          reasoningEndTime = new Date();
          const reasoningTime
            = reasoningEndTime.getTime() - reasoningStartTime.getTime();
          timetaken = reasoningTime;
        }

        // 更新界面
        if (count === 0) {
          setIsProcessing(true);
        }

        // 更新消息内容
        setMessages(messages.value.map((message) => {
          if (message.id === generateMessageId) {
            return {
              ...message,
              message: `${fullText}▋`,
              reasoning_time_taken: timetaken,
            };
          }
          return message;
        }));
        count++;
      }

      // 完成后更新最终消息
      setMessages(messages.value.map((message) => {
        if (message.id === generateMessageId) {
          return {
            ...message,
            message: fullText,
            generationInfo,
            reasoning_time_taken: timetaken,
          };
        }
        return message;
      }));

      // 更新历史记录
      setHistory([
        ...history.value,
        {
          role: 'user',
          content: message,
          image,
        },
        {
          role: 'assistant',
          content: fullText,
        },
      ]);

      // 重置状态
      setIsProcessing(false);
      setStreaming(false);
    }
    catch (e) {
      console.error(e);
      setIsProcessing(false);
      setStreaming(false);
    }
    finally {
      abortController = undefined;
    }
  };

  /**
   * 提交聊天消息
   * @param options 提交选项
   */
  const onSubmit = async ({
    message,
    image,
    isRegenerate = false,
    controller,
  }: {
    message: string;
    image: string;
    isRegenerate?: boolean;
    messages?: Ref<Message[]>;
    memory?: ChatHistory;
    controller?: AbortController;
  }) => {
    setStreaming(true);
    let signal: AbortSignal;

    // 创建或使用控制器
    if (!controller) {
      abortController = new AbortController();
      signal = abortController.signal;
    }
    else {
      abortController = controller;
      signal = controller.signal;
    }

    // 处理消息
    await normalChatMode(
      message,
      image,
      isRegenerate,
      messages,
      history,
      signal,
    );
  };

  return {
    onSubmit,
    stopStreamingRequest,
    streaming,
    isProcessing,
    messages,
    history,
    resetState: () => {
      if (streaming.value)
        stopStreamingRequest();
      setMessages([]);
      setHistory([]);
      setStreaming(false);
      setIsProcessing(false);
    },
  };
}
