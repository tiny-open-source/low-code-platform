import type { Services } from '@low-code/designer';
import { NScrollbar } from 'naive-ui';
import { defineComponent } from 'vue';
import { useMessageOption } from '../../composables/chat';
import { useOllamaStatus } from '../../composables/ollama';
import Messages from './ChatMessages';
import TextAreaForm from './InputArea';

export default defineComponent({
  name: 'l-form-llm-chat',
  setup() {
    const services = inject<Services>('services');
    const divRef = ref<HTMLDivElement>();
    const textAreaFormRef = ref<InstanceType<typeof TextAreaForm>>();

    // Ollama 状态检查
    const { check: checkOllamaStatus, status: ollamaStatus } = useOllamaStatus();
    onMounted(checkOllamaStatus);

    console.log(services?.aiAssistantService);
    // 构建提示语
    const prompt = computed(() => {
      return services?.aiAssistantService?.generatePromptTemplate() || '';
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
        services?.aiAssistantService!.processStreamChunk(latestMessage.message);
        if (!isProcessing.value) {
          services?.aiAssistantService!.finalizeStream();
        }
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
    return () => (
      <div class="lc-llm-chat-form">
        {/* 消息区域 */}
        <NScrollbar class="lc-llm-chat-form__messages-container">
          <Messages messages={messages.value} />
          <div ref={divRef} />
          <div class="lc-llm-chat-form__spacer"></div>
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
    );
  },
});
