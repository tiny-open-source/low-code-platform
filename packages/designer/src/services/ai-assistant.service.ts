import type { MNode } from '@low-code/schema';
import { cloneDeep, debounce, merge } from 'lodash-es';
import BaseService from './base.service';
import componentListService from './component-list.service';
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
    properties?: Record<string, any>;
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
    // 添加节点工具
    this.registerTool({
      name: 'addNode',
      description: 'Add a new node to the current container',
      parameters: {
        name: {
          type: 'string',
          description: 'Name of the node to add',
          required: true,
        },
        type: {
          type: 'string',
          description: 'Type of the node to add',
          required: true,
        },
        data: {
          type: 'object',
          description: 'Data for the node to add',
          required: false,
        },
      },
      handler: async ({ name, type, data }) => {
        await designerService.add({
          name,
          type,
          ...data,
        });
        return { success: true };
      },
    });
    // 删除节点工具
    this.registerTool({
      name: 'deleteNode',
      description: 'Delete a node from the current container',
      parameters: {
        nodeId: {
          type: 'string',
          description: 'ID of the node to delete',
          required: true,
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
        await designerService.remove(node);
        return { success: true };
      },
    });
    // 选择节点工具
    this.registerTool({
      name: 'selectNode',
      description: 'Select a node with the specified ID',
      parameters: {
        nodeId: {
          type: 'string',
          description: 'ID of the node to select',
          required: true,
        },
      },
      handler: async ({ nodeId }) => {
        const node = await designerService.select(nodeId);
        await designerService.get('stage')?.select(nodeId);
        return { success: true, selectedNode: { id: node.id, type: node.type } };
      },
    });
    // 更新节点工具
    this.registerTool({
      name: 'updateNode',
      description: 'Update the configuration properties of a node with the specified ID',
      parameters: {
        nodeId: {
          type: 'string',
          description: 'ID of the node to select',
          required: true,
        },
        config: {
          type: 'object',
          properties: {
            type: { type: 'string', required: false, description: 'Node type' },
            id: { type: 'string', required: true, description: 'Node ID' },
            name: { type: 'string', required: false, description: 'Node name' },
            style: { type: 'object', required: true, description: 'Node style properties', properties: {
              position: { type: 'string', required: false, description: 'Positioning method' },
              left: { type: 'string', required: true, description: 'Left offset' },
              top: { type: 'string', required: true, description: 'Top offset' },
              width: { type: 'string', required: false, description: 'Width' },
              height: { type: 'string', required: false, description: 'Height' },
            } },
            layout: { type: 'object', required: false, description: 'Node layout properties' },
            events: { type: 'array', required: false, description: 'Node events' },
            items: { type: 'array', required: false, description: 'Child nodes' },
            created: { type: 'string', required: false, description: 'Creation time' },
          },
          description: 'Updated configuration for the node',
          required: true,
        },
      },
      handler: async ({ nodeId, config }) => {
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
        const mergedConfig = merge(node, config);
        await designerService.update(mergedConfig);
        return {
          success: true,
          message: `已将节点 ${node.id} 更新为 ${JSON.stringify(mergedConfig)}`,
        };
      },
    });
    // 居中对齐工具
    this.registerTool({
      name: 'alignCenter',
      description: 'Horizontally center-align the currently selected node or specified node',
      parameters: {
        nodeId: {
          type: 'string',
          description: 'ID of the node to center-align, uses currently selected node if not provided',
          required: true,
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
      availableComponents: componentListService.getList().map((group) => {
        return group.items.map(item => ({ text: item.text, type: item.type, data: item.data || {} }));
      }).flat(),
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
      const result = await this.executeActions(this.streamState.parsedAction);

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

      return await this.executeActions(parsedResponse);
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

  private async executeActions(parsedResponse: AIActionResponse | AIActionResponse[]) {
    if (Array.isArray(parsedResponse)) {
      for (const action of parsedResponse) {
        await this.executeAction(action);
      }
    }
    else {
      await this.executeAction(parsedResponse);
    }
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

    // 获取当前页面或画布的宽高信息
    const currentPage = designerService.get('page');
    const canvasWidth = currentPage?.style?.width || '1024';
    const canvasHeight = currentPage?.style?.height || '600';

    return `You are a powerful agentic Low-Code Platform AI Assistant.
You are pairing programming with a USER to solve their element layout task.
The task may require creating a new node, moving a node, deleting a node, modifying a node's properties, or performing a series of add, delete, change, and check tasks
Each time the USER sends a message, this information may or may not be relevant to the layout task, it is up for you to decide, and try to turn the user request into a layout task.
Your main goal is to follow the USER's instructions to perform layout tasks in each message

<context>
- Working with a low-code design platform
- Canvas dimensions: ${canvasWidth}px × ${canvasHeight}px
- Available components and current structure provided in context
</context>

<communication_guidelines>
1. Maintain professional, conversational tone.
2. Format responses in markdown with appropriate code formatting.
4. Focus on accuracy and relevance.
5. Prioritize proceeding with tasks over apologizing for unexpected results.
</communication_guidelines>

<project_context>
${JSON.stringify(currentSchema, null, 2)}
</project_context>

<available_tools>
You can call the following tools to help users design their interface and accomplish tasks:
${JSON.stringify(toolDescriptions, null, 2)}
</available_tools>

<response_format_instructions>
When addressing user layout and design requests:

1. Analyze the request and convert it to actionable operations
2. Provide response as parsable JSON with these fields:
   - "tool": Selected tool name
   - "parameters": Required parameters
   - "reasoning": Brief explanation for the action

<single_operation_format>
\`\`\`json
{
  "tool": "alignCenter",
  "parameters": {
    "nodeId": "button-123"
  },
  "reasoning": "Centering the button to improve layout balance"
}
\`\`\`
</single_operation_format>

<multiple_operation_format>
Use an array for sequential operations:
\`\`\`json
[
  {
    "tool": "selectNode",
    "parameters": {
      "nodeId": "input-456"
    },
    "reasoning": "Selecting target input field"
  },
  {
    "tool": "updateNode",
    "parameters": {
      "nodeId": "input-456",
      "config": {
        "style": {
          "width": "300",
          "height": "40"
        }
      }
    },
    "reasoning": "Applying requested dimensions"
  }
]
\`\`\`
</multiple_operation_format>
</response_format_instructions>
<best_practices>
1. Return valid JSON without extraneous text
2. Position elements within canvas boundaries (${canvasWidth}px × ${canvasHeight}px)
3. Use absolute values for style properties
4. Select nodes before modifying them
5. Break complex tasks into logical operation sequences
</best_practices>
`;
  }
}
const aiAssistantService = new AIAssistant();

export type AiAssistantService = AIAssistant;
export default aiAssistantService;
