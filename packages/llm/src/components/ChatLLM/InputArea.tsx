import type { PropType } from 'vue';
import { useDynamicTextareaSize } from '@low-code/llm';
import { EnterOutlined, QuestionCircleOutlined, StopOutlined } from '@vicons/antd';
import { NButton, NIcon, NTooltip } from 'naive-ui';
import { defineComponent, ref } from 'vue';

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
  setup(props, { emit, expose }) {
    const form = ref<HTMLFormElement>();
    const textareaRef = ref<HTMLTextAreaElement>();
    const message = ref(`1. Add a text
2. Update the text, absolute position, left 0, top 0, width 1024, height 600, style { backgroundColor: '#FFFFFF' } text "111"`);
    // 文本框聚焦
    const focus = () => {
      textareaRef.value?.focus();
    };
    // 重置表单状态
    const resetFormState = () => {
      message.value = '';
    };
    const handleSubmit = async (e: Event) => {
      if (props.status === 'disabled' || props.status === 'pending')
        return;
      e.preventDefault();
      const val = textareaRef.value?.value;

      if (!val || val.trim().length === 0) {
        return;
      }

      resetFormState();
      focus();
      emit('submit', val.trim());
    };

    // 键盘按键处理
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (props.status === 'disabled' || props.status === 'pending')
        return;
      // 忽略中文输入法正在处理的按键
      if (e.key === 'Process' || e.key === '229')
        return;

      // 处理回车键发送消息
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const val = (e.target as HTMLTextAreaElement).value;

        // 验证消息内容
        if (!val || val.trim().length === 0) {
          return;
        }

        resetFormState();
        focus();
        emit('submit', val.trim());
      }
    };

    const handleStop = () => {
      emit('stop');
    };
    expose({
      focus,
    });
    // 动态调整文本框大小
    useDynamicTextareaSize(textareaRef, message, 150);

    return () => (
      <div class="lc-llm-input-area">
        <div class="lc-llm-input-area__container">
          <div class="lc-llm-input-area__wrapper">
            <div class="lc-llm-input-area__form-container">
              <div class="lc-llm-input-area__form-wrapper">
                <div class="lc-llm-input-area__form">
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
                    <div class="lc-llm-input-area__input-container">
                      <textarea
                        autofocus
                        ref={textareaRef}
                        class="lc-llm-input-area__textarea"
                        rows="1"
                        tabindex="0"
                        placeholder="提出你的要求"
                        style={{ minHeight: '30px' }}
                        onKeydown={handleKeyDown}
                        v-model={message.value}
                      />

                      <div class="lc-llm-input-area__controls">
                        <div>
                          <NTooltip>
                            {{
                              trigger: () => (
                                <NButton text size="small">
                                  <NIcon size="small">
                                    <QuestionCircleOutlined />
                                  </NIcon>
                                </NButton>
                              ),
                              default: () => (
                                <div>
                                  <p>使用提示：</p>
                                  <p>- 按Enter发送消息</p>
                                  <p>- Shift+Enter换行</p>
                                </div>
                              ),
                            }}
                          </NTooltip>
                        </div>

                        <div class="lc-llm-input-area__button-group">
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
                                    type="warning"
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
        <p class="lc-llm-input-area__footer">注：大模型使用 deepseek-r1:14b， 仅供测试。</p>
      </div>
    );
  },
});
