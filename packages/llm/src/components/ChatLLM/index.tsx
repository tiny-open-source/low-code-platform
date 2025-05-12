import { NScrollbar } from 'naive-ui';
import { defineComponent } from 'vue';
import { useMessageOption } from '../../composables/chat';
import { useOllamaStatus } from '../../composables/ollama';
import aiAssistantService from '../../service/ai-assistant.service';
import { processPromptTemplate, useMultiModelConfig, useMultiModelSettings } from '../../utils/storage';
import Header from './ChatHeader';
import TextAreaForm from './ChatInputArea';
import Messages from './ChatMessages';
import OllamaStatusIndicator from './OllamaStatusIndicator';

export default defineComponent({
  name: 'l-form-llm-chat',
  setup() {
    const divRef = ref<HTMLDivElement>();
    const textAreaFormRef = ref<InstanceType<typeof TextAreaForm>>();

    // Ollama 状态检查
    const { check: checkOllamaStatus, status: ollamaStatus }
      = useOllamaStatus();

    const modelConfig = useMultiModelConfig();
    const modelSettings = useMultiModelSettings();

    onMounted(() => {
      (textAreaFormRef.value as any)?.focus();
      checkOllamaStatus();
    });

    // 构建提示语
    const prompt = computed(() => {
      // 优先使用提示词模板
      const currentModel = modelSettings.value.mainModel;
      const promptTemplate = currentModel?.prompt;

      if (promptTemplate) {
        // 准备变量值
        const variableValues: Record<string, string> = {

        };

        // 处理模板
        return processPromptTemplate(promptTemplate, variableValues);
      }

      return currentModel?.prompt || '';
    });

    // 消息处理
    const { onSubmit, messages, streaming, stopStreamingRequest, resetState }
      = useMessageOption({
        prompt,
      });

    // 处理消息更新
    watch(messages, async () => {
      // 滚动到最新消息
      if (divRef.value) {
        divRef.value.scrollIntoView({ behavior: 'smooth' });
      }

      // 解析最新的机器人消息
      const latestMessage = messages.value[messages.value.length - 1];
      if (latestMessage && latestMessage.isBot) {
        if (latestMessage.generationInfo) {
          const toolResult = await aiAssistantService!.processResponse(latestMessage.message);

          // 如果有工具执行结果，将其添加到新消息中
          if (toolResult) {
            await onSubmit({
              message: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              image: '',
            });
          }
        }
      }
    });

    // 发送消息
    const sendMessage = async ({ message, image }: { message: string;image: string }) => {
      try {
        await onSubmit({
          message: `<user_query>${message}</user_query>`,
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
          <div class="lc-llm-chat-form__messages-wrapper">
            <Messages messages={messages.value} />
            <div ref={divRef} />
            <div class="lc-llm-chat-form__spacer"></div>
          </div>
        </NScrollbar>

        {/* 输入区域 */}
        <TextAreaForm
          ref={textAreaFormRef}
          onSubmit={handleSubmit}
          onStop={stopStreamingRequest}
          status={
            !modelConfig.value.mainModel?.model
              ? 'disabled'
              : streaming.value
                ? 'pending'
                : 'ready'
          }
        />
      </div>
    );
  },
});
