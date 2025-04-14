import type { PropType } from 'vue';
import { useDynamicTextareaSize } from '@low-code/llm';
import { EnterOutlined, StopOutlined } from '@vicons/antd';
import { NButton, NIcon } from 'naive-ui';

export default defineComponent({
  name: 'TextAreaForm',
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    // initial: 正常状态
    // pending: ai正在输出
    // disabled: 输入框不可用
    status: String as PropType<'initial' | 'pending' | 'disabled'>,
  },
  emits: ['submit', 'stop'],
  expose: ['focus'],
  setup(props, { emit }) {
    const form = ref<HTMLFormElement>();
    const textareaRef = ref<HTMLTextAreaElement>();
    const message = ref('');
    // 文本框聚焦
    const focus = () => {
      textareaRef.value?.focus();
    };
    // 重置表单状态
    const resetFormState = () => {
      message.value = '';
    };
    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      const messageText = textareaRef.value?.value;

      if (!messageText || messageText.trim().length === 0) {
        return;
      }

      resetFormState();
      focus();
      emit('submit', messageText.trim());
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
        focus();
        emit('submit', message.trim());
      }
    };

    const handleStop = () => {
      emit('stop');
    };
    // 动态调整文本框大小
    useDynamicTextareaSize(textareaRef, message, 150);

    return () => (
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
                        disabled={props.status === 'disabled' || props.status === 'pending'}
                        onKeydown={handleKeyDown}
                        v-model={message.value}
                      />

                      <div class="mt-2 flex justify-between items-center">
                        <div></div>
                        <div class="flex !justify-end gap-3">
                          <div class="ant-space-compact css-dev-only-do-not-override-xjks6i ant-space-compact-block ant-dropdown-button !justify-end !w-auto">
                            {!(props.status === 'pending')
                              ? (
                                  <NButton
                                    attr-type="submit"
                                    size="small"
                                    type="primary"
                                    disabled={props.status === 'disabled'}
                                    v-slots={{
                                      icon: () => (
                                        <NIcon size="small">
                                          <EnterOutlined />
                                        </NIcon>
                                      ),
                                    }}
                                  >
                                    {
                                      props.status !== 'disabled'
                                        ? '提交'
                                        : '未连接'
                                    }
                                  </NButton>
                                )
                              : (
                                  <NButton
                                    size="small"
                                    type="primary"
                                    onClick={handleStop}
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
    );
  },
});
