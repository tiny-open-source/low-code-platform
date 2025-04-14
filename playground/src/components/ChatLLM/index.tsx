import { CodeEditor } from '@low-code/designer';
import { parseReasoning, useMessageOption, useOllamaStatus } from '@low-code/llm';
import { NDrawer, NDrawerContent, NScrollbar } from 'naive-ui';
import { computed, defineComponent, onMounted, ref, watch, watchEffect } from 'vue';
import TextAreaForm from './InputArea';
import StatusIndicator from './OllamaStatusIndicator';

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
    const textAreaFormRef = ref<InstanceType<typeof TextAreaForm>>();
    onMounted(() => {
      emit('update:code', codeStr.value);
      (textAreaFormRef.value as any)?.focus();
    });

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
          emit('update:code', e.content);
        });
      }
    });

    // 状态变化处理
    watchEffect(() => {
      if (props.show) {
        checkOllamaStatus();
        (textAreaFormRef.value as any)?.focus();
        console.log('🚀 ~ watchEffect ~ textAreaFormRef:', textAreaFormRef);
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

    // 处理表单提交
    const handleSubmit = async (message: string) => {
      await sendMessage({
        message,
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
                  ? parseReasoning(message.message).map((e) => {
                      return <p>{e.content}</p>;
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

    return () =>
      (
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
              <div class="code-block relative w-full">
                <CodeEditor
                  style="height: 50vh; width: 100%;"
                  type="diff"
                  init-values={props.code}
                  modified-values={codeStr.value}
                  language="javascript"
                />
              </div>

              {/* 消息区域 */}
              <NScrollbar class="h-full w-full flex-1 relative">
                {renderMessages()}
                <div ref={divRef} />
                <div class="w-full pb-[220px]"></div>
              </NScrollbar>

              {/* 输入区域 */}
              <TextAreaForm
                ref={textAreaFormRef}
                onSubmit={handleSubmit}
                onStop={stopStreamingRequest}
                status={ollamaStatus.value !== 'success' ? 'disabled' : streaming.value ? 'pending' : 'initial'}
                disabled={ollamaStatus.value !== 'success'}
              />
            </div>
          </NDrawerContent>
        </NDrawer>
      );
  },
});
