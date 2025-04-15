import type { MNode } from '@low-code/schema';
import { cloneDeep, debounce } from 'lodash-es';
import BaseService from './base.service';
import designerService from './designer.service';
/**
 * 大模型调用方法的响应结构
 */
interface AIActionResponse {
  // 调用的工具名称
  tool: string;
  // 工具调用的参数
  parameters: Record<string, any>;
  // 调用工具的理由
  reasoning: string;
}

/**
 * 暴露给大模型的工具描述
 */
interface ToolDescription {
  // 工具名称
  name: string;
  // 功能描述
  description: string;
  // 参数描述
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  // 实际调用的函数
  handler: (params: any) => Promise<any>;
}
/**
 * 流式响应处理状态
 */
interface StreamState {
  complete: boolean;
  partialResponse: string;
  parsedAction: AIActionResponse | null;
  error: string | null;
}
class AIAssistant extends BaseService {
  private availableTools: ToolDescription[] = [];
  public state = reactive({
    isProcessing: false,
    streamingInProgress: false,
    lastCommand: null as string | null,
    lastResult: null as any,
    error: null as string | null,
    partialResponse: '',
    streamingError: null as string | null,
  });

  private streamState: StreamState = {
    complete: false,
    partialResponse: '',
    parsedAction: null,
    error: null,
  };

  constructor() {
    super([]);

    this.registerDefaultTools();
  }

  // 防抖处理器，用于流处理中尝试解析JSON
  private tryParseDebounced = debounce(this.tryParseStreamedJSON, 300);
  /**
   * 注册新的工具
   */
  public registerTool(tool: ToolDescription) {
    this.availableTools.push(tool);
  }

  registerDefaultTools() {
    // 选择节点工具
    this.registerTool({
      name: 'selectNode',
      description: '选择指定ID的节点',
      parameters: {
        nodeId: {
          type: 'string',
          description: '要选择的节点ID',
          required: true,
        },
      },
      handler: async ({ nodeId }) => {
        const node = await designerService.select(nodeId);
        await designerService.get('stage')?.select(nodeId);
        return { success: true, selectedNode: { id: node.id, type: node.type } };
      },
    });
    // 居中对齐工具
    this.registerTool({
      name: 'alignCenter',
      description: '将当前选中的节点或指定节点水平居中对齐',
      parameters: {
        nodeId: {
          type: 'string',
          description: '要居中对齐的节点ID，如不提供则使用当前选中节点',
          required: false,
        },
      },
      handler: async ({ nodeId }) => {
        let node: MNode;

        if (nodeId) {
          node = designerService.getNodeById(nodeId) as MNode;
          if (!node) {
            throw new Error(`找不到ID为${nodeId}的节点`);
          }
        }
        else {
          node = designerService.get('node') as MNode;
          if (!node) {
            throw new Error('当前没有选中节点');
          }
        }

        await designerService.alignCenter(node);
        return {
          success: true,
          message: `已将节点 ${node.id} 水平居中对齐`,
        };
      },
    });
  }

  /**
   * 获取所有可用工具的描述
   */
  public getToolDescriptions(): Record<string, any> {
    return this.availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * 获取当前编辑器的项目结构
   * 提供给大模型的上下文
   */
  public getCurrentProjectSchema(): Record<string, any> {
    const root = designerService.get('root');
    const currentPage = designerService.get('page');
    const selectedNode = designerService.get('node');

    return {
      projectStructure: root ? cloneDeep(root) : null,
      currentPage: currentPage
        ? {
            id: currentPage.id,
            type: currentPage.type,
            name: currentPage.name,
            style: currentPage.style,
            layout: currentPage.layout,
            itemsCount: Array.isArray(currentPage.items) ? currentPage.items.length : 0,
          }
        : null,
      selectedNode: selectedNode
        ? {
            id: selectedNode.id,
            type: selectedNode.type,
            name: selectedNode.name,
            style: selectedNode.style,
          }
        : null,
    };
  }

  /**
   * 验证解析的响应是否是有效的操作响应
   */
  private isValidActionResponse(obj: any): obj is AIActionResponse {
    return obj
      && typeof obj === 'object'
      && typeof obj.tool === 'string'
      && this.availableTools.some(t => t.name === obj.tool);
  }

  /**
   * 处理大模型流式响应的单个块
   */
  public processStreamChunk(chunk: string): void {
    // 更新状态
    this.state.streamingInProgress = true;
    this.state.partialResponse = chunk;
    this.streamState.partialResponse = chunk;

    // 尝试解析（防抖处理）
    this.tryParseDebounced();
  }

  /**
   * 尝试从流式数据中解析JSON
   */
  private tryParseStreamedJSON(): void {
    if (this.streamState.complete)
      return;

    try {
      const text = this.streamState.partialResponse;
      console.log(text);

      // 先尝试直接解析完整JSON
      try {
        const parsed = JSON.parse(text);
        if (this.isValidActionResponse(parsed)) {
          this.streamState.parsedAction = parsed;
          this.streamState.complete = true;
        }
        return;
      }
      catch {
        // 直接解析失败，尝试从文本中提取JSON
      }

      // 尝试查找完整的JSON块
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
        || text.match(/```\n([\s\S]*?)\n```/)
        || text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const jsonText = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(jsonText);

          if (this.isValidActionResponse(parsed)) {
            this.streamState.parsedAction = parsed;
            this.streamState.complete = true;
          }
        }
        catch {
          // JSON解析错误，可能是不完整
        }
      }
    }
    catch {
      // 暂不设置错误，等待更多数据
    }
  }

  /**
   * 标记流式响应结束，执行最终操作
   */
  public async finalizeStream(): Promise<any> {
    this.state.streamingInProgress = false;

    // 确保最后一次解析尝试
    this.tryParseDebounced.flush();

    if (this.streamState.parsedAction) {
      // 有有效响应，执行操作
      const result = await this.executeAction(this.streamState.parsedAction);

      // 重置流状态
      this.streamState = {
        complete: false,
        partialResponse: '',
        parsedAction: null,
        error: null,
      };

      return result;
    }
    else {
      // 无有效响应，尝试最后一次解析或返回错误
      try {
        return await this.processModelResponse('', this.state.partialResponse);
      }
      catch {
        throw new Error('无法从流式响应中解析出有效指令');
      }
    }
  }

  /**
   * 处理大模型发送的请求
   * @param userPrompt 用户发送给大模型的原始提示
   * @param modelResponse 大模型返回的JSON结构化响应
   */
  public async processModelResponse(userPrompt: string, modelResponse: string): Promise<any> {
    this.state.isProcessing = true;
    this.state.lastCommand = userPrompt;
    this.state.error = null;

    try {
      // 尝试解析大模型的JSON响应
      let parsedResponse: AIActionResponse;

      try {
        parsedResponse = JSON.parse(modelResponse);
      }
      catch {
        // 尝试从文本中提取JSON部分
        const jsonMatch = modelResponse.match(/```json\n([\s\S]*?)\n```/)
          || modelResponse.match(/```\n([\s\S]*?)\n```/)
          || modelResponse.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          try {
            parsedResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          }
          catch {
            // 如果提取出的内容不是有效JSON，尝试修复
            const potentialJson = (jsonMatch[1] || jsonMatch[0]).trim();
            const fixedJson = this.attemptToFixJson(potentialJson);
            parsedResponse = JSON.parse(fixedJson);
          }
        }
        else {
          throw new Error('无法解析大模型响应为有效的JSON结构');
        }
      }

      return await this.executeAction(parsedResponse);
    }
    catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
    finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * 尝试修复不完整的JSON
   */
  private attemptToFixJson(json: string): string {
    // 简单的修复策略：
    // 1. 处理可能缺失的结束括号
    let fixedJson = json;

    // 数括号是否匹配
    const openBraces = (fixedJson.match(/\{/g) || []).length;
    const closeBraces = (fixedJson.match(/\}/g) || []).length;

    // 添加缺失的结束括号
    if (openBraces > closeBraces) {
      fixedJson += '}'.repeat(openBraces - closeBraces);
    }

    return fixedJson;
  }

  /**
   * 执行解析后的动作
   */
  private async executeAction(parsedResponse: AIActionResponse): Promise<any> {
    // 验证响应结构
    if (!parsedResponse.tool) {
      throw new Error('大模型响应缺少工具名称');
    }

    // 查找匹配的工具
    const tool = this.availableTools.find(t => t.name === parsedResponse.tool);

    if (!tool) {
      throw new Error(`未找到名为 ${parsedResponse.tool} 的工具`);
    }
    console.log(parsedResponse);

    // 调用工具处理函数
    const result = await tool.handler(parsedResponse.parameters || {});

    this.state.lastResult = {
      toolName: tool.name,
      parameters: parsedResponse.parameters,
      result,
      reasoning: parsedResponse.reasoning,
    };

    return result;
  }

  /**
   * 生成大模型提示模板
   */
  public generatePromptTemplate(): string {
    const toolDescriptions = this.getToolDescriptions();
    const currentSchema = this.getCurrentProjectSchema();

    return `你是低代码平台的AI助手。你可以调用以下工具来帮助用户完成任务：

${JSON.stringify(toolDescriptions, null, 2)}

当前项目状态:
${JSON.stringify(currentSchema, null, 2)}

当你需要执行操作时，请返回格式化的JSON响应，包含以下字段：
- tool: 要调用的工具名称
- parameters: 调用工具所需的参数
- reasoning: 为什么选择这个工具以及参数的理由

例如：
\`\`\`json
{
  "tool": "alignCenter",
  "parameters": {},
  "reasoning": "用户想要居中对齐当前选中的元素"
}
\`\`\`

请不要在JSON之外添加其他解释，只需要返回可解析的JSON结构。`;
  }
}
const aiAssistantService = new AIAssistant();

export type AiAssistantService = AIAssistant;
export default aiAssistantService;
