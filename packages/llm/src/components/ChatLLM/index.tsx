/** @format */

import type { Services } from '@low-code/designer';
import { NScrollbar } from 'naive-ui';
import { defineComponent } from 'vue';
import { useMessageOption } from '../../composables/chat';
import { useOllamaStatus } from '../../composables/ollama';
import Header from './ChatHeader';
import TextAreaForm from './ChatInputArea';
import Messages from './ChatMessages';
import OllamaStatusIndicator from './OllamaStatusIndicator';

export default defineComponent({
  name: 'l-form-llm-chat',
  setup() {
    const services = inject<Services>('services');
    const divRef = ref<HTMLDivElement>();
    const textAreaFormRef = ref<InstanceType<typeof TextAreaForm>>();

    // Ollama 状态检查
    const { check: checkOllamaStatus, status: ollamaStatus }
      = useOllamaStatus();
    onMounted(() => {
      (textAreaFormRef.value as any)?.focus();
      checkOllamaStatus();
    });
    // 构建提示语
    const prompt = computed(() => {
      return services?.aiAssistantService?.generatePromptTemplate() || '';
    });

    // 消息处理
    const { onSubmit, messages, streaming, stopStreamingRequest, resetState }
      = useMessageOption({
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
        if (latestMessage.generationInfo) {
          services?.aiAssistantService!.finalizeStream();
        }
      }
    });

    // 发送消息
    const sendMessage = async ({ message, image }: { message: string;image: string }) => {
      try {
        await onSubmit({
          message,
          image,
        });
      }
      catch (error) {
        console.error('发送消息失败:', error);
        // 可以在这里添加错误提示
      }
    };

    // 处理表单提交
    const handleSubmit = async ({ message, image }: { message: string; image: string }) => {
      await sendMessage({
        message,
        image,
      });
    };
    const handleNewChat = () => {
      // 重制状态
      resetState();
      // 重新聚焦输入框
      (textAreaFormRef.value as any)?.focus();
    };
    const handleSettingSaved = () => {
      handleNewChat();
    };
    return () => (
      <div class="lc-llm-chat-form">
        <Header onNewChat={handleNewChat} onSettingSaved={handleSettingSaved} />
        <OllamaStatusIndicator
          style={{ display: messages.value.length > 0 ? 'none' : 'flex' }}
          status={ollamaStatus.value}
        />
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
          status={
            ollamaStatus.value !== 'success'
              ? 'disabled'
              : streaming.value
                ? 'pending'
                : 'initial'
          }
          disabled={ollamaStatus.value !== 'success'}
        />
      </div>
    );
  },
});
