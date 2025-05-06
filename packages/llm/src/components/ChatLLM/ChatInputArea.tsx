/** @format */

import type { PropType } from 'vue';
import { useDynamicTextareaSize } from '@low-code/llm';
import {
  EnterOutlined,
  QuestionCircleOutlined,
  StopOutlined,
  UploadOutlined,
  CloseCircleOutlined as X,
} from '@vicons/antd';
import { NButton, NCheckbox, NCheckboxGroup, NIcon, NImage, NSpace, NTooltip } from 'naive-ui';
import { defineComponent, ref } from 'vue';
import { toBase64 } from '../../libs/to-base64';

export default defineComponent({
  name: 'TextAreaForm',
  props: {
    // ready: 正常状态
    // pending: ai正在输出
    // disabled: 输入框不可用
    status: String as PropType<'ready' | 'pending' | 'disabled'>,
  },
  emits: ['submit', 'stop'],
  setup(props, { emit, expose }) {
    const form = ref<HTMLFormElement>();
    const textareaRef = ref<HTMLTextAreaElement>();
    const inputRef = ref<HTMLInputElement>();
    const formValue = reactive({
      message: `Select page
Add container
Update container, style={left:0,top:0,width:1024,height:600,backgroundColor:'#ffffff'}
Select container
Add container
Update container, style={left:0,top:0,width:1024,height:60,backgroundColor:'#5e81f5'}
Select container (header)
Add text
Update text, style={left:650,top:10,width:150,height:30,fontSize:18,fontWeight:'normal',color:'#ffffff',textAlign:'center'}
Update text, text="2024-02-09"
Select container (header)
Add text
Update text, style={left:800,top:10,width:100,height:30,fontSize:18,fontWeight:'normal',color:'#ffffff',textAlign:'center'}
Update text, text="星期三"
Select container (header)
Add text
Update text, style={left:900,top:10,width:100,height:30,fontSize:18,fontWeight:'normal',color:'#ffffff',textAlign:'center'}
Update text, text="15:09:33"
Select container
Add container
Update container, style={left:0,top:60,width:400,height:540,backgroundColor:'#ffffff',borderRadius:8,boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}
Select container (left section)
Add text
Update text, style={left:10,top:10,width:380,height:30,fontSize:24,fontWeight:'bold',color:'#1a1a1a'}
Update text, text="12床 孙思达"`,
      image: '',
    });
    // 文本框聚焦
    const focus = () => {
      textareaRef.value?.focus();
    };
    // 重置表单状态
    const resetFormState = () => {
      formValue.message = '';
      formValue.image = '';
    };
    const handleSubmit = async (e: Event) => {
      if (props.status === 'disabled' || props.status === 'pending')
        return;
      e.preventDefault();
      const val = textareaRef.value?.value;

      if (!val || val.trim().length === 0) {
        return;
      }

      emit('submit', {
        message: val.trim(),
        image: formValue.image,
      });
      resetFormState();
      focus();
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
        emit('submit', {
          message: val.trim(),
          image: formValue.image,
        });
        resetFormState();
        focus();
      }
    };

    const handleStop = () => {
      emit('stop');
    };

    const onInputChange = async (e: any) => {
      if (e instanceof File) {
        const base64 = await toBase64(e);

        formValue.image = base64;
      }
      else {
        if (e.target?.files) {
          const base64 = await toBase64(e.target.files[0]);
          formValue.image = base64;
        }
      }
    };
    expose({
      focus,
    });
    // 动态调整文本框大小
    useDynamicTextareaSize(textareaRef, toRef(formValue, 'message'), 150);

    return () => (
      <div class="lc-llm-input-area">
        <div class="lc-llm-input-area__container">
          <div
            class={`lc-llm-input-area__header-wrapper ${
              formValue.image === '' ? 'hidden' : ''
            }`}
          >
            <div class="lc-llm-input-area__header-image">
              <button
                type="button"
                onClick={() => {
                  formValue.image = '';
                  inputRef.value!.value = '';
                }}
                class="lc-llm-input-area__header-image-button"
              >
                <X class="lc-llm-input-area__header-image-close-button" />
              </button>
              {' '}
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
              <div
                class="lc-llm-input-area__header-ref-image-info-content"
              >
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
                      onChange={onInputChange}
                    />
                    <div class="lc-llm-input-area__input-container">
                      <textarea
                        autofocus
                        ref={textareaRef}
                        class="lc-llm-input-area__textarea"
                        rows="1"
                        tabindex="0"
                        placeholder={`简单描述您想要的界面或功能
支持上传截图作为参考`}
                        style={{ minHeight: '68px' }}
                        onKeydown={handleKeyDown}
                        v-model={formValue.message}
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
                          <div>
                            <NButton
                              size="small"
                              type="info"
                              disabled={props.status === 'disabled'}
                              onClick={() => inputRef.value?.click()}
                              v-slots={{
                                icon: () => (
                                  <NIcon size="small">
                                    <UploadOutlined />
                                  </NIcon>
                                ),
                              }}
                            >
                              图片
                            </NButton>
                          </div>
                          <div>
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
                                    {props.status !== 'disabled'
                                      ? '提交'
                                      : '未连接'}
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
                                )}
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
      </div>
    );
  },
});
