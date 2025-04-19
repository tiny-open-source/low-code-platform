/** @format */

import type {
  SelectOption,
} from 'naive-ui';
import { EditOutlined, SettingOutlined } from '@vicons/antd';
import {
  NButton,
  NCollapse,
  NCollapseItem,
  NCollapseTransition,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NPopconfirm,
  NSelect,
  NSwitch,
  useMessage,
  useModal,
} from 'naive-ui';
import { defineComponent, ref } from 'vue';
import { getAllModels, getOllamaURL, setOllamaURL } from '../../service/ollama';

export default defineComponent({
  name: 'Header',
  components: {
    NSwitch,
    NCollapseTransition,
    NCollapse,
    NCollapseItem,
  },
  props: {},
  emits: ['newChat', 'saveSettings'],
  setup(props, { emit }) {
    const modal = useModal();
    const message = useMessage();
    const formRef = ref<InstanceType<typeof NForm>>();
    const providerFormRef = ref<InstanceType<typeof NForm>>();
    const selectedModel = useLocalStorage('selectedModel', '');
    const handlePositiveClick = () => {
      emit('newChat');
    };
    const models = ref();
    watchEffect(async () => {
      models.value = await getAllModels();
    });
    const rules = {
      ollamaUrl: {
        required: true,
        trigger: ['input', 'blur'],
        message: '请输入 Ollama URL',
      },
    };
    const formValue = ref<{
      ollamaUrl?: string;
      model?: string;
    }>({
      ollamaUrl: getOllamaURL(),
      model: selectedModel.value || void 0,
    });

    const formServiceProviderValue = ref<{
      customServicePrivider?: string;
      customServicePrividerName?: string;
      customServicePrividerBaseUrl?: string;
      apiKey?: string;
    }>({
      customServicePrivider: void 0,
      customServicePrividerName: void 0,
      customServicePrividerBaseUrl: void 0,
      apiKey: void 0,
    });
    const handleServiceProviderAdd = () => {
      modal.create({
        preset: 'dialog',
        title: '添加服务提供商',
        content: () => (
          <div class="lc-llm-chat-header__settings">
            <NForm
              class="lc-llm-chat-header__settings-form"
              ref={providerFormRef}
              rules={rules}
              model={formServiceProviderValue.value}
            >
              <NFormItem label="服务提供商" path="customServicePrivider">
                <NSelect
                  value={formServiceProviderValue.value.customServicePrivider}
                  options={[
                    {
                      label: 'Custom',
                      value: 'Custom',
                    },
                    {
                      label: 'SiliconFlow',
                      value: 'SiliconFlow',
                    },
                    {
                      label: 'OpenAI',
                      value: 'OpenAI',
                    },
                  ]}
                  renderLabel={(option: SelectOption) => (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <NIcon>
                        <EditOutlined />
                      </NIcon>
                      {option.label}
                    </div>
                  )}
                  onChange={(value) => {
                    formServiceProviderValue.value.customServicePrivider
                      = value;
                  }}
                >
                </NSelect>
              </NFormItem>
              <NFormItem label="提供商名称" path="customServicePrividerName">
                <NInput
                  value={
                    formServiceProviderValue.value.customServicePrividerName
                  }
                  placeholder="输入提供商名称"
                  onInput={(value) => {
                    formServiceProviderValue.value.customServicePrividerName
                      = value;
                  }}
                />
              </NFormItem>
              <NFormItem label="基础 URL" path="customServicePrividerBaseUrl">
                <NInput
                  value={
                    formServiceProviderValue.value.customServicePrividerBaseUrl
                  }
                  placeholder="输入 基础 URL"
                  onInput={(value) => {
                    formValue.value.ollamaUrl = value;
                  }}
                />
              </NFormItem>
              <NFormItem label="API 密钥" path="customServicePrividerBaseUrl">
                <NInput
                  type="password"
                  showPasswordToggle
                  value={formServiceProviderValue.value.apiKey}
                  placeholder="输入 API 密钥"
                  onInput={(value) => {
                    formServiceProviderValue.value.apiKey = value;
                  }}
                />
              </NFormItem>
            </NForm>
          </div>
        ),
        onPositiveClick: async () => {
          const res = await providerFormRef.value?.validate();
          if (!res?.warnings) {
            message.success('验证成功');
          }
          else {
            console.log(res?.warnings);
            message.error('验证失败');
            return false;
          }
        },
        onNegativeClick: () => {
          message.info('取消设置');
        },
        positiveText: '保存',
        negativeText: '取消',
      });
    };
    const handleSetting = () => {
      modal.create({
        preset: 'dialog',
        title: '配置Ollama',
        content: () => (
          <div class="lc-llm-chat-header__settings">
            <NButton onClick={handleServiceProviderAdd}>添加提供商</NButton>
            <NForm
              class="lc-llm-chat-header__settings-form"
              ref={formRef}
              rules={rules}
              model={formValue.value}
            >
              <NFormItem label="Ollama URL" path="ollamaUrl">
                <NInput
                  value={formValue.value.ollamaUrl}
                  placeholder="输入 Ollama URL"
                  onInput={(value) => {
                    formValue.value.ollamaUrl = value;
                  }}
                />
              </NFormItem>

              <NFormItem label="选择模型" path="customServicePrivider">
                <NSelect
                  value={formValue.value.model}
                  options={models.value}
                  renderLabel={(option: SelectOption) => (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <NIcon>
                        <EditOutlined />
                      </NIcon>
                      {option.label}
                    </div>
                  )}
                  onChange={(value) => {
                    formValue.value.model = value;
                  }}
                >
                </NSelect>
              </NFormItem>
            </NForm>
          </div>
        ),
        onPositiveClick: async () => {
          const res = await formRef.value?.validate();
          if (!res?.warnings) {
            message.success('验证成功');
          }
          else {
            console.log(res?.warnings);
            message.error('验证失败');
            return false;
          }
          setOllamaURL(formValue.value.ollamaUrl!);
          selectedModel.value = formValue.value.model!;
          emit('saveSettings', formValue.value);
        },
        onNegativeClick: () => {
          message.info('取消设置');
        },
        positiveText: '保存',
        negativeText: '取消',
      });
    };
    return () => (
      <div class="lc-llm-chat-header">
        <div class="lc-llm-chat-header__container">
          <NPopconfirm
            onPositiveClick={handlePositiveClick}
            v-slots={{
              trigger: () => (
                <NButton
                  size="small"
                  quaternary
                  v-slots={{
                    icon: (
                      <NIcon>
                        <SettingOutlined />
                      </NIcon>
                    ),
                  }}
                >
                  新聊天
                </NButton>
              ),
              positiveText: () => '确定',
              negativeText: () => '取消',
            }}
          >
            开启新聊天将清空当前聊天记录，是否继续？
          </NPopconfirm>
          <NButton
            size="small"
            quaternary
            onClick={handleSetting}
            v-slots={{
              icon: (
                <NIcon>
                  <SettingOutlined />
                </NIcon>
              ),
            }}
          >
          </NButton>
        </div>
      </div>
    );
  },
});
