import type { PropType } from 'vue';
import { CodeEditor } from '@low-code/designer';
import { parseReasoning, useDynamicTextareaSize, useMessageOption, useOllamaStatus } from '@low-code/llm';
import { EnterOutlined, StopOutlined } from '@vicons/antd';
import { NButton, NCollapseTransition, NDrawer, NDrawerContent, NIcon, NScrollbar, NSwitch } from 'naive-ui';
import { computed, defineComponent, onMounted, ref, watch, watchEffect } from 'vue';

// 提取思考区域组件
const ThinkingArea = defineComponent({
  name: 'ThinkingArea',
  components: {
    NSwitch,
    NCollapseTransition,
  },
  props: {
    content: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const show = ref(false);
    return () => (
      <div>
        <NSwitch v-model:value={show.value} v-slots={{ checked: () => <span>折叠</span>, unchecked: () => <span>思考中...</span> }} />
        <NCollapseTransition show={show.value}>
          {props.content}
        </NCollapseTransition>
      </div>
    );
  },
});

// 提取状态指示器组件
const StatusIndicator = defineComponent({
  name: 'StatusIndicator',
  props: {
    status: {
      type: String as PropType<'pending' | 'success' | 'error'>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      if (props.status === 'pending') {
        return (
          <div class="flex justify-between items-center px-4 text-nowrap">
            <div class="text-sm flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <p class="dark:text-gray-400 text-gray-900">
                正在搜索您的Ollama 🦙
              </p>
            </div>
          </div>
        );
      }
      else if (props.status === 'success') {
        return (
          <div class="flex justify-between items-center px-4 text-nowrap">
            <div class="text-sm flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p class="dark:text-gray-400 text-gray-900">
                Ollama正在运行 🦙
              </p>
            </div>
          </div>
        );
      }
      else {
        return (
          <div class="flex justify-between items-center px-4 text-nowrap">
            <div class="text-sm flex items-center gap-2">
              <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <p class="dark:text-gray-400 text-gray-900">
                无法连接到Ollama 🦙
              </p>
            </div>
          </div>
        );
      }
    };
  },
});

export default defineComponent({
  name: 'AiChat',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    code: {
      type: String,
      default: '',
    },
  },
  emits: ['update:show', 'update:code', 'preview', 'save'],
  setup(props, { emit }) {
    const codeStr = ref('');
    const divRef = ref<HTMLDivElement>();
    const textareaRef = ref<HTMLTextAreaElement>();
    const form = ref<HTMLFormElement>();
    const message = ref('');

    // 动态调整文本框大小
    useDynamicTextareaSize(textareaRef, message, 150);

    // 文本框聚焦
    const textAreaFocus = () => {
      textareaRef.value?.focus();
    };

    onMounted(() => {
      emit('update:code', codeStr.value);
      textAreaFocus();
    });

    // 重置表单状态
    const resetFormState = () => {
      message.value = '';
    };

    // Ollama 状态检查
    const { check: checkOllamaStatus, status: ollamaStatus } = useOllamaStatus();

    // 构建提示语
    const prompt = computed(() => {
      return `
      ${props.code}

      以上是一个医护终端H5页面的模板定制系统输出的JSON数据。模板结构为：
      - app (根节点)
        - page (页面节点)
          - container/text/button 等组件节点
      请按照我提出的要求修改 JSON 代码，以便生成正确的页面。
      注意事项：
      1. 直接输出代码，不要包含任何额外的解释性文字。
      2. 请确保代码的正确性，否则可能导致页面无法正常显示。
      `;
    });

    // 消息处理
    const { onSubmit, messages, streaming, stopStreamingRequest } = useMessageOption({
      prompt,
    });

    // 处理消息更新
    watch(messages, () => {
      // 滚动到最新消息
      if (divRef.value) {
        divRef.value.scrollIntoView({ behavior: 'smooth' });
      }

      // 解析最新的机器人消息
      const latestMessage = messages.value[messages.value.length - 1];
      if (latestMessage && latestMessage.isBot) {
        parseReasoning(latestMessage.message).forEach((e) => {
          if (e.type !== 'reasoning') {
            codeStr.value = e.content;
            emit('update:code', e.content);
          }
        });
      }
    });

    // 状态变化处理
    watchEffect(() => {
      if (props.show) {
        checkOllamaStatus();
        textAreaFocus();
      }
    });

    // 发送消息
    const sendMessage = async ({ message }: { message: string }) => {
      try {
        await onSubmit({
          message,
        });
      }
      catch (error) {
        console.error('发送消息失败:', error);
        // 可以在这里添加错误提示
      }
    };

    // 键盘按键处理
    const handleKeyDown = async (e: KeyboardEvent) => {
      // 忽略中文输入法正在处理的按键
      if (e.key === 'Process' || e.key === '229')
        return;

      // 处理回车键发送消息
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = (e.target as HTMLTextAreaElement).value;

        // 验证消息内容
        if (!message || message.trim().length === 0) {
          return;
        }

        resetFormState();
        textAreaFocus();
        await sendMessage({
          message: message.trim(),
        });
      }
    };

    // 处理表单提交
    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      const messageText = textareaRef.value?.value;

      if (!messageText || messageText.trim().length === 0) {
        return;
      }

      resetFormState();
      textAreaFocus();

      await sendMessage({
        message: messageText.trim(),
      });
    };

    // 渲染消息
    const renderMessages = () => {
      return messages.value.map(message => (
        <div class="relative flex w-full flex-col items-center pt-4 pb-4">
          <div class="group relative flex w-full max-w-3xl flex-col items-end justify-center pb-2 md:px-4 lg:w-4/5 text-gray-800 dark:text-gray-100">
            <div class="flex w-full flex-col gap-2">
              <span class="text-xs font-bold text-gray-800 dark:text-white">
                {message.isBot ? message.name : 'You'}
              </span>
              <div></div>
              <div class="flex flex-grow flex-col">
                {message.isBot
                  ? parseReasoning(message.message).map((e, i) => {
                      if (e.type === 'reasoning') {
                        return (
                          <ThinkingArea content={e.content} key={i} />
                        );
                      }
                      return <p></p>;
                    })
                  : (
                      <p
                        class={`prose dark:prose-invert whitespace-pre-line prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark ${
                          message.messageType
                          && 'italic text-gray-500 dark:text-gray-400 text-sm'}`}
                      >
                        {message.message}
                      </p>
                    )}
              </div>
            </div>
          </div>
        </div>
      ));
    };

    return () => {
      return (
        <NDrawer
          show={props.show}
          onUpdateShow={(show) => {
            emit('update:show', show);
          }}
          width="60vw"
          placement="right"
        >
          <NDrawerContent
            closable
            title="使用AI优化"
            v-slots={{
              header: () => <StatusIndicator status={ollamaStatus.value} />,
            }}
          >
            <div class="h-full flex flex-col relative">
              {/* 代码编辑区域 */}
              <div class="code-block relative w-full">
                <CodeEditor
                  style="height: 50vh; width: 100%;"
                  type="diff"
                  init-values={props.code}
                  modified-values={codeStr.value}
                  language="javascript"
                />
                <div class="absolute bottom--10 right-10 flex gap-2 z-10">
                  <NButton type="primary" onClick={() => emit('preview')}>预览</NButton>
                  <NButton type="primary" onClick={() => emit('save')}>保存</NButton>
                </div>
              </div>

              {/* 消息区域 */}
              <NScrollbar class="h-full w-full flex-1 relative">
                {renderMessages()}
                <div ref={divRef} />
                <div class="w-full pb-[220px]"></div>
              </NScrollbar>

              {/* 输入区域 */}
              <div class="absolute bottom-0 w-full">
                <div class="flex w-full flex-col items-center p-2 pt-1 pb-4">
                  <div class="relative z-10 flex w-full flex-col items-center justify-center gap-2 text-base">
                    <div class="relative flex w-full flex-row justify-center gap-2 lg:w-4/5">
                      <div class="bg-neutral-50 relative w-full max-w-[48rem] p-1 backdrop-blur-lg duration-100 border border-gray-300 border-solid rounded-xl">
                        <div class="flex bg-transparent">
                          <form
                            ref={form}
                            onSubmit={handleSubmit}
                            class="shrink-0 flex-grow flex flex-col items-center"
                          >
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              class="sr-only"
                              accept="image/*"
                            />
                            <div class="w-full flex flex-col dark:border-gray-600 p-2">
                              <textarea
                                ref={textareaRef}
                                class="px-2 py-2 w-full resize-none bg-transparent focus-within:outline-none focus:ring-0 focus-visible:ring-0 ring-0 dark:ring-0 border-0 dark:text-gray-100"
                                rows="1"
                                tabindex="0"
                                placeholder="提出你的要求"
                                style={{ minHeight: '30px' }}
                                disabled={ollamaStatus.value !== 'success'}
                                onKeydown={handleKeyDown}
                                v-model={message.value}
                              />

                              <div class="mt-2 flex justify-between items-center">
                                <div></div>
                                <div class="flex !justify-end gap-3">
                                  <div class="ant-space-compact css-dev-only-do-not-override-xjks6i ant-space-compact-block ant-dropdown-button !justify-end !w-auto">
                                    {!streaming.value
                                      ? (
                                          <NButton
                                            attr-type="submit"
                                            size="small"
                                            type="primary"
                                            disabled={ollamaStatus.value !== 'success'}
                                            v-slots={{
                                              icon: () => (
                                                <NIcon size="small">
                                                  <EnterOutlined />
                                                </NIcon>
                                              ),
                                            }}
                                          >
                                            {
                                              ollamaStatus.value === 'success'
                                                ? '提交'
                                                : '未连接'
                                            }
                                          </NButton>
                                        )
                                      : (
                                          <NButton
                                            size="small"
                                            type="primary"
                                            onClick={stopStreamingRequest}
                                            v-slots={{
                                              icon: () => (
                                                <NIcon size="small">
                                                  <StopOutlined />
                                                </NIcon>
                                              ),
                                            }}
                                          >
                                            停止
                                          </NButton>
                                        ) }
                                  </div>
                                </div>
                              </div>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p class="w-full text-center text-12px text-coolgray select-none">注：大模型使用 deepseek-r1:14b， 仅供测试。</p>
              </div>
            </div>
          </NDrawerContent>
        </NDrawer>
      );
    };
  },
});
