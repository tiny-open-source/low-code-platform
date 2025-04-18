import type { MNode } from '@low-code/schema';
import { cloneDeep, merge, throttle } from 'lodash-es';
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
  executedActions: AIActionResponse[]; // 新增：记录已执行的动作
  processingAction: boolean; // 新增：标记是否正在处理动作
  lastExecutedActionId: string | null; // 新增：上次执行的动作ID
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
    executedActionsCount: 0, // 新增：已执行的动作数量
  });

  private streamState: StreamState = {
    complete: false,
    partialResponse: '',
    parsedAction: null,
    error: null,
    executedActions: [], // 初始化为空数组
    processingAction: false, // 初始化为非处理状态
    lastExecutedActionId: null, // 初始化为空
  };

  constructor() {
    super([]);

    this.registerDefaultTools();
  }

  // 节流处理器，用于流处理中尝试解析JSON
  private tryParseThrottle = throttle(this.tryParseStreamedJSON, 300);

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
        console.log(nodeId);

        // const node = await designerService.select(nodeId);
        // await designerService.get('stage')?.select(nodeId);
        // return { success: true, selectedNode: { id: node.id, type: node.type } };
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
            text: {
              type: 'string',
              description: 'Node text content',
              required: false,
            },
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
            layout: { type: 'object', required: true, description: 'Node layout properties, absolute or relative' },
            events: { type: 'array', required: false, description: 'Node events' },
            items: { type: 'array', required: false, description: 'Child nodes' },
            created: { type: 'string', required: false, description: 'Creation time' },
          },

          description: 'Updated configuration for the node',
          required: true,
        },
      },
      handler: async ({ nodeId, config }) => {
        console.log(nodeId);
        // let node: MNode;

        // if (nodeId) {
        //   node = designerService.getNodeById(nodeId) as MNode;
        //   if (!node) {
        //     throw new Error(`找不到ID为${nodeId}的节点`);
        //   }
        // }
        // else {
        //   node = designerService.get('node') as MNode;
        //   if (!node) {
        //     throw new Error('当前没有选中节点');
        //   }
        // }
        const node = designerService.get('node');
        if (!node)
          return { success: false, message: '当前没有选中节点' };
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
   * 生成动作的唯一标识
   */
  private generateActionId(action: AIActionResponse): string {
    // 根据工具名称和参数生成唯一标识
    return `${action.tool}-${JSON.stringify(action.parameters)}`;
  }

  /**
   * 处理大模型流式响应的单个块
   */
  public processStreamChunk(chunk: string): void {
    // 更新状态
    this.state.streamingInProgress = true;
    this.state.partialResponse = chunk;
    this.streamState.partialResponse = chunk;
    // 尝试解析（节流处理）
    this.tryParseThrottle();
  }

  /**
   * 从可能不完整的JSON数组文本中提取有效的指令对象
   */
  private extractValidActionsFromPartialArray(text: string): AIActionResponse[] {
    try {
      // 清理文本，移除代码块标记
      let cleanText = text.replace(/```json|```/g, '').trim();

      // 确保文本以 [ 开始
      const startIndex = cleanText.indexOf('[');
      if (startIndex === -1)
        return [];
      cleanText = cleanText.substring(startIndex);

      // 提取所有可能的完整JSON对象
      const actionObjects: AIActionResponse[] = [];
      let depth = 0;
      let currentObject = '';
      let inObject = false;

      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];

        // 开始捕获对象
        if (char === '{') {
          depth++;
          inObject = true;
          currentObject += char;
          continue;
        }

        // 结束捕获对象
        if (char === '}') {
          depth--;
          currentObject += char;

          // 对象完成
          if (depth === 0 && inObject) {
            try {
              const parsedObject = JSON.parse(currentObject);
              if (this.isValidActionResponse(parsedObject)) {
                actionObjects.push(parsedObject);
              }
            }
            catch {
              // 忽略无效对象
            }
            currentObject = '';
            inObject = false;
          }
          continue;
        }

        // 在对象内部
        if (inObject) {
          currentObject += char;
        }
      }

      return actionObjects;
    }
    catch (e) {
      console.error('从部分数组提取动作时出错:', e);
      return [];
    }
  }

  /**
   * 尝试从流式数据中解析JSON并执行
   */
  private async tryParseStreamedJSON(): Promise<void> {
    if (this.streamState.complete || this.streamState.processingAction)
      return;
    try {
      const text = this.streamState.partialResponse;
      console.log('流式响应:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

      // 跟踪已处理的动作ID，用于去重
      const processedActionIds = this.streamState.executedActions.map(action =>
        this.generateActionId(action),
      );

      // 方法1: 尝试解析为完整的指令数组
      try {
        const fullText = text.replace(/```json|```/g, '').trim();
        const arrayMatch = fullText.match(/\[\s*\{[\s\S]*\}\s*\]/);

        if (arrayMatch) {
          const actionArray = JSON.parse(arrayMatch[0]);
          if (Array.isArray(actionArray)) {
            console.log('检测到完整指令数组:', actionArray.length);

            // 顺序处理数组中的每个动作
            for (const action of actionArray) {
              if (this.isValidActionResponse(action)) {
                const actionId = this.generateActionId(action);

                // 检查是否已执行过
                if (processedActionIds.includes(actionId)) {
                  console.log('跳过重复动作:', actionId);
                  continue;
                }

                await this.executeAndTrackAction(action);
                processedActionIds.push(actionId);
              }
            }
            return; // 成功处理了完整数组，退出
          }
        }
      }
      catch (err) {
        console.log('完整数组解析失败:', err);
      }

      // 方法2: 尝试从不完整数组中提取有效指令
      try {
        // 检查是否存在数组开始标记 [
        if (text.includes('[') && text.includes('{')) {
          const partialActions = this.extractValidActionsFromPartialArray(text);

          if (partialActions.length > 0) {
            console.log('从部分数组中提取到有效指令:', partialActions.length);

            for (const action of partialActions) {
              const actionId = this.generateActionId(action);

              // 检查是否已执行过
              if (processedActionIds.includes(actionId)) {
                continue;
              }

              await this.executeAndTrackAction(action);
              processedActionIds.push(actionId);
            }
            return; // 成功处理了部分数组中的指令，退出
          }
        }
      }
      catch (err) {
        console.log('部分数组提取失败:', err);
      }

      // 方法3: 查找独立的JSON块
      const jsonMatches = Array.from(text.matchAll(/```json\n([\s\S]*?)\n```/g))
        || Array.from(text.matchAll(/```\n([\s\S]*?)\n```/g))
        || Array.from(text.matchAll(/\{[\s\S]*?\}/g));

      for (const match of jsonMatches) {
        try {
          const jsonText = match[1] || match[0];
          const parsed = JSON.parse(jsonText);

          if (this.isValidActionResponse(parsed)) {
            const actionId = this.generateActionId(parsed);

            // 检查是否已执行过
            if (processedActionIds.includes(actionId)) {
              console.log('跳过重复独立指令:', actionId);
              continue;
            }

            await this.executeAndTrackAction(parsed);
            processedActionIds.push(actionId);
          }
        }
        catch (err) {
          console.log('独立JSON解析错误:', err);
        }
      }
    }
    catch (err) {
      console.log('处理流数据总体错误:', err);
    }
  }

  /**
   * 执行动作并记录到已执行列表
   */
  private async executeAndTrackAction(action: AIActionResponse): Promise<any> {
    // 标记正在处理状态
    this.streamState.processingAction = true;

    try {
      console.log('执行动作:', action.tool);
      const result = await this.executeAction(action);
      console.log('动作执行结果:', result);

      // 记录已执行动作
      this.streamState.executedActions.push(action);
      this.streamState.lastExecutedActionId = this.generateActionId(action);
      this.state.executedActionsCount = this.streamState.executedActions.length;

      return result;
    }
    catch (err) {
      console.error('执行动作失败:', err);
      this.streamState.error = err instanceof Error ? err.message : String(err);
      throw err;
    }
    finally {
      this.streamState.processingAction = false;
    }
  }

  /**
   * 标记流式响应结束，执行最终操作
   */
  public async finalizeStream(): Promise<any> {
    this.state.streamingInProgress = false;

    // 确保最后一次解析尝试
    this.tryParseThrottle.flush();

    // 等待任何正在进行的动作执行完成
    while (this.streamState.processingAction) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 如果已有执行过的动作，则返回最后一个动作的结果
    if (this.streamState.executedActions.length > 0) {
      const lastAction = this.streamState.executedActions[this.streamState.executedActions.length - 1];
      const result = {
        success: true,
        executedActionsCount: this.streamState.executedActions.length,
        lastAction,
      };

      // 重置流状态，但保留已执行的动作列表以供参考
      const executedActions = [...this.streamState.executedActions];
      this.streamState = {
        complete: false,
        partialResponse: '',
        parsedAction: null,
        error: null,
        executedActions: [],
        processingAction: false,
        lastExecutedActionId: null,
      };

      return { ...result, allExecutedActions: executedActions };
    }
    else {
      // 无有效响应，尝试最后一次解析或返回错误
      try {
        return await this.processModelResponse('', this.state.partialResponse);
      }
      catch {
        this.streamState = {
          complete: false,
          partialResponse: '',
          parsedAction: null,
          error: null,
          executedActions: [],
          processingAction: false,
          lastExecutedActionId: null,
        };
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
      try {
        // 尝试解析为指令数组
        const arrayMatch = modelResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          const actionArray = JSON.parse(arrayMatch[0]);

          if (Array.isArray(actionArray)) {
            console.log('检测到指令数组:', actionArray.length);
            const results = [];

            // 顺序执行每个动作
            for (const action of actionArray) {
              if (this.isValidActionResponse(action)) {
                const result = await this.executeAction(action);
                results.push(result);
              }
            }

            return {
              success: true,
              results,
              message: `成功执行了${results.length}个操作`,
            };
          }
        }

        // 如果没有检测到数组，尝试提取部分指令
        const partialActions = this.extractValidActionsFromPartialArray(modelResponse);
        if (partialActions.length > 0) {
          console.log('从响应中提取到部分指令:', partialActions.length);
          const results = [];

          for (const action of partialActions) {
            if (this.isValidActionResponse(action)) {
              const result = await this.executeAction(action);
              results.push(result);
            }
          }

          return {
            success: true,
            results,
            message: `成功从部分响应中执行了${results.length}个操作`,
          };
        }
      }
      catch (err) {
        console.log('数组解析失败，尝试单个指令:', err);
      }

      // 单个指令解析逻辑（原有逻辑）
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

    // 获取当前页面或画布的宽高信息
    const currentPage = designerService.get('page');
    const canvasWidth = currentPage?.style?.width || '1024';
    const canvasHeight = currentPage?.style?.height || '600';

    return `You are a powerful agentic Low-Code Platform AI Assistant.
The task may require creating a new node, moving a node, deleting a node, modifying a node's properties, or performing a series of add, delete, change, and check tasks.
Your main goal is to follow the USER's instructions to perform layout tasks in each message.

<context>
1. Working with a low-code design platform.
2. Canvas dimensions: ${canvasWidth}px × ${canvasHeight}px.
3. Available components and current structure provided in context.
</context>

<communication_guidelines>
1. Format responses in markdown with appropriate code formatting.
2. Focus on accuracy and relevance.
3. Prioritize proceeding with tasks over apologizing for unexpected results.
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
1. Analyze the request and convert it to actionable operations.
2. Provide responses as compressed JSON without extra spaces or line breaks.
3. Your response must be parsable JSON with these fields:
   - "tool": Selected tool name.
   - "parameters": Required parameters.

<single_operation_format>
\`\`\`json
{"tool":"alignCenter","parameters":{"nodeId":"button-123"}}
\`\`\`
</single_operation_format>

<multiple_operation_format>
For multiple, use an ARRAY format.
Each operation in the array will be processed in sequence.
</multiple_operation_format>
</response_format_instructions>

<best_practices>
1. Return valid JSON without extraneous text
2. Position elements within canvas boundaries (${canvasWidth}px × ${canvasHeight}px)
3. Use absolute values for style properties
4. Select nodes before modifying them
5. Break complex tasks into logical operation sequences
6. For multiple operations, always use the array format for reliable processing
7. DO NOT include any formatting or indentation in your JSON output
</best_practices>
`;
  }
}
const aiAssistantService = new AIAssistant();

export type AiAssistantService = AIAssistant;
export default aiAssistantService;
