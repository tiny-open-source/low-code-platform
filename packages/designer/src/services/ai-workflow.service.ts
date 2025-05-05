import type { MNode } from '@low-code/schema';
import { reactive } from 'vue';
import aiAssistantService from './ai-assistant.service';
import BaseService from './base.service';
import designerService from './designer.service';

/**
 * 工作流执行状态
 */
export enum WorkflowStatus {
  /** 空闲状态 */
  IDLE = 'idle',
  /** 图像分析中 */
  ANALYZING_IMAGE = 'analyzing_image',
  /** 生成指令中 */
  GENERATING_INSTRUCTIONS = 'generating_instructions',
  /** 执行指令中 */
  EXECUTING_INSTRUCTIONS = 'executing_instructions',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 错误 */
  ERROR = 'error',
}

/**
 * 工作流状态
 */
interface WorkflowState {
  /** 当前状态 */
  status: WorkflowStatus;
  /** 错误信息 */
  error: string | null;
  /** 图像描述结果 */
  imageDescription: string;
  /** 生成的指令 */
  generatedInstructions: string;
  /** 执行结果 */
  executionResults: any[];
  /** 当前操作的节点 */
  currentNode: MNode | null;
  /** 进度百分比 */
  progressPercent: number;
  /** 处理的图像数据 */
  imageData: string | null;
}

/**
 * 大模型工作流服务
 * 处理流程：
 * 1. 上传页面切图图片
 * 2. 通过视觉识别大模型输出对切图的详细描述
 * 3. 将输出结果转交给主模型分析并输出指令
 * 4. 输出的指令通过 AIAssistant 服务解析成最终的函数调用队列
 */
class AIWorkflowService extends BaseService {
  /** 工作流状态 */
  public state = reactive<WorkflowState>({
    status: WorkflowStatus.IDLE,
    error: null,
    imageDescription: '',
    generatedInstructions: '',
    executionResults: [],
    currentNode: null,
    progressPercent: 0,
    imageData: null,
  });

  constructor() {
    super([]);
  }

  /**
   * 重置状态
   */
  public resetState() {
    this.state.status = WorkflowStatus.IDLE;
    this.state.error = null;
    this.state.imageDescription = '';
    this.state.generatedInstructions = '';
    this.state.executionResults = [];
    this.state.currentNode = null;
    this.state.progressPercent = 0;
    this.state.imageData = null;
  }

  /**
   * 启动工作流
   * @param imageData Base64编码的图像数据
   */
  public async startWorkflow(imageData: string): Promise<void> {
    try {
      this.resetState();
      this.state.imageData = imageData;
      this.state.status = WorkflowStatus.ANALYZING_IMAGE;
      this.state.progressPercent = 10;

      // 步骤1：调用视觉模型分析图像
      const imageDescription = await this.analyzeImage(imageData);
      this.state.imageDescription = imageDescription;
      this.state.progressPercent = 30;

      // 步骤2：将图像描述转换为布局指令
      this.state.status = WorkflowStatus.GENERATING_INSTRUCTIONS;
      const instructions = await this.generateInstructions(imageDescription);
      this.state.generatedInstructions = instructions;
      this.state.progressPercent = 60;

      // 步骤3：执行生成的指令
      this.state.status = WorkflowStatus.EXECUTING_INSTRUCTIONS;
      const results = await this.executeInstructions(instructions);
      this.state.executionResults = results;
      this.state.progressPercent = 100;

      this.state.status = WorkflowStatus.COMPLETED;
    }
    catch (error) {
      this.state.status = WorkflowStatus.ERROR;
      this.state.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * 调用视觉模型分析图像
   * @param imageData Base64编码的图像数据
   * @returns 图像描述文本
   */
  private async analyzeImage(imageData: string): Promise<string> {
    try {
      // 这里调用视觉模型API，如OpenAI的GPT-4 Vision
      // 示例接口调用
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `请详细分析这个UI设计图，描述它的布局、组件、颜色、文本内容和位置信息。假设画布大小是1024x600像素，左上角为原点(0,0)。
                  请在描述中包含：
                  1. 主要部分和区域的位置、尺寸
                  2. 所有文本内容及其大小、颜色、粗细
                  3. 所有按钮、输入框、图像等组件
                  4. 配色方案和风格
                  请尽可能精确地描述组件位置（用像素值）和大小。`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData,
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
        }),
      });

      const result = await response.json();
      return result.choices[0]?.message?.content || '无法识别图像';
    }
    catch (error) {
      console.error('图像分析失败:', error);
      throw new Error('图像分析失败，请检查API配置或网络连接');
    }
  }

  /**
   * 获取API密钥
   */
  private getApiKey(): string {
    // 从配置、环境变量或其他安全存储中获取API密钥
    // 这里返回一个示例，实际应用中应该从安全存储获取
    return 'YOUR_API_KEY';
  }

  /**
   * 生成布局指令
   * @param imageDescription 图像描述文本
   * @returns 布局指令
   */
  private async generateInstructions(imageDescription: string): Promise<string> {
    try {
      // 获取当前画布信息
      const canvasInfo = this.getCanvasInfo();

      // 构建提示词
      const prompt = `
基于以下UI设计图的描述，请生成一系列操作指令，用于在低代码平台上创建相同的界面。
画布尺寸: ${canvasInfo.width}px × ${canvasInfo.height}px

UI设计图描述:
${imageDescription}

请生成精确的指令步骤，使用以下格式:

1. Select page
2. Add container
3. Update container, style={left:0,top:0,width:1024,height:600,backgroundColor:'#ffffff'}

注意:
- 请始终先选择正确的容器，因为元素位置是相对于父容器的
- 在不确定容器层次结构时，默认选择页面
- 创建元素时，请指定准确的位置和尺寸
- 更新元素时，指的是最近添加的元素
- 只生成布局指令，不要包含其他文本
`;

      // 调用大模型API获取布局指令
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 4000,
        }),
      });

      const result = await response.json();
      return result.choices[0]?.message?.content || '无法生成布局指令';
    }
    catch (error) {
      console.error('生成布局指令失败:', error);
      throw new Error('生成布局指令失败，请检查API配置或网络连接');
    }
  }

  /**
   * 获取画布信息
   */
  private getCanvasInfo() {
    const currentPage = designerService.get('page');
    return {
      width: currentPage?.style?.width || '1024',
      height: currentPage?.style?.height || '600',
    };
  }

  /**
   * 执行生成的指令
   * @param instructions 布局指令
   * @returns 执行结果
   */
  private async executeInstructions(instructions: string): Promise<any[]> {
    try {
      // 使用AIAssistant服务来执行指令
      const result = await aiAssistantService.processModelResponse('', instructions);
      return Array.isArray(result.results) ? result.results : [result];
    }
    catch (error) {
      console.error('执行布局指令失败:', error);
      throw new Error('执行布局指令失败，请检查指令格式或系统状态');
    }
  }

  /**
   * 处理流式响应
   * @param chunk 响应数据块
   */
  public processStreamChunk(chunk: string): void {
    // 根据当前状态处理不同阶段的流式响应
    switch (this.state.status) {
      case WorkflowStatus.ANALYZING_IMAGE:
        // 累加图像分析结果
        this.state.imageDescription += chunk;
        this.state.progressPercent = Math.min(30, this.state.progressPercent + 1);
        break;

      case WorkflowStatus.GENERATING_INSTRUCTIONS:
        // 累加指令生成结果
        this.state.generatedInstructions += chunk;
        this.state.progressPercent = Math.min(60, this.state.progressPercent + 1);
        break;

      case WorkflowStatus.EXECUTING_INSTRUCTIONS:
        // 将数据传递给AI助手进行处理
        aiAssistantService.processStreamChunk(chunk);
        this.state.progressPercent = Math.min(95, this.state.progressPercent + 1);
        break;

      default:
        break;
    }
  }

  /**
   * 完成流式响应处理
   */
  public async finalizeStream(): Promise<any> {
    if (this.state.status === WorkflowStatus.EXECUTING_INSTRUCTIONS) {
      const result = await aiAssistantService.finalizeStream();
      this.state.status = WorkflowStatus.COMPLETED;
      this.state.progressPercent = 100;
      return result;
    }
    return null;
  }

  /**
   * 取消当前工作流
   */
  public cancelWorkflow(): void {
    // 记录当前状态
    const previousStatus = this.state.status;

    // 重置状态
    this.resetState();

    // 添加取消信息
    this.state.error = `工作流在${previousStatus}阶段被用户取消`;
  }
}

const aiWorkflowService = new AIWorkflowService();
export default aiWorkflowService;
