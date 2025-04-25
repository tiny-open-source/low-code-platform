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

interface settingValue {
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
    const settingValueStorage = useLocalStorage<settingValue>(
      'settingValue',
      {
        ollamaUrl: getOllamaURL(),
        model: '',
        modelId: '',
        customServiceProvider: 'custom',
        customServiceProviderName: '',
        customServiceProviderBaseUrl: '',
        apiKey: '',
        prompt: '',
      },
      {
        mergeDefaults: true,
      },
    );
    const settingValue = ref<settingValue>(
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
      [() => settingValue.value.customServiceProviderBaseUrl, () => settingValue.value.apiKey],
      async () => {
        const baseUrl = settingValue.value.customServiceProviderBaseUrl;
        const apiKey = settingValue.value.apiKey;
        if (baseUrl && apiKey) {
          const openAiModels = await getAllOpenAIModels({
            baseUrl: settingValue.value.customServiceProviderBaseUrl!,
            apiKey: settingValue.value.apiKey,
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
              model={settingValue.value}
            >
              <NFormItem label="服务提供商" path="customServiceProvider">
                <NSelect
                  value={settingValue.value.customServiceProvider}
                  options={OAI_API_PROVIDERS}
                  onUpdateValue={(e) => {
                    const value = OAI_API_PROVIDERS.find(
                      item => item.value === e,
                    );
                    settingValue.value.customServiceProvider = value?.value;
                    settingValue.value.customServiceProviderName = value?.label;
                    settingValue.value.customServiceProviderBaseUrl
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
                  value={settingValue.value.customServiceProviderName || void 0}
                  placeholder="输入提供商名称"
                  onUpdateValue={(value) => {
                    settingValue.value.customServiceProviderName = value;
                  }}
                />
              </NFormItem>
              <NFormItem label="基础 URL" path="customServiceProviderBaseUrl">
                <NInput
                  value={settingValue.value.customServiceProviderBaseUrl || void 0}
                  placeholder="输入 基础 URL"
                  onUpdateValue={(value) => {
                    settingValue.value.customServiceProviderBaseUrl = value;
                  }}
                />
              </NFormItem>
              <NFormItem label="API 密钥" path="apiKey">
                <NInput
                  type="password"
                  showPasswordToggle
                  value={settingValue.value.apiKey || void 0}
                  placeholder="输入 API 密钥"
                  onUpdateValue={(value) => {
                    settingValue.value.apiKey = value;
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
              model={settingValue.value}
            >
              <NFormItem label="Ollama URL" path="ollamaUrl">
                <NInput
                  value={settingValue.value.ollamaUrl || void 0}
                  placeholder="输入 Ollama URL"
                  onUpdate:value={(value) => {
                    settingValue.value.ollamaUrl = value;
                  }}
                />
              </NFormItem>

              <NFormItem label="选择模型" path="customServiceProvider">
                <NSelect
                  value={settingValue.value.model || void 0}
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
                    settingValue.value.model = value;
                  }}
                >
                </NSelect>
              </NFormItem>
              <NFormItem label="系统提示词" path="prompt">
                <NInput type="textarea" value={settingValue.value.prompt || void 0} onUpdate:value={e => settingValue.value.prompt = e} />
              </NFormItem>
            </NForm>
          </div>
        ),
        onPositiveClick: async () => {
          const res = await formRef.value?.validate();
          if (!res?.warnings) {
            message.success('验证成功');
            const selectedModel = models.value.find(
              (model: any) => model.value === settingValue.value.model,
            );
            selectModelStorage.value = selectedModel;
            settingValueStorage.value = settingValue.value;
          }
          else {
            console.log(res?.warnings);
            message.error('验证失败');
            return false;
          }
          setOllamaURL(settingValue.value.ollamaUrl!);
          emit('settingSave', settingValue.value);
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
