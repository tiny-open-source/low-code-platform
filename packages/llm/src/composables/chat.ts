/**
 * 增强的工具调用处理组合函数
 * 支持标准的工具调用流程：模型输出 → 工具执行 → 结果返回给模型 → 最终响应
 */

import type { ComputedRef, Ref } from 'vue';
import type { ModelConfig } from '../utils/storage';
import { AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { computed, reactive, toRefs } from 'vue';
import { generateID } from '../db';
import { mergeReasoningContent } from '../libs/reasoning';
import { pageAssistModel } from '../models';
import mcpCanvasTools from '../service/mcp-canvas-tools';
import { getAllDefaultModelSettings } from '../service/model-settings';
import { generateHistory } from '../utils/generate-history';
import { humanMessageFormatter } from '../utils/human-message';
import { toolCallDebugger } from '../utils/tool-call-diagnostics';
import { ToolCallAggregator } from '../utils/tool-handler';

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

export interface MessageOptions {
  prompt?: Ref<string> | ComputedRef<string>;
  initialMessages?: Message[];
  initialHistory?: ChatHistory;
  onMessageUpdate?: (message: Message) => void;
  onHistoryUpdate?: (history: ChatHistory) => void;
  onError?: (error: Error) => void;
  maxHistoryLength?: number;
}

export interface ChatSubmitOptions {
  message: string;
  image?: string;
  isRegenerate?: boolean;
  messages?: Ref<Message[]>;
  memory?: ChatHistory;
  controller?: AbortController;
  retainContext?: boolean;
}

/**
 * 增强的聊天处理钩子，支持完整的工具调用流程
 */
export function useEnhancedMessageOption(model: ComputedRef<ModelConfig>, options: MessageOptions = {}) {
  // 提取选项参数
  const {
    initialMessages = [],
    initialHistory = [],
    onMessageUpdate,
    onHistoryUpdate,
    onError,
    maxHistoryLength = 100,
  } = options;

  // 状态管理
  const chatState = reactive({
    streaming: false,
    isProcessing: false,
    messages: initialMessages as Message[],
    history: initialHistory as ChatHistory,
    lastError: null as Error | null,
    toolCallInProgress: false, // 新增：工具调用进行中状态
  });

  const { streaming, isProcessing, messages, history, lastError, toolCallInProgress } = toRefs(chatState);

  const hasMessages = computed(() => messages.value.length > 0);
  const responseCompleted = computed(() => !streaming.value && !isProcessing.value && !toolCallInProgress.value);

  let abortController: AbortController | undefined;

  /**
   * 更新消息列表
   */
  const setMessages = (newMessages: Message[]) => {
    chatState.messages = newMessages;
    onMessageUpdate?.(newMessages[newMessages.length - 1]);
  };

  /**
   * 更新历史记录
   */
  const setHistory = (value: ChatHistory) => {
    if (maxHistoryLength && value.length > maxHistoryLength) {
      chatState.history = value.slice(-maxHistoryLength);
    }
    else {
      chatState.history = value;
    }
    onHistoryUpdate?.(chatState.history);
  };

  /**
   * 重置流式状态
   */
  const resetStreamingState = () => {
    chatState.streaming = false;
    chatState.isProcessing = false;
    chatState.toolCallInProgress = false;
  };

  /**
   * 停止流式请求
   */
  const stopStreamingRequest = () => {
    if (abortController) {
      abortController.abort();
      abortController = undefined;
      resetStreamingState();
    }
  };

  /**
   * 执行多轮工具调用流程，支持工具链
   */
  const executeToolCallFlow = async (
    ollama: any,
    messages: any[],
    signal: AbortSignal,
    generateMessageId: string,
    messagesRef: Ref<Message[]>,
  ) => {
    let fullText = '';
    let generationInfo: any | undefined;
    let conversationMessages = [...messages];
    let toolCallRound = 0;
    const maxToolCallRounds = 10; // 防止无限循环

    console.log('🚀 开始多轮工具调用流程');
    const toolCallAggregator = new ToolCallAggregator(mcpCanvasTools.getTools());

    // 工具调用循环，支持多步工具链
    while (toolCallRound < maxToolCallRounds) {
      toolCallRound++;
      console.log(`🎯 第 ${toolCallRound} 轮：请求模型决策`);

      let roundText = '';

      // 向模型请求决策或最终回复
      const response = await ollama.stream(
        conversationMessages,
        {
          signal,
          tools: mcpCanvasTools.getToolDefinitions(),
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

      // 处理响应
      for await (const chunk of response) {
        console.log(`📦 第 ${toolCallRound} 轮 chunk:`, chunk);

        // 处理推理内容
        if (chunk?.additional_kwargs?.reasoning_content) {
          const reasoningContent = mergeReasoningContent(
            roundText,
            chunk?.additional_kwargs?.reasoning_content as string || '',
          );
          roundText = reasoningContent;
        }

        // 聚合工具调用信息
        if (chunk?.additional_kwargs?.tool_calls) {
          const chunkToolCalls = chunk.additional_kwargs.tool_calls;
          console.log(`🔧 第 ${toolCallRound} 轮接收到工具调用块:`, chunkToolCalls);
          toolCallAggregator.processToolCallChunks(chunkToolCalls);
        }

        // 处理常规内容
        roundText += chunk?.content || '';

        // 实时更新界面
        const displayText = toolCallRound === 1 ? `${fullText}${roundText}` : `${fullText}\n\n${roundText}`;
        setMessages(messagesRef.value.map((msg) => {
          if (msg.id === generateMessageId) {
            return {
              ...msg,
              message: `${displayText}▋`,
            };
          }
          return msg;
        }));
      }

      // 累积文本内容
      if (toolCallRound === 1) {
        fullText += roundText;
      }
      else {
        fullText += `\n\n${roundText}`;
      }

      // 检查是否有工具调用需要执行
      const readyToolCalls = toolCallAggregator.getReadyToolCalls();

      if (readyToolCalls.length > 0) {
        console.log(`🛠️ 第 ${toolCallRound} 轮：执行 ${readyToolCalls.length} 个工具调用`);
        chatState.toolCallInProgress = true;

        // 更新界面，显示工具调用状态
        setMessages(messagesRef.value.map((msg) => {
          if (msg.id === generateMessageId) {
            return {
              ...msg,
              message: `${fullText}\n\n🔧 正在执行第 ${toolCallRound} 轮工具调用...`,
            };
          }
          return msg;
        }));

        // 执行工具调用
        const toolResults = await toolCallAggregator.executeReadyToolCalls();
        console.log(`✅ 第 ${toolCallRound} 轮工具调用完成:`, toolResults);

        if (toolResults.length > 0) {
          // 验证工具调用数据的完整性
          for (const tc of readyToolCalls) {
            // 使用诊断工具进行详细检查
            toolCallDebugger.logToolCall(tc, '🔍');

            if (!tc.id || tc.id === '') {
              console.error('❌ 工具调用缺少有效的 ID:', tc);
              throw new Error(`工具调用 ${tc.function.name} 缺少有效的 ID`);
            }
            if (!tc.function.name || tc.function.name === '') {
              console.error('❌ 工具调用缺少函数名:', tc);
              throw new Error(`工具调用缺少函数名`);
            }
            try {
              JSON.parse(tc.function.arguments);
            }
            catch {
              console.error('❌ 工具调用参数不是有效的 JSON:', tc);
              throw new Error(`工具调用 ${tc.function.name} 的参数不是有效的 JSON`);
            }
          }

          // 构建工具调用和结果消息
          const toolCallMessages = [];

          // 添加助手的工具调用消息
          const aiMessage = new AIMessage({
            content: roundText,
            additional_kwargs: {
              tool_calls: readyToolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              })),
            },
          });

          console.log('🔍 构建的 AIMessage:', aiMessage);

          // 使用诊断工具检查消息
          toolCallDebugger.logMessage(aiMessage, '🤖');

          toolCallMessages.push(aiMessage);

          // 添加工具执行结果
          console.log('🚀 ~ useEnhancedMessageOption ~ toolResults:', toolResults);
          for (const { toolCall, result } of toolResults) {
            const toolMessage = new ToolMessage(result, toolCall.id, toolCall.function.name);

            console.log('🔍 构建的 ToolMessage:', toolMessage);

            // 使用诊断工具检查消息
            toolCallDebugger.logMessage(toolMessage, '🛠️');

            toolCallMessages.push(toolMessage);
          }

          // 更新对话上下文，为下一轮做准备
          conversationMessages = [
            ...conversationMessages,
            ...toolCallMessages,
          ];

          console.log(`📝 第 ${toolCallRound} 轮工具调用完成，准备下一轮，当前消息数: ${conversationMessages.length}`);
        }
      }
      else {
        // 没有工具调用，说明模型已经生成了最终回复
        console.log(`🎉 第 ${toolCallRound} 轮：模型生成最终回复，工具调用流程结束`);
        break;
      }
    }

    if (toolCallRound >= maxToolCallRounds) {
      console.warn('⚠️ 工具调用轮数达到上限，强制结束');
      fullText += '\n\n⚠️ 工具调用轮数达到上限，可能存在循环调用问题。';
    }

    chatState.toolCallInProgress = false;

    return { finalText: fullText, generationInfo };
  };

  /**
   * 标准工具调用流程处理
   */
  const processWithToolCalls = async (
    message: string,
    image: string = '',
    isRegenerate: boolean = false,
    messagesRef: Ref<Message[]>,
    historyRef: Ref<ChatHistory>,
    signal: AbortSignal,
    retainContext: boolean = true,
  ) => {
    console.log('🚀 开始标准工具调用流程:', message);

    const userDefaultModelSettings = await getAllDefaultModelSettings();

    if (image && image.length > 0 && !image.startsWith('data:')) {
      image = `data:image/jpeg;base64,${image.split(',')[1]}`;
    }

    // 模型参数配置
    const modelParams = {
      model: model.value,
      keepAlive: undefined,
      temperature: 0.0,
      topK: userDefaultModelSettings?.topK,
      topP: userDefaultModelSettings?.topP,
      numCtx: 4096,
      seed: undefined,
      numGpu: userDefaultModelSettings?.numGpu,
      numPredict: 4096,
      useMMap: userDefaultModelSettings?.useMMap,
      minP: userDefaultModelSettings?.minP,
      repeatLastN: userDefaultModelSettings?.repeatLastN,
      repeatPenalty: userDefaultModelSettings?.repeatPenalty,
      tfsZ: userDefaultModelSettings?.tfsZ,
      numKeep: userDefaultModelSettings?.numKeep,
      numThread: userDefaultModelSettings?.numThread,
      useMlock: userDefaultModelSettings?.useMlock,
    };

    try {
      const ollama = await pageAssistModel(modelParams);
      const generateMessageId = generateID();

      // 准备消息数据
      let newMessage: Message[] = [];
      if (!isRegenerate) {
        newMessage = [
          ...messagesRef.value,
          {
            isBot: false,
            name: 'You',
            message,
            images: image ? [image] : [],
            sources: [],
          },
          {
            isBot: true,
            name: model.value.model!,
            message: '▋',
            sources: [],
            id: generateMessageId,
          },
        ];
      }
      else {
        newMessage = [
          ...messagesRef.value,
          {
            isBot: true,
            name: model.value.model!,
            message: '▋',
            sources: [],
            id: generateMessageId,
          },
        ];
      }
      setMessages(newMessage);

      // 格式化消息和历史
      let humanMessage = await humanMessageFormatter({
        content: [
          {
            text: message,
            type: 'text',
          },
        ],
        model: model.value.name!,
      });

      if (image && image.length > 0) {
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
          model: model.value!.name!,
        });
      }

      const applicationChatHistory = generateHistory(historyRef.value, model.value.name!);

      if (model.value.prompt) {
        applicationChatHistory.unshift(
          new SystemMessage({
            content: model.value.prompt,
          }),
        );
      }

      // 执行完整的工具调用流程
      const finalResult = await executeToolCallFlow(
        ollama,
        [...applicationChatHistory, humanMessage],
        signal,
        generateMessageId,
        messagesRef,
      );

      // 更新历史记录
      if (retainContext) {
        setHistory([
          ...historyRef.value,
          {
            role: 'user',
            content: message,
            image,
          },
          {
            role: 'assistant',
            content: finalResult.finalText,
          },
        ]);
      }

      // 重置状态
      chatState.isProcessing = false;
      chatState.streaming = false;
      chatState.toolCallInProgress = false;
      chatState.lastError = null;

      return {
        success: true,
        message: finalResult.finalText,
        generationInfo: finalResult.generationInfo,
      };
    }
    catch (e) {
      console.error('工具调用流程错误:', e);
      chatState.lastError = e instanceof Error ? e : new Error(String(e));

      if (onError && chatState.lastError) {
        onError(chatState.lastError);
      }

      return {
        success: false,
        error: chatState.lastError,
      };
    }
    finally {
      resetStreamingState();
      abortController = undefined;
    }
  };

  /**
   * 提交聊天消息
   */
  const onSubmit = async ({
    message,
    image = '',
    isRegenerate = false,
    controller,
    retainContext = true,
  }: ChatSubmitOptions) => {
    if (!message.trim() && (!image || image.trim() === '')) {
      return { success: false, error: new Error('消息内容不能为空'), message: '' };
    }

    chatState.streaming = true;
    let signal: AbortSignal;

    if (!controller) {
      abortController = new AbortController();
      signal = abortController.signal;
    }
    else {
      abortController = controller;
      signal = controller.signal;
    }

    const res = await processWithToolCalls(
      message,
      image,
      isRegenerate,
      messages,
      history,
      signal,
      retainContext,
    );
    return res;
  };

  /**
   * 重置状态
   */
  const resetState = (keepHistory: boolean = false) => {
    if (chatState.streaming) {
      stopStreamingRequest();
    }

    chatState.messages = [];
    if (!keepHistory) {
      chatState.history = [];
    }
    resetStreamingState();
    chatState.lastError = null;
  };

  /**
   * 添加系统消息
   */
  const addSystemMessage = (content: string) => {
    setHistory([
      ...history.value,
      {
        role: 'system',
        content,
      },
    ]);
  };

  return {
    onSubmit,
    stopStreamingRequest,
    resetState,
    addSystemMessage,
    // 状态
    streaming,
    isProcessing,
    toolCallInProgress, // 新增
    responseCompleted,
    messages,
    history,
    lastError,
    hasMessages,
  };
}
