import { aiAssistantService, CodeEditor } from '@low-code/designer';
import { NDrawer, NDrawerContent, NScrollbar } from 'naive-ui';
import { computed, defineComponent, onMounted, ref, watch, watchEffect } from 'vue';
import { useMessageOption } from '../../composables/chat';
import { useOllamaStatus } from '../../composables/ollama';
import Messages from './ChatMessages';
import TextAreaForm from './InputArea';
import StatusIndicator from './OllamaStatusIndicator';

export default defineComponent({
  name: 'ChatLLMDrawer',
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

    // Ollama 状态检查
    const { check: checkOllamaStatus, status: ollamaStatus } = useOllamaStatus();
    onMounted(async () => {
      checkOllamaStatus();
      emit('update:code', codeStr.value);

      // (textAreaFormRef.value as any)?.focus();
    });

    // 构建提示语
    const prompt = computed(() => {
      return aiAssistantService.generatePromptTemplate();
    });

    // 消息处理
    const { onSubmit, messages, streaming, stopStreamingRequest, isProcessing } = useMessageOption({
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
        aiAssistantService.processStreamChunk(latestMessage.message);
        if (!isProcessing.value) {
          aiAssistantService.finalizeStream();
        }
      }
    });

    // 状态变化处理
    watchEffect(() => {
      if (props.show) {
        checkOllamaStatus();
        // (textAreaFormRef.value as any)?.focus();
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
            <div class="lc-llm-chat-drawer">
              <div class="lc-llm-chat-drawer__code-block">
                <CodeEditor
                  class="lc-llm-chat-drawer__code-editor"
                  type="diff"
                  init-values={props.code}
                  modified-values={codeStr.value}
                  language="javascript"
                />
              </div>

              {/* 消息区域 */}
              <NScrollbar class="h-full w-full flex-1 relative">
                <Messages messages={messages.value} />
                <div ref={divRef} />
                <div class="lc-llm-chat-drawer__spacer"></div>
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
