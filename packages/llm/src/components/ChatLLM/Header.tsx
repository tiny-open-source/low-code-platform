/** @format */

import type { SelectOption } from 'naive-ui';
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
import { defineComponent, ref, watch } from 'vue';
import { generateID } from '../../db/models';
import { getAllOpenAIModels } from '../../libs/openai';
import { getAllModels, getOllamaURL, setOllamaURL } from '../../service/ollama';
import { OAI_API_PROVIDERS } from '../../utils/oai-api-providers';
import { ProviderIcons } from '../ProviderIcon';

interface FormValue {
  ollamaUrl?: string;
  model?: string;
  modelId?: string;
  customServiceProvider?: string;
  customServiceProviderName?: string;
  customServiceProviderBaseUrl?: string;
  apiKey?: string;
}
export default defineComponent({
  name: 'Header',
  components: {
    NSwitch,
    NCollapseTransition,
    NCollapse,
    NCollapseItem,
  },
  props: {},
  emits: ['newChat', 'settingSave'],
  async setup(props, { emit }) {
    const modal = useModal();
    const message = useMessage();
    const formRef = ref<InstanceType<typeof NForm>>();
    const providerFormRef = ref<InstanceType<typeof NForm>>();
    const settingValueStorage = useLocalStorage<FormValue>(
      'formValue',
      {
        ollamaUrl: getOllamaURL(),
        model: '',
        modelId: '',
        customServiceProvider: 'custom',
        customServiceProviderName: '',
        customServiceProviderBaseUrl: '',
        apiKey: '',
      },
      {
        mergeDefaults: true,
      },
    );
    const formValue = ref<FormValue>(
      JSON.parse(JSON.stringify(settingValueStorage.value)),
    );

    const selectModelStorage = useLocalStorage<any>('selectModel', {});
    const handlePositiveClick = () => {
      emit('newChat');
    };
    const localModels = ref(await getAllModels());
    const customModels = ref<any[]>([]);
    const models = computed(() => {
      return [...localModels.value, ...customModels.value];
    });
    watch(
      [() => formValue.value.customServiceProviderBaseUrl, () => formValue.value.apiKey],
      async () => {
        const baseUrl = formValue.value.customServiceProviderBaseUrl;
        const apiKey = formValue.value.apiKey;
        if (baseUrl && apiKey) {
          const openAiModels = await getAllOpenAIModels({
            baseUrl: formValue.value.customServiceProviderBaseUrl!,
            apiKey: formValue.value.apiKey,
          });
          customModels.value = openAiModels.map(model => ({
            name: model.id,
            model: model.id,
            label: model.id,
            value: `${model.id}_${generateID()}`,
            modified_at: '',
            provider:
              OAI_API_PROVIDERS.find(
                provider => provider.value === model.id,
              )?.value || 'custom',
            size: 0,
            digest: '',
            details: {
              parent_model: '',
              format: '',
              family: '',
              families: [],
              parameter_size: '',
              quantization_level: '',
            },
          }));
        }
      },
      {
        immediate: true,
      },
    );
    const settingRules = {
      ollamaUrl: {
        required: true,
        trigger: ['input', 'blur'],
        message: '请输入 Ollama URL',
      },
    };

    const settingProviderRules = {
      customServiceProviderName: {
        required: true,
        trigger: ['input', 'blur'],
        message: '请输入提供商名称',
      },
      customServiceProviderBaseUrl: {
        required: true,
        trigger: ['input', 'blur'],
        message: '请输入基础URL',
      },
    };
    const handleServiceProviderAdd = () => {
      modal.create({
        preset: 'dialog',
        title: '添加服务提供商',
        content: () => (
          <div class="lc-llm-chat-header__settings">
            <NForm
              class="lc-llm-chat-header__settings-form"
              ref={providerFormRef}
              rules={settingProviderRules}
              model={formValue.value}
            >
              <NFormItem label="服务提供商" path="customServiceProvider">
                <NSelect
                  value={formValue.value.customServiceProvider}
                  options={OAI_API_PROVIDERS}
                  onUpdateValue={(e) => {
                    const value = OAI_API_PROVIDERS.find(
                      item => item.value === e,
                    );
                    formValue.value.customServiceProvider = value?.value;
                    formValue.value.customServiceProviderName = value?.label;
                    formValue.value.customServiceProviderBaseUrl
                      = value?.baseUrl;
                  }}
                  renderLabel={(option: SelectOption) => (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <NIcon>
                        <ProviderIcons
                          provider={String(option.value)}
                          className="size-5"
                        />
                      </NIcon>
                      {option.label}
                    </div>
                  )}
                >
                </NSelect>
              </NFormItem>
              <NFormItem label="提供商名称" path="customServiceProviderName">
                <NInput
                  value={formValue.value.customServiceProviderName || void 0}
                  placeholder="输入提供商名称"
                  onUpdateValue={(value) => {
                    formValue.value.customServiceProviderName = value;
                  }}
                />
              </NFormItem>
              <NFormItem label="基础 URL" path="customServiceProviderBaseUrl">
                <NInput
                  value={formValue.value.customServiceProviderBaseUrl || void 0}
                  placeholder="输入 基础 URL"
                  onUpdateValue={(value) => {
                    formValue.value.customServiceProviderBaseUrl = value;
                  }}
                />
              </NFormItem>
              <NFormItem label="API 密钥" path="apiKey">
                <NInput
                  type="password"
                  showPasswordToggle
                  value={formValue.value.apiKey || void 0}
                  placeholder="输入 API 密钥"
                  onUpdateValue={(value) => {
                    formValue.value.apiKey = value;
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
              rules={settingRules}
              model={formValue.value}
            >
              <NFormItem label="Ollama URL" path="ollamaUrl">
                <NInput
                  value={formValue.value.ollamaUrl || void 0}
                  placeholder="输入 Ollama URL"
                  onUpdate:value={(value) => {
                    formValue.value.ollamaUrl = value;
                  }}
                />
              </NFormItem>

              <NFormItem label="选择模型" path="customServiceProvider">
                <NSelect
                  value={formValue.value.model || void 0}
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
                  onUpdate:value={(value) => {
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
            const selectedModel = models.value.find(
              (model: any) => model.value === formValue.value.model,
            );
            selectModelStorage.value = selectedModel;
            settingValueStorage.value = formValue.value;
          }
          else {
            console.log(res?.warnings);
            message.error('验证失败');
            return false;
          }
          setOllamaURL(formValue.value.ollamaUrl!);
          emit('settingSave', formValue.value);
        },
        onNegativeClick: () => {
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
