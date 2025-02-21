/* eslint-disable prefer-const */
/* eslint-disable unused-imports/no-unused-vars */
import { SystemMessage } from '@langchain/core/messages';
import { ref } from 'vue';
import { generateID } from './db';
import { cleanUrl } from './libs/clean-url';
import { mergeReasoningContent } from './libs/reasoning';
import { pageAssistModel } from './models';
import { getAllDefaultModelSettings } from './service/model-settings';
import { getOllamaURL } from './service/ollama';
import { generateHistory } from './utils/generate-history';
import { humanMessageFormatter } from './utils/human-message';

export interface Message {
  isBot: boolean;
  name: string;
  message: string;
  sources: any[];
  reasoning_time_taken?: number;
  id?: string;
  messageType?: string;
}

export type ChatHistory = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  messageType?: string;
}[];
export { isOllamaRunning } from './service/ollama';
export function useMessageOption() {
  const streaming = ref(false);
  const setStreaming = (value: boolean) => {
    streaming.value = value;
  };
  const messages = ref<Message[]>([]);
  const setMessages = (message: Message[]) => {
    messages.value = message;
  };
  let abortController: AbortController | undefined;
  const history: ChatHistory = [];
  const normalChatMode = async (message: string, isRegenerate: boolean, messages: Message[], history: ChatHistory, signal: AbortSignal,
  ) => {
    const url = await getOllamaURL();
    const userDefaultModelSettings = await getAllDefaultModelSettings();
    const ollama = await pageAssistModel({
      model: 'deepseek-r1:14b',
      baseUrl: cleanUrl(url),
      keepAlive: '',
      temperature:
         userDefaultModelSettings?.temperature,
      topK: userDefaultModelSettings?.topK,
      topP: userDefaultModelSettings?.topP,
      numCtx:
        userDefaultModelSettings?.numCtx,
      seed: undefined,
      numGpu:
         userDefaultModelSettings?.numGpu,
      numPredict:
        userDefaultModelSettings?.numPredict,
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
        ...messages,
        {
          isBot: false,
          name: 'You',
          message,
          sources: [],
        },
        {
          isBot: true,
          name: 'deepseek-r1:14b',
          message: '▋',
          sources: [],
          id: generateMessageId,
        },
      ];
    }
    else {
      newMessage = [
        ...messages,
        {
          isBot: true,
          name: 'deepseek-r1:14b',
          message: '▋',
          sources: [],
          id: generateMessageId,
        },
      ];
    }
    setMessages(newMessage);

    let fullText = '';
    let contentToSave = '';
    let timetaken = 0;

    try {
      const prompt = '';
      const selectedPrompt = '';

      const humanMessage = await humanMessageFormatter({
        content: [
          {
            text: message,
            type: 'text',
          },
        ],
        model: 'deepseek-r1:14b',
      });

      const applicationChatHistory = generateHistory(history, 'deepseek-r1:14b');

      if (prompt && !selectedPrompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: prompt,
          }),
        );
      }

      applicationChatHistory.unshift(
        new SystemMessage({
          content: '你好',
        }),
      );

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
          contentToSave = reasoningContent;
          fullText = reasoningContent;
          apiReasoning = true;
        }
        else {
          if (apiReasoning) {
            fullText += '</think>';
            contentToSave += '</think>';
            apiReasoning = false;
          }
        }

        contentToSave += chunk?.content;
        fullText += chunk?.content;
        console.log(fullText);

        // if (isReasoningStarted(fullText) && !reasoningStartTime) {
        //   reasoningStartTime = new Date();
        // }

        // if (
        //   reasoningStartTime
        //   && !reasoningEndTime
        //   && isReasoningEnded(fullText)
        // ) {
        //   reasoningEndTime = new Date();
        //   const reasoningTime
        //     = reasoningEndTime.getTime() - reasoningStartTime.getTime();
        //   timetaken = reasoningTime;
        // }

        // if (count === 0) {
        //   setIsProcessing(true);
        // }
        // const msg1 = messages.map((message) => {
        //   if (message.id === generateMessageId) {
        //     return {
        //       ...message,
        //       message: `${fullText}▋`,
        //       reasoning_time_taken: timetaken,
        //     };
        //   }
        //   return message;
        // });
        // setMessages(msg1);
        // count++;
      }

      // setMessages((prev) => {
      //   return prev.map((message) => {
      //     if (message.id === generateMessageId) {
      //       return {
      //         ...message,
      //         message: fullText,
      //         generationInfo,
      //         reasoning_time_taken: timetaken,
      //       };
      //     }
      //     return message;
      //   });
      // });

      // setHistory([
      //   ...history,
      //   {
      //     role: 'user',
      //     content: message,
      //     image,
      //   },
      //   {
      //     role: 'assistant',
      //     content: fullText,
      //   },
      // ]);

      // await saveMessageOnSuccess({
      //   historyId,
      //   setHistoryId,
      //   isRegenerate,
      //   selectedModel,
      //   message,
      //   image,
      //   fullText,
      //   source: [],
      //   generationInfo,
      //   prompt_content: promptContent,
      //   prompt_id: promptId,
      //   reasoning_time_taken: timetaken,
      // });

      // setIsProcessing(false);
      // setStreaming(false);
      // setIsProcessing(false);
      // setStreaming(false);
    }
    catch (e) {
      // const errorSave = await saveMessageOnError({
      //   e,
      //   botMessage: fullText,
      //   history,
      //   historyId,
      //   image,
      //   selectedModel,
      //   setHistory,
      //   setHistoryId,
      //   userMessage: message,
      //   isRegenerating: isRegenerate,
      //   prompt_content: promptContent,
      //   prompt_id: promptId,
      // });

      // if (!errorSave) {
      //   notification.error({
      //     message: t('error'),
      //     description: e?.message || t('somethingWentWrong'),
      //   });
      // }
      // setIsProcessing(false);
      // setStreaming(false);
    }
    finally {
      // setAbortController(null);
    }
  };
  const onSubmit = async ({
    message,
    isRegenerate = false,
    messages: chatHistory,
    memory,
    controller,
  }: {
    message: string;
    isRegenerate?: boolean;
    messages?: Message[];
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
      chatHistory || messages.value,
      memory || history,
      signal,
    );
  };

  return {
    onSubmit,
  };
}
