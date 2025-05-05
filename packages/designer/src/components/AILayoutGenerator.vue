<script setup lang="ts">
import { CloseOutlined, QuestionCircleOutlined, UploadOutlined } from '@vicons/antd';
import { NButton, NCard, NCollapse, NCollapseItem, NIcon, NProgress, NScrollbar, NTooltip, NUpload, useMessage } from 'naive-ui';
import { computed } from 'vue';
import aiWorkflowService, { WorkflowStatus } from '../services/ai-workflow.service';
import { toBase64 } from '../utils';

const message = useMessage();
const workflowState = aiWorkflowService.state;

const isProcessing = computed(() => {
  return [
    WorkflowStatus.ANALYZING_IMAGE,
    WorkflowStatus.GENERATING_INSTRUCTIONS,
    WorkflowStatus.EXECUTING_INSTRUCTIONS,
  ].includes(workflowState.status as WorkflowStatus);
});

const acceptFileTypes = '.jpg,.jpeg,.png,.webp';

function beforeUpload(data: { file: File }) {
  const { file } = data;

  // 检查文件类型
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    message.error('只支持JPG、PNG和WEBP格式的图片');
    return false;
  }

  // 检查文件大小，限制为5MB
  if (file.size > 5 * 1024 * 1024) {
    message.error('图片大小不能超过5MB');
    return false;
  }

  return true;
}

async function customRequest({ file }: { file: File }) {
  try {
    // 转换为Base64格式
    const base64 = await toBase64(file);
    workflowState.imageData = base64;
    message.success('图片上传成功');
  }
  catch (error) {
    message.error('图片上传失败，请重试');
    console.error('图片上传失败:', error);
  }
}

function removeImage() {
  workflowState.imageData = null;
}

async function startGeneration() {
  if (!workflowState.imageData) {
    message.warning('请先上传图片');
    return;
  }

  try {
    await aiWorkflowService.startWorkflow(workflowState.imageData);
    message.success('布局生成成功！');
  }
  catch (error) {
    message.error(`布局生成失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function cancelGeneration() {
  if (!isProcessing.value)
    return;

  aiWorkflowService.cancelWorkflow();
  message.info('已取消布局生成');
}
</script>

<template>
  <div class="ai-layout-generator">
    <NCard title="AI 布局生成器" class="generator-card">
      <template #header-extra>
        <NTooltip>
          <template #trigger>
            <NButton circle quaternary size="tiny">
              <template #icon>
                <NIcon>
                  <QuestionCircleOutlined />
                </NIcon>
              </template>
            </NButton>
          </template>
          <span>上传UI设计图，AI将自动生成布局</span>
        </NTooltip>
      </template>

      <div class="upload-section">
        <div v-if="!workflowState.imageData" class="upload-area">
          <NUpload
            :custom-request="customRequest"
            :show-file-list="false"
            :accept="acceptFileTypes"
            :disabled="workflowState.status !== 'idle'"
            @before-upload="beforeUpload"
          >
            <div class="upload-trigger">
              <NIcon size="48" class="upload-icon">
                <UploadOutlined />
              </NIcon>
              <div class="upload-text">
                点击或拖拽图片至此处
              </div>
              <div class="upload-hint">
                支持JPG、PNG、WEBP格式，建议分辨率1024x600
              </div>
            </div>
          </NUpload>
        </div>

        <div v-else class="preview-section">
          <img :src="workflowState.imageData" alt="上传图片预览" class="preview-image">
          <div class="preview-actions">
            <NButton quaternary size="small" :disabled="isProcessing" @click="removeImage">
              <template #icon>
                <NIcon><CloseOutlined /></NIcon>
              </template>
              移除图片
            </NButton>
          </div>
        </div>
      </div>

      <div v-if="workflowState.status !== 'idle'" class="workflow-status">
        <NProgress
          type="line"
          :percentage="workflowState.progressPercent"
          :processing="isProcessing"
          indicator-placement="inside"
          :height="12"
        />
        <div class="status-text">
          <template v-if="workflowState.status === 'analyzing_image'">
            正在分析图像...
          </template>
          <template v-else-if="workflowState.status === 'generating_instructions'">
            正在生成布局指令...
          </template>
          <template v-else-if="workflowState.status === 'executing_instructions'">
            正在执行布局指令...
          </template>
          <template v-else-if="workflowState.status === 'completed'">
            布局生成完成!
          </template>
          <template v-else-if="workflowState.status === 'error'">
            错误: {{ workflowState.error }}
          </template>
        </div>
      </div>

      <div class="action-buttons">
        <NButton
          type="primary"
          :disabled="!workflowState.imageData || isProcessing"
          :loading="isProcessing"
          @click="startGeneration"
        >
          {{ isProcessing ? '生成中...' : '生成布局' }}
        </NButton>
        <NButton :disabled="!isProcessing" @click="cancelGeneration">
          取消
        </NButton>
      </div>

      <div v-if="workflowState.imageDescription" class="result-section">
        <NCollapse>
          <NCollapseItem title="图像分析结果" name="image-description">
            <NScrollbar style="max-height: 200px">
              <div class="description-content">
                {{ workflowState.imageDescription }}
              </div>
            </NScrollbar>
          </NCollapseItem>
          <NCollapseItem title="生成的布局指令" name="instructions">
            <NScrollbar style="max-height: 200px">
              <pre class="instructions-content">{{ workflowState.generatedInstructions }}</pre>
            </NScrollbar>
          </NCollapseItem>
        </NCollapse>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.ai-layout-generator {
  width: 100%;
}

.generator-card {
  width: 100%;
}

.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.upload-area {
  width: 100%;
  border: 2px dashed #e9e9e9;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #5e81f5;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon {
  color: #999;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 16px;
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.preview-section {
  width: 100%;
  position: relative;
}

.preview-image {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
}

.preview-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.workflow-status {
  margin: 16px 0;
}

.status-text {
  margin-top: 4px;
  text-align: center;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: center;
}

.result-section {
  margin-top: 24px;
}

.description-content {
  white-space: pre-line;
  font-size: 14px;
}

.instructions-content {
  font-family: monospace;
  font-size: 14px;
  white-space: pre-wrap;
}
</style>
