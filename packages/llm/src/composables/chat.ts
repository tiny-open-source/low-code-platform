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
import { getToolDisplayConfig } from '../utils/tool-display-config';
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
  toolCallStatus?: 'none' | 'executing' | 'completed' | 'failed';
  currentToolCall?: {
    name: string;
    description?: string;
    round?: number;
    count?: number;
  };
  toolCallHistory?: Array<{
    name: string;
    status: 'completed' | 'failed';
    description?: string;
    round: number;
    count: number;
    timestamp?: number;
  }>;
  // 新增：工具调用轮次确认状态
  toolCallConfirmation?: {
    show: boolean;
    currentRound: number;
    maxRound: number;
    onContinue?: () => void;
    onCancel?: () => void;
  };
}

export type ChatHistory = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  image?: string;
  messageType?: string;
  toolCallId?: string;
  toolName?: string;
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
   * 检查历史记录完整性，用于调试 assistant 消息丢失问题
   */
  const validateHistoryIntegrity = (currentHistory: ChatHistory, label: string = '') => {
    const stats = {
      total: currentHistory.length,
      user: 0,
      assistant: 0,
      system: 0,
      tool: 0,
      emptyAssistant: 0,
    };

    currentHistory.forEach((msg) => {
      stats[msg.role]++;

      if (msg.role === 'assistant' && (!msg.content || msg.content.trim() === '')) {
        stats.emptyAssistant++;
      }
    });

    console.log(`🔍 历史完整性 ${label}:`, stats);
    return { stats };
  };

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

    // 验证历史完整性
    validateHistoryIntegrity(chatState.history, 'setHistory');

    onHistoryUpdate?.(chatState.history);
  };

  /**
   * 将 LangChain 消息转换为 ChatHistory 格式
   */
  const convertLangChainMessagesToChatHistory = (messages: any[]): ChatHistory => {
    const chatHistory: ChatHistory = [];

    for (const message of messages) {
      if (message._getType() === 'human') {
        chatHistory.push({
          role: 'user',
          content: typeof message.content === 'string'
            ? message.content
            : Array.isArray(message.content)
              ? message.content.map((c: any) => c.text || c.type || '').join(' ')
              : String(message.content || ''),
        });
      }
      else if (message._getType() === 'ai') {
        // 处理 AIMessage，可能包含工具调用
        const content = typeof message.content === 'string'
          ? message.content
          : Array.isArray(message.content)
            ? message.content.map((c: any) => c.text || c.type || '').join(' ')
            : String(message.content || '');

        // 确保即使是空内容的 assistant 消息也被保存（可能只包含工具调用）
        chatHistory.push({
          role: 'assistant',
          content: content || '', // 允许空内容，因为可能只是工具调用
        });
      }
      else if (message._getType() === 'tool') {
        // 处理 ToolMessage
        chatHistory.push({
          role: 'tool',
          content: message.content || '',
          toolCallId: message.tool_call_id,
          toolName: message.name,
        });
      }
      else {
        console.warn('⚠️ 未识别的消息类型:', message._getType(), message);
      }
    }

    return chatHistory;
  };

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
    const maxToolCallRounds = 20; // 工具调用轮次上限，防止无限循环

    // 等待用户确认的函数
    const waitForUserConfirmation = (): Promise<boolean> => {
      return new Promise((resolve) => {
        // 显示确认界面
        setMessages(messagesRef.value.map((msg) => {
          if (msg.id === generateMessageId) {
            return {
              ...msg,
              message: fullText,
              toolCallStatus: 'none' as const,
              currentToolCall: undefined,
              toolCallConfirmation: {
                show: true,
                currentRound: toolCallRound,
                maxRound: maxToolCallRounds,
                onContinue: () => {
                  // 用户选择继续
                  resolve(true);
                  // 清除确认界面
                  setMessages(messagesRef.value.map((m) => {
                    if (m.id === generateMessageId) {
                      return {
                        ...m,
                        toolCallConfirmation: undefined,
                      };
                    }
                    return m;
                  }));
                },
                onCancel: () => {
                  // 用户选择取消
                  resolve(false);
                  // 清除确认界面
                  setMessages(messagesRef.value.map((m) => {
                    if (m.id === generateMessageId) {
                      return {
                        ...m,
                        toolCallConfirmation: undefined,
                      };
                    }
                    return m;
                  }));
                },
              },
            };
          }
          return msg;
        }));
      });
    };

    // 工具调用循环，支持多步工具链
    let shouldContinueLoop = true;
    while (shouldContinueLoop) {
      toolCallRound++;

      // 检查是否达到轮次上限（在递增后检查）
      if (toolCallRound > maxToolCallRounds) {
        // 达到上限时，等待用户确认是否继续
        console.log(`⚠️ 工具调用轮数达到上限 ${maxToolCallRounds}，等待用户确认...`);

        const shouldContinue = await waitForUserConfirmation();

        if (shouldContinue) {
          // 用户选择继续，重置轮次计数
          console.log(`✅ 用户选择继续，重置轮次计数`);
          toolCallRound = 1; // 重置为1，因为这是新的一轮开始
          // 继续循环
        }
        else {
          // 用户选择取消，停止执行
          console.log(`❌ 用户选择取消，停止工具调用流程`);
          fullText += '\n\n⚠️ 用户选择停止执行工具调用。';
          shouldContinueLoop = false;
          break; // 直接跳出循环
        }
      }

      let roundText = '';
      generationInfo = undefined;
      const toolCallAggregator = new ToolCallAggregator(mcpCanvasTools.getTools());
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
      let hasToolCallsInThisRound = false;
      let streamFinishReason = null;
      let toolCallIndicatorShown = false; // 标记是否已显示工具调用指示器

      for await (const chunk of response) {
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
          toolCallAggregator.processToolCallChunks(chunkToolCalls);
          hasToolCallsInThisRound = true;

          // 首次检测到工具调用时立即显示 spinner
          if (!toolCallIndicatorShown) {
            toolCallIndicatorShown = true;
            chatState.toolCallInProgress = true;

            // 尝试获取工具名称（可能还在聚合中）
            const firstToolCall = chunkToolCalls[0];
            const toolName = firstToolCall?.function?.name || '';
            const toolConfig = getToolDisplayConfig(toolName);

            setMessages(messagesRef.value.map((msg) => {
              if (msg.id === generateMessageId) {
                return {
                  ...msg,
                  message: `${fullText}${roundText}`,
                  toolCallStatus: 'executing' as const,
                  currentToolCall: {
                    name: toolName,
                    description: toolName ? toolConfig.description : '正在准备工具调用...',
                    round: toolCallRound,
                    count: 1, // 初始显示为1，后续会更新
                  },
                };
              }
              return msg;
            }));
          }
        }

        // 记录流式响应的结束原因
        if (generationInfo?.finish_reason) {
          streamFinishReason = generationInfo.finish_reason;
        }

        // 处理常规内容
        roundText += chunk?.content || '';

        // 实时更新界面
        const displayText = toolCallRound === 1 ? `${fullText}${roundText}` : `${fullText}\n\n${roundText}`;

        // 只有在没有显示工具调用指示器时才更新常规内容
        if (!toolCallIndicatorShown) {
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
      }

      // 累积文本内容
      if (toolCallRound === 1) {
        fullText += roundText;
      }
      else {
        fullText += `\n\n${roundText}`;
      }

      // 在检查工具调用之前，给聚合器一点时间完成处理
      // 这对于处理可能分散在多个 chunks 中的工具调用很重要
      if (hasToolCallsInThisRound) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 检查是否有工具调用需要执行 - 重要：确保在流式处理完全结束后检查
      let readyToolCalls = toolCallAggregator.getReadyToolCalls();

      // 如果有工具调用块但没有就绪的工具调用，可能是聚合未完成
      if (hasToolCallsInThisRound && readyToolCalls.length === 0) {
        // 如果 finish_reason 是 tool_calls，表示模型确实想要调用工具
        if (streamFinishReason === 'tool_calls') {
          // 给一点时间让最后的块处理完成
          await new Promise(resolve => setTimeout(resolve, 100));

          readyToolCalls = toolCallAggregator.getReadyToolCalls();

          if (readyToolCalls.length === 0) {
            console.warn(`❌ 第 ${toolCallRound} 轮：模型表明有工具调用但无法聚合出完整的工具调用数据`);
          }
        }
      }

      if (readyToolCalls.length > 0) {
        // 确保工具调用状态已设置
        if (!chatState.toolCallInProgress) {
          chatState.toolCallInProgress = true;
        }

        // 更新界面，显示准确的工具调用状态（包含正确的工具数量）
        setMessages(messagesRef.value.map((msg) => {
          if (msg.id === generateMessageId) {
            // 获取第一个工具调用的信息用于显示
            const firstToolCall = readyToolCalls[0];
            const toolName = firstToolCall?.function?.name || '';
            const toolConfig = getToolDisplayConfig(toolName);

            return {
              ...msg,
              message: `${fullText}`,
              toolCallStatus: 'executing' as const,
              currentToolCall: {
                name: toolName,
                description: toolConfig.description,
                round: toolCallRound,
                count: readyToolCalls.length,
              },
            };
          }
          return msg;
        }));

        // 执行工具调用
        const toolResults = await toolCallAggregator.executeReadyToolCalls();

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
            if (tc.function.arguments) {
              try {
                JSON.parse(tc.function.arguments);
              }
              catch {
                console.error('❌ 工具调用参数不是有效的 JSON:', tc);
                throw new Error(`工具调用 ${tc.function.name} 的参数不是有效的 JSON`);
              }
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

          toolCallMessages.push(aiMessage);

          // 添加工具执行结果
          for (const { toolCall, result } of toolResults) {
            const toolMessage = new ToolMessage(result, toolCall.id, toolCall.function.name);

            toolCallMessages.push(toolMessage);
          }

          // 更新对话上下文，为下一轮做准备
          conversationMessages = [
            ...conversationMessages,
            ...toolCallMessages,
          ];

          // 更新界面，将工具调用添加到历史记录
          setMessages(messagesRef.value.map((msg) => {
            if (msg.id === generateMessageId) {
              const firstToolCall = readyToolCalls[0];
              const toolName = firstToolCall?.function?.name || '';
              const isSuccess = toolResults.some(result => result.result && !result.result.includes('❌'));

              // 创建当前工具调用的历史记录条目
              const currentToolCallEntry = {
                name: toolName,
                status: isSuccess ? 'completed' as const : 'failed' as const,
                description: `已执行 ${toolResults.length} 个工具调用`,
                round: toolCallRound,
                count: toolResults.length,
                timestamp: Date.now(),
              };

              // 将当前工具调用添加到历史记录
              const existingHistory = msg.toolCallHistory || [];
              const updatedHistory = [...existingHistory, currentToolCallEntry];

              return {
                ...msg,
                message: `${fullText}`,
                toolCallStatus: isSuccess ? 'completed' as const : 'failed' as const,
                currentToolCall: {
                  name: toolName,
                  description: `已执行 ${toolResults.length} 个工具调用`,
                  round: toolCallRound,
                  count: toolResults.length,
                },
                toolCallHistory: updatedHistory,
              };
            }
            return msg;
          }));

          // 给用户一点时间看到完成状态
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        else {
          // 即使工具调用执行失败，也需要保存 assistant 的回复
          if (roundText.trim()) {
            const aiMessage = new AIMessage({
              content: roundText,
            });
            conversationMessages = [
              ...conversationMessages,
              aiMessage,
            ];
          }
        }
      }
      else {
        // 没有工具调用，说明模型已经生成了最终回复

        // 重要：即使没有工具调用，也需要保存 assistant 的回复到对话历史中
        if (roundText.trim()) {
          const finalAiMessage = new AIMessage({
            content: roundText,
          });
          conversationMessages = [
            ...conversationMessages,
            finalAiMessage,
          ];
        }

        // 如果之前显示了工具调用指示器但最终没有执行工具调用，需要清除状态
        if (hasToolCallsInThisRound && chatState.toolCallInProgress) {
          setMessages(messagesRef.value.map((msg) => {
            if (msg.id === generateMessageId) {
              return {
                ...msg,
                message: fullText,
                toolCallStatus: 'none' as const,
                currentToolCall: undefined,
              };
            }
            return msg;
          }));
        }

        break;
      }
    }

    chatState.toolCallInProgress = false;

    // 最终更新，保留最后的工具调用状态作为历史记录
    setMessages(messagesRef.value.map((msg) => {
      if (msg.id === generateMessageId) {
        return {
          ...msg,
          message: fullText,
          // 保持最后的工具调用状态，不清除
        };
      }
      return msg;
    }));

    return {
      finalText: fullText,
      generationInfo,
      conversationMessages, // 返回完整的对话消息历史
    };
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
    const userDefaultModelSettings = await getAllDefaultModelSettings();

    if (image && image.length > 0 && !image.startsWith('data:')) {
      image = `data:image/jpeg;base64,${image.split(',')[1]}`;
    }

    // 模型参数配置
    const modelParams = {
      model: model.value,
      keepAlive: undefined,
      temperature: 0.3,
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
        // 重要：正确提取新的对话历史
        // applicationChatHistory 包含系统消息和历史消息，finalResult.conversationMessages 包含完整的对话
        // 我们需要提取新添加的消息（从最后一个用户消息开始）

        let startIndex = applicationChatHistory.length;

        // 如果有系统消息，需要排除它
        if (model.value.prompt) {
          startIndex = applicationChatHistory.length; // 系统消息已在 applicationChatHistory 中
        }

        // 提取所有新的对话消息（包括用户消息、assistant 回复、工具调用等）
        const newConversationHistory = finalResult.conversationMessages.slice(startIndex);

        // 转换为 ChatHistory 格式
        const newChatHistory = convertLangChainMessagesToChatHistory(newConversationHistory);

        const updatedHistory = [
          ...historyRef.value,
          ...newChatHistory,
        ];

        // 验证历史完整性
        validateHistoryIntegrity(updatedHistory, '保存后');

        setHistory(updatedHistory);
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
