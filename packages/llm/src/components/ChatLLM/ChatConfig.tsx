import type { SelectOption } from 'naive-ui';
import { EditOutlined, SettingOutlined } from '@vicons/antd';
import {
  NButton,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NSelect,
  NTabPane,
  NTabs,
  useMessage,
  useModal,
} from 'naive-ui';
import { defineComponent, ref, watch } from 'vue';
import { generateID } from '../../db/models';
import { getAllOpenAIModels } from '../../libs/openai';
import { getAllModels, setOllamaURL } from '../../service/ollama';
import { OAI_API_PROVIDERS } from '../../utils/oai-api-providers';
import { useLLMSettings, useModelConfig } from '../../utils/storage';
import { ProviderIcons } from '../ProviderIcon';

interface formValues {
  ollamaUrl?: string;
  model?: string;
  modelId?: string;
  customServiceProvider?: string;
  customServiceProviderName?: string;
  customServiceProviderBaseUrl?: string;
  apiKey?: string;
  prompt?: string;
}
export default defineComponent({
  name: 'ChatConfig',
  emits: ['save'],
  setup(_, { emit }) {
    const modal = useModal();
    const message = useMessage();
    const formRef = ref<InstanceType<typeof NForm>>();
    const providerFormRef = ref<InstanceType<typeof NForm>>();

    const isFetchingModel = ref(true);

    const llmSettings = useLLMSettings(); // 大模型基础配置
    const formValues = ref<formValues>(
      llmSettings.value,
    );

    const modelConfig = useModelConfig(); // 已选大模型详细配置
    const localModels = ref<any[]>([]);
    const customModels = ref<any[]>([]);
    const models = computed(() => {
      return [...localModels.value, ...customModels.value];
    });
    onBeforeMount(async () => {
      try {
        isFetchingModel.value = true;
        localModels.value = await getAllModels();
      }
      catch (error) {
        console.error('获取模型失败:', error);
        message.error('获取模型失败，请检查网络连接或API密钥');
      }
      finally {
        isFetchingModel.value = false;
      }
    });
    watch(
      [() => formValues.value.customServiceProviderBaseUrl, () => formValues.value.apiKey],
      async () => {
        const baseUrl = formValues.value.customServiceProviderBaseUrl;
        const apiKey = formValues.value.apiKey;
        if (baseUrl && apiKey) {
          try {
            isFetchingModel.value = true;
            const openAiModels = await getAllOpenAIModels({
              baseUrl: formValues.value.customServiceProviderBaseUrl!,
              apiKey: formValues.value.apiKey,
            });
            customModels.value = openAiModels.map(model => ({
              name: `${model.id}_${generateID()}`,
              model: model.id,
              label: model.id,
              value: model.id,
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
          catch (error) {
            console.error('获取模型失败:', error);
            message.error('获取模型失败，请检查网络连接或API密钥');
          }
          finally {
            isFetchingModel.value = false;
          }
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
    const renderServiceProvider = () => (
      <div class="lc-llm-chat-header__settings">
        <NForm
          class="lc-llm-chat-header__settings-form"
          ref={providerFormRef}
          rules={settingProviderRules}
          model={formValues.value}
        >
          <NFormItem label="服务提供商" path="customServiceProvider">
            <NSelect
              value={formValues.value.customServiceProvider}
              options={OAI_API_PROVIDERS}
              onUpdateValue={(e) => {
                const value = OAI_API_PROVIDERS.find(
                  item => item.value === e,
                );
                formValues.value.customServiceProvider = value?.value;
                formValues.value.customServiceProviderName = value?.label;
                formValues.value.customServiceProviderBaseUrl
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
              value={formValues.value.customServiceProviderName || void 0}
              placeholder="输入提供商名称"
              onUpdateValue={(value) => {
                formValues.value.customServiceProviderName = value;
              }}
            />
          </NFormItem>
          <NFormItem label="基础 URL" path="customServiceProviderBaseUrl">
            <NInput
              value={formValues.value.customServiceProviderBaseUrl || void 0}
              placeholder="输入 基础 URL"
              onUpdateValue={(value) => {
                formValues.value.customServiceProviderBaseUrl = value;
              }}
            />
          </NFormItem>
          <NFormItem label="API 密钥" path="apiKey">
            <NInput
              type="password"
              showPasswordOn="click"
              value={formValues.value.apiKey || void 0}
              placeholder="输入 API 密钥"
              onUpdateValue={(value) => {
                formValues.value.apiKey = value;
              }}
            />
          </NFormItem>
        </NForm>
      </div>
    );
    const handleServiceProviderAdd = () => {
      modal.create({
        preset: 'dialog',
        title: '添加服务提供商',
        content: renderServiceProvider,
        onPositiveClick: async () => {
          const res = await providerFormRef.value?.validate();
          if (res?.warnings) {
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
    const renderSettings = () => (
      <NTabs type="line" animated>
        <NTabPane name="main-model" tab="主模型">
          <div class="lc-llm-chat-header__settings">
            <NButton onClick={handleServiceProviderAdd}>添加提供商</NButton>
            <NForm
              class="lc-llm-chat-header__settings-form"
              ref={formRef}
              rules={settingRules}
              model={formValues.value}
            >
              <NFormItem label="Ollama URL" path="ollamaUrl">
                <NInput
                  value={formValues.value.ollamaUrl || void 0}
                  placeholder="输入 Ollama URL"
                  onUpdate:value={(value) => {
                    formValues.value.ollamaUrl = value;
                  }}
                />
              </NFormItem>

              <NFormItem label="选择模型" path="customServiceProvider">
                <NSelect
                  value={formValues.value.model || void 0}
                  options={models.value}
                  loading={isFetchingModel.value}
                  clearable
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
                    formValues.value.model = value;
                  }}
                >
                </NSelect>
              </NFormItem>
              <NFormItem label="系统提示词" path="prompt">
                <NInput placeholder="请你扮演..." type="textarea" value={formValues.value.prompt || void 0} onUpdate:value={e => formValues.value.prompt = e} />
              </NFormItem>
            </NForm>
          </div>
        </NTabPane>
        <NTabPane name="vision-model" tab="视觉识别模型">
          Hey Jude
        </NTabPane>
      </NTabs>

    );
    const handleSetting = () => {
      modal.create({
        preset: 'dialog',
        title: '配置 Ollama',
        content: renderSettings,
        onPositiveClick: async () => {
          const res = await formRef.value?.validate();
          if (!res?.warnings) {
            message.success('已保存');
            llmSettings.value = formValues.value; // 保存基础配置
            const model = models.value.find(
              (model: any) => model.value === formValues.value.model,
            );
            modelConfig.value = model; // 保存已选模型的详细配置
          }
          else {
            console.log(res?.warnings);
            message.error('验证失败');
            return false;
          }
          setOllamaURL(formValues.value.ollamaUrl!);
          emit('save', formValues.value);
        },
        positiveText: '保存',
        negativeText: '取消',
      });
    };
    return () => (
      <NButton
        size="small"
        quaternary
        onClick={handleSetting}
        v-slots={{
          icon: () => (
            <NIcon>
              <SettingOutlined />
            </NIcon>
          ),
        }}
      >
      </NButton>
    );
  },
});
