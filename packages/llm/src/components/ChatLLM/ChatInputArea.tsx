import type { PropType } from 'vue';
import { useDynamicTextareaSize } from '@low-code/llm';
import {
  AudioMutedOutlined,
  AudioOutlined,
  EnterOutlined,
  FileImageOutlined,
  QuestionCircleOutlined,
  StopOutlined,
  CloseCircleOutlined as X,
} from '@vicons/antd';
import { NButton, NCheckbox, NCheckboxGroup, NIcon, NImage, NSpace, NTooltip } from 'naive-ui';
import { defineComponent, reactive, ref, toRef, watch } from 'vue';
import { useSpeechRecognition } from '../../composables/speech-recognition';
import { toBase64 } from '../../libs/to-base64';

// 表单状态管理
function useFormState() {
  const formValue = reactive({
    message: '',
    image: '',
  });

  const resetFormState = () => {
    formValue.message = '';
    formValue.image = '';
  };

  return {
    formValue,
    resetFormState,
  };
}

// 表单提交逻辑
function useFormSubmit(props: any, emit: any, formValue: any, resetFormState: () => void, focus: () => void) {
  const isValidSubmission = () => {
    const message = formValue.message?.trim();
    return message || formValue.image;
  };

  const handleSubmit = async (e: Event) => {
    if (props.status === 'disabled' || props.status === 'pending')
      return;

    e.preventDefault();

    if (!isValidSubmission())
      return;

    emit('submit', {
      message: formValue.message?.trim() || '',
      image: formValue.image,
    });

    resetFormState();
    focus();
  };

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (props.status === 'disabled' || props.status === 'pending')
      return;
    if (e.key === 'Process' || e.key === '229')
      return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      if (!isValidSubmission())
        return;

      emit('submit', {
        message: formValue.message?.trim() || '',
        image: formValue.image,
      });

      resetFormState();
      focus();
    }
  };

  return {
    handleSubmit,
    handleKeyDown,
  };
}

// 语音识别逻辑
function useSpeechHandler(textareaRef: any, submitForm: () => void) {
  const speechRecognition = useSpeechRecognition({
    autoStop: true,
    autoStopTimeout: 2000,
    onEnd: submitForm,
  });

  const toggleSpeechRecognition = () => {
    if (speechRecognition.isListening.value) {
      speechRecognition.stop();
    }
    else {
      speechRecognition.resetTranscript();
      speechRecognition.start({
        continuous: true,
        lang: 'zh-CN',
      });
    }
  };

  watch(speechRecognition.transcript, (transcript) => {
    if (speechRecognition.isListening.value) {
      textareaRef.value!.value = transcript;
      textareaRef.value!.dispatchEvent(new Event('input'));
    }
  });

  return {
    ...speechRecognition,
    toggleSpeechRecognition,
  };
}

// 文件上传逻辑
function useFileUpload(formValue: any, inputRef: any) {
  const handleFileChange = async (e: any) => {
    const file = e instanceof File ? e : e.target?.files?.[0];
    if (!file)
      return;

    const base64 = await toBase64(file);
    formValue.image = base64;
  };

  const clearImage = () => {
    formValue.image = '';
    if (inputRef.value) {
      inputRef.value.value = '';
    }
  };

  return {
    handleFileChange,
    clearImage,
  };
}

export default defineComponent({
  name: 'TextAreaForm',
  props: {
    status: String as PropType<'ready' | 'pending' | 'disabled'>,
  },
  emits: ['submit', 'stop'],
  setup(props, { emit, expose }) {
    // Refs
    const form = ref<HTMLFormElement>();
    const textareaRef = ref<HTMLTextAreaElement>();
    const inputRef = ref<HTMLInputElement>();

    // 组合式函数
    const { formValue, resetFormState } = useFormState();

    const focus = () => textareaRef.value?.focus();
    const submitForm = () => form.value?.submit();

    const { handleSubmit, handleKeyDown } = useFormSubmit(
      props,
      emit,
      formValue,
      resetFormState,
      focus,
    );

    const speechHandler = useSpeechHandler(textareaRef, submitForm);
    const { handleFileChange, clearImage } = useFileUpload(formValue, inputRef);

    // 动态调整文本框大小
    useDynamicTextareaSize(textareaRef, toRef(formValue, 'message'), 150);

    // 暴露方法
    expose({ focus });

    // 渲染函数
    const renderImagePreview = () => (
      <div class={`lc-llm-input-area__header-wrapper ${formValue.image === '' ? 'hidden' : ''}`}>
        <div class="lc-llm-input-area__header-image">
          <button
            type="button"
            onClick={clearImage}
            class="lc-llm-input-area__header-image-button"
          >
            <X class="lc-llm-input-area__header-image-close-button" />
          </button>
          <NImage
            src={formValue.image}
            alt="Uploaded Image"
            previewDisabled
            class="lc-llm-input-area__header"
          />
        </div>
        <div class="lc-llm-input-area__header-ref-image-info">
          <div class="lc-llm-input-area__header-ref-image-info-title">
            <span>选择要参考的内容:</span>
          </div>
          <div class="lc-llm-input-area__header-ref-image-info-content">
            <NCheckboxGroup size="small">
              <NSpace item-style="display: flex;">
                <NCheckbox value="1" label="布局结构" />
                <NCheckbox value="2" label="颜色样式" />
                <NCheckbox value="3" label="文案内容" />
              </NSpace>
            </NCheckboxGroup>
          </div>
        </div>
      </div>
    );

    const renderControlButtons = () => (
      <div class="lc-llm-input-area__button-group">
        {speechHandler.supported.value && (
          <NButton
            size="small"
            type="tertiary"
            disabled={props.status === 'disabled'}
            onClick={speechHandler.toggleSpeechRecognition}
            v-slots={{
              icon: () => speechHandler.isListening.value
                ? <NIcon size="small" color="#f56c6c" style="opacity: 0.8;"><AudioMutedOutlined /></NIcon>
                : <NIcon size="small"><AudioOutlined /></NIcon>,
            }}
          />
        )}

        <NButton
          size="small"
          type="tertiary"
          disabled={props.status === 'disabled'}
          onClick={() => inputRef.value?.click()}
          v-slots={{
            icon: () => <NIcon size="small"><FileImageOutlined /></NIcon>,
          }}
        />

        {props.status !== 'pending'
          ? (
              <NButton
                attr-type="submit"
                size="small"
                type="primary"
                disabled={props.status === 'disabled'}
                v-slots={{
                  icon: () => <NIcon size="small"><EnterOutlined /></NIcon>,
                }}
              >
                {props.status !== 'disabled' ? '提交' : '未连接'}
              </NButton>
            )
          : (
              <NButton
                size="small"
                type="warning"
                onClick={() => emit('stop')}
                v-slots={{
                  icon: () => <NIcon size="small"><StopOutlined /></NIcon>,
                }}
              >
                停止
              </NButton>
            )}
      </div>
    );

    const renderTextarea = () => (
      <div class="lc-llm-input-area__input-container">
        <textarea
          autofocus
          ref={textareaRef}
          class="lc-llm-input-area__textarea"
          rows="1"
          tabindex="0"
          placeholder={`简单描述您想要的界面或功能，例如：画一面国旗\n支持上传截图作为参考`}
          style={{ minHeight: '68px' }}
          onKeydown={handleKeyDown}
          v-model={formValue.message}
        />

        <div class="lc-llm-input-area__controls">
          <NTooltip>
            {{
              trigger: () => (
                <NButton text size="small">
                  <NIcon size="small"><QuestionCircleOutlined /></NIcon>
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
          </NTooltip
          >

          {renderControlButtons()}
        </div>
      </div>
    );

    return () => (
      <div class="lc-llm-input-area">
        <div class="lc-llm-input-area__container">
          {renderImagePreview()}

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
                      ref={inputRef}
                      type="file"
                      class="hidden"
                      accept="image/*"
                      multiple={false}
                      onChange={handleFileChange}
                    />
                    {renderTextarea()}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
