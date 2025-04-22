import type { ComputedRef, Ref } from 'vue';
import { SystemMessage } from '@langchain/core/messages';
import { useLocalStorage } from '@vueuse/core';
import { ref } from 'vue';
import { generateID } from '../db';
import { cleanUrl } from '../libs/clean-url';
import { isReasoningEnded, isReasoningStarted, mergeReasoningContent } from '../libs/reasoning';
import { pageAssistModel } from '../models';
import { getAllDefaultModelSettings } from '../service/model-settings';
import { getOllamaURL } from '../service/ollama';
import { generateHistory } from '../utils/generate-history';
import { humanMessageFormatter } from '../utils/human-message';

export interface Message {
  isBot: boolean;
  name: string;
  message: string;
  sources: any[];
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
export function useMessageOption({ prompt }: { prompt?: Ref<string> | ComputedRef<string> }) {
  const streaming = ref(false);
  const setStreaming = (value: boolean) => {
    streaming.value = value;
  };
  const isProcessing = ref(false);
  const setIsProcessing = (value: boolean) => {
    isProcessing.value = value;
  };
  const messages = ref<Message[]>([]);
  const setMessages = (message: Message[]) => {
    messages.value = message;
  };
  let abortController: AbortController | undefined;
  const history = ref<ChatHistory>([]);
  const setHistory = (value: ChatHistory) => {
    history.value = value;
  };
  const settingValue = useLocalStorage<any>('formValue', {});
  const selectModelValue = useLocalStorage<any>('selectModel', {});
  const stopStreamingRequest = () => {
    if (abortController) {
      abortController.abort();
      abortController = undefined;
    }
  };
  const normalChatMode = async (message: string, isRegenerate: boolean, messages: Ref<Message[]>, history: Ref<ChatHistory>, signal: AbortSignal,
  ) => {
    const url = await getOllamaURL();
    const userDefaultModelSettings = await getAllDefaultModelSettings();

    const ollama = await pageAssistModel({
      // 模型名字先写死，后续做成可配置
      model: selectModelValue.value.value,
      apiKey: settingValue.value.apiKey,
      customBaseUrl: settingValue.value.customServiceProviderBaseUrl,
      baseUrl: cleanUrl(url),
      keepAlive: undefined,
      temperature: 0.0,
      topK: userDefaultModelSettings?.topK,
      topP: userDefaultModelSettings?.topP,
      numCtx: 8192, // 影响的是模型可以一次记住的最大 token 数量。
      seed: undefined,
      numGpu:
         userDefaultModelSettings?.numGpu,
      numPredict: 4096, // 影响模型最大可以生成的 token 数量。
      useMMap:
        userDefaultModelSettings?.useMMap,
      minP: userDefaultModelSettings?.minP,
      repeatLastN:
       userDefaultModelSettings?.repeatLastN,
      repeatPenalty:
       userDefaultModelSettings?.repeatPenalty,
      tfsZ: userDefaultModelSettings?.tfsZ,
      numKeep: userDefaultModelSettings?.numKeep,
      numThread:
        userDefaultModelSettings?.numThread,
      useMlock:
       userDefaultModelSettings?.useMlock,
    });

    let newMessage: Message[] = [];
    const generateMessageId = generateID();

    if (!isRegenerate) {
      newMessage = [
        ...messages.value,
        {
          isBot: false,
          name: 'You',
          message,
          sources: [],
        },
        {
          isBot: true,
          name: settingValue.value.model,
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
          name: settingValue.value.model,
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
      const humanMessage = await humanMessageFormatter({
        content: [
          {
            text: message,
            type: 'text',
          },
        ],
        model: settingValue.value.model,
      });

      const applicationChatHistory = generateHistory(history.value, settingValue.value.model);

      if (prompt?.value) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: prompt?.value,
          }),
        );
      }

      let generationInfo: any | undefined;

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

        if (count === 0) {
          setIsProcessing(true);
        }
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

      setHistory([
        ...history.value,
        {
          role: 'user',
          content: message,
        },
        {
          role: 'assistant',
          content: fullText,
        },
      ]);

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
  const onSubmit = async ({
    message,
    isRegenerate = false,
    controller,
  }: {
    message: string;
    isRegenerate?: boolean;
    messages?: Ref<Message[]>;
    memory?: ChatHistory;
    controller?: AbortController;
  }) => {
    setStreaming(true);
    let signal: AbortSignal;
    if (!controller) {
      abortController = new AbortController();
      signal = abortController.signal;
    }
    else {
      abortController = controller;
      signal = controller.signal;
    }

    await normalChatMode(
      message,
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
