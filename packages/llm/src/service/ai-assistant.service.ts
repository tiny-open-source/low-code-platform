import type { MNode } from '@low-code/schema';
import { componentListService, designerService } from '@low-code/designer';
import { cloneDeep, merge, throttle } from 'lodash-es';
/**
 * 大模型调用方法的响应结构
 */
interface AIActionResponse {
  // 调用的动作名称
  action: string;
  // 动作调用的参数
  parameters: Record<string, any>;
  // 调用动作的理由
  reasoning: string;
}

/**
 * 暴露给大模型的动作描述
 */
interface ActionDescription {
  // 动作名称
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
  executedActions: AIActionResponse[]; // 记录已执行的动作
  processingAction: boolean; // 标记是否正在处理动作
  lastExecutedActionId: string | null; // 上次执行的动作ID
  lastParsedLength: number; // 新增：上次解析的响应长度，用于增量解析
  parsingContext: { // 新增：解析上下文信息
    inArray: boolean;
    arrayStart: number;
    arrayDepth: number;
    objectsFound: number;
  };
}

class AIAssistant {
  private availableActionsMap = new Map<string, ActionDescription>();
  private availableActionsDescriptions: Record<string, any> = {};
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
    lastParsedLength: 0, // 初始化为0
    parsingContext: { // 初始化解析上下文
      inArray: false,
      arrayStart: -1,
      arrayDepth: 0,
      objectsFound: 0,
    },
  };

  constructor() {
    this.registerDefaultActions();
  }

  // 使用节流而非防抖，提高实时性
  private tryParseThrottle = throttle(this.tryParseStreamedJSON, 200);

  /**
   * 注册新的动作
   */
  public registerAction(action: ActionDescription) {
    this.availableActionsMap.set(action.name, action);
  }

  registerDefaultActions() {
    // 添加节点动作
    this.registerAction({
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
          description: 'Type of the node to add, e.g., "text", "button", "img", "qrcode", "overlay", "container"',
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
    // 删除节点动作
    this.registerAction({
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
    // 选择节点动作
    this.registerAction({
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
    // 更新节点动作
    this.registerAction({
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
    // 居中对齐动作
    this.registerAction({
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
   * 获取所有可用动作的描述
   */
  public getActionDescriptions(): Record<string, any> {
    if (this.availableActionsDescriptions.length > 0)
      return this.availableActionsDescriptions;
    return this.availableActionsDescriptions = Array.from(this.availableActionsMap.values()).map(action => ({
      name: action.name,
      description: action.description,
      parameters: action.parameters,
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
      && typeof obj.action === 'string'
      && this.availableActionsMap.has(obj.action);
  }

  /**
   * 生成动作的唯一标识
   */
  private generateActionId(action: AIActionResponse): string {
    // 根据动作名称和参数生成唯一标识
    return `${action.action}-${JSON.stringify(action.parameters)}`;
  }

  /**
   * 处理大模型流式响应的单个块
   */
  public processStreamChunk(chunk: string): void {
    // 更新状态
    this.state.streamingInProgress = true;
    this.state.partialResponse = chunk;
    this.streamState.partialResponse = chunk;

    // 如果响应长度显著增加才触发解析，提高性能
    const currentLength = chunk.length;
    const lastLength = this.streamState.lastParsedLength;

    if (currentLength - lastLength > 100 || currentLength < lastLength) {
      // 长度增加超过100字符或响应重置时解析
      this.tryParseThrottle();
    }
    else {
      // 否则延迟解析，降低频率
      this.tryParseThrottle();
    }
  }

  /**
   * 从可能不完整的JSON数组文本中提取有效的指令对象
   * 使用增量解析策略
   */
  private extractValidActionsFromPartialArray(text: string): AIActionResponse[] {
    try {
      // 避免重复处理已解析过的文本部分
      const startPos = Math.max(0, this.streamState.parsingContext.arrayStart);

      // 如果未找到数组起始位置，定位它
      if (startPos <= 0) {
        const arrayStart = text.indexOf('[');
        if (arrayStart === -1)
          return [];
        this.streamState.parsingContext.arrayStart = arrayStart;
        this.streamState.parsingContext.inArray = true;
      }

      // 提取数组部分
      const arrayText = text.substring(startPos);

      // 优化：使用状态机代替递归或复杂正则，提高性能
      const actionObjects: AIActionResponse[] = [];
      let objectDepth = 0;
      let inObject = false;
      let currentObject = '';
      let i = 0;

      // 从上次找到的对象位置继续
      if (this.streamState.parsingContext.objectsFound > 0) {
        // 寻找下一个对象的开始 {
        const objectStart = arrayText.indexOf('{', this.streamState.parsingContext.objectsFound);
        if (objectStart !== -1) {
          i = objectStart;
        }
      }

      // 快速扫描字符串
      for (; i < arrayText.length; i++) {
        const char = arrayText[i];

        // 对象开始
        if (char === '{') {
          objectDepth++;
          if (!inObject) {
            inObject = true;
            currentObject = '{';
          }
          else {
            currentObject += '{';
          }
          continue;
        }

        // 对象结束
        if (char === '}') {
          objectDepth--;
          currentObject += '}';

          // 一个完整对象结束
          if (objectDepth === 0 && inObject) {
            try {
              const parsedObject = JSON.parse(currentObject);
              if (this.isValidActionResponse(parsedObject)) {
                actionObjects.push(parsedObject);
                // 更新找到的对象位置
                this.streamState.parsingContext.objectsFound = i;
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

        // 数组结束标志
        if (char === ']' && !inObject) {
          this.streamState.parsingContext.inArray = false;
          break;
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
   * 高效的从文本中提取JSON对象的方法
   */
  private extractJsonObjects(text: string): string[] {
    const results: string[] = [];

    // 优先寻找代码块中的JSON
    const codeBlockRegex = /```(?:json)?\n?([\s\S]*?)\n?```/g;
    let match;
    const matchedPositions = new Set<number>();

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const jsonText = match[1].trim();
      results.push(jsonText);
      // 记录已匹配位置，避免重复处理
      matchedPositions.add(match.index);
    }

    // 然后寻找裸露的JSON对象
    // 使用非贪婪模式 + 不回溯的方式提高性能
    const jsonObjRegex = /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g;

    while ((match = jsonObjRegex.exec(text)) !== null) {
      // 检查这个位置是否已经在代码块中处理过
      let alreadyMatched = false;
      for (const pos of matchedPositions) {
        if (match.index >= pos && match.index < pos + match[0].length) {
          alreadyMatched = true;
          break;
        }
      }

      if (!alreadyMatched) {
        results.push(match[0]);
      }
    }

    return results;
  }

  /**
   * 尝试从流式数据中解析JSON并执行
   */
  private async tryParseStreamedJSON(): Promise<void> {
    if (this.streamState.complete || this.streamState.processingAction)
      return;

    try {
      const text = this.streamState.partialResponse;
      console.log('流式响应:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

      // 记录当前解析的文本长度，用于增量解析判断
      this.streamState.lastParsedLength = text.length;

      // 跟踪已处理的动作ID，用于去重
      const processedActionIds = new Set(
        this.streamState.executedActions.map(action => this.generateActionId(action)),
      );

      // 方法1: 快速尝试解析为完整的指令数组 (最常见的成功情形)
      if (text.includes('[') && text.includes(']')) {
        try {
          // 使用更精确的正则，提高命中率并减少错误解析
          const arrayRegex = /\[\s*\{[\s\S]*?\}\s*\]/;
          const arrayMatch = text.match(arrayRegex);

          if (arrayMatch) {
            const actionArray = JSON.parse(arrayMatch[0]);
            if (Array.isArray(actionArray) && actionArray.length > 0) {
              console.log('检测到完整指令数组:', actionArray.length);

              // 批量验证，减少循环中的判断
              const validActions = actionArray.filter(this.isValidActionResponse.bind(this));

              // 顺序处理数组中的每个动作
              for (const action of validActions) {
                const actionId = this.generateActionId(action);

                // 检查是否已执行过
                if (processedActionIds.has(actionId)) {
                  continue;
                }

                await this.executeAndTrackAction(action);
                processedActionIds.add(actionId);
              }

              // 成功解析完整数组，重置解析上下文
              this.streamState.parsingContext = {
                inArray: false,
                arrayStart: -1,
                arrayDepth: 0,
                objectsFound: 0,
              };

              return; // 成功处理了完整数组，退出
            }
          }
        }
        catch {
          // 继续尝试其他方法
        }
      }

      // 方法2: 增量提取部分数组中的指令
      if (text.includes('[') && text.includes('{')) {
        try {
          const partialActions = this.extractValidActionsFromPartialArray(text);

          if (partialActions.length > 0) {
            console.log('从部分数组中提取到有效指令:', partialActions.length);

            // 批量处理提取出的动作
            for (const action of partialActions) {
              const actionId = this.generateActionId(action);

              // 去重检查
              if (processedActionIds.has(actionId)) {
                continue;
              }

              await this.executeAndTrackAction(action);
              processedActionIds.add(actionId);
            }

            return; // 处理成功，退出
          }
        }
        catch {
          // 继续尝试其他方法
        }
      }

      // 方法3: 处理独立的JSON对象
      try {
        // 使用优化后的提取方法
        const jsonObjects = this.extractJsonObjects(text);

        if (jsonObjects.length > 0) {
          for (const jsonText of jsonObjects) {
            try {
              const parsed = JSON.parse(jsonText);

              if (this.isValidActionResponse(parsed)) {
                const actionId = this.generateActionId(parsed);

                // 去重检查
                if (processedActionIds.has(actionId)) {
                  continue;
                }

                await this.executeAndTrackAction(parsed);
                processedActionIds.add(actionId);
              }
            }
            catch {
              // 尝试修复并重解析
              try {
                const fixedJson = this.attemptToFixJson(jsonText);
                const parsed = JSON.parse(fixedJson);

                if (this.isValidActionResponse(parsed)) {
                  const actionId = this.generateActionId(parsed);

                  if (processedActionIds.has(actionId)) {
                    continue;
                  }

                  await this.executeAndTrackAction(parsed);
                  processedActionIds.add(actionId);
                }
              }
              catch {
                // 忽略解析失败
              }
            }
          }
        }
      }
      catch {
        // 忽略提取错误
      }
    }
    catch (err) {
      // 处理总体错误，但不影响后续解析
      console.log('处理流数据出错，将在下次尝试:', err);
    }
  }

  /**
   * 执行动作并记录到已执行列表
   */
  private async executeAndTrackAction(action: AIActionResponse): Promise<any> {
    // 标记正在处理状态
    this.streamState.processingAction = true;

    try {
      console.log('执行动作:', action.action);
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

    // 重置解析上下文，为下一次解析准备
    this.streamState.parsingContext = {
      inArray: false,
      arrayStart: -1,
      arrayDepth: 0,
      objectsFound: 0,
    };
    this.streamState.lastParsedLength = 0;

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
        lastParsedLength: 0,
        parsingContext: {
          inArray: false,
          arrayStart: -1,
          arrayDepth: 0,
          objectsFound: 0,
        },
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
          lastParsedLength: 0,
          parsingContext: {
            inArray: false,
            arrayStart: -1,
            arrayDepth: 0,
            objectsFound: 0,
          },
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
    if (!parsedResponse.action) {
      throw new Error('大模型响应缺少动作名称');
    }

    // 查找匹配的动作
    const action = this.availableActionsMap.get(parsedResponse.action);

    if (!action) {
      throw new Error(`未找到名为 ${parsedResponse.action} 的动作`);
    }
    console.log(parsedResponse);

    // 调用动作处理函数
    const result = await action.handler(parsedResponse.parameters || {});

    this.state.lastResult = {
      actionName: action.name,
      parameters: parsedResponse.parameters,
      result,
      reasoning: parsedResponse.reasoning,
    };

    return result;
  }
}
const aiAssistantService = new AIAssistant();

export type AiAssistantService = AIAssistant;
export default aiAssistantService;

export const DefaultMainModelPrompt = `Answer the user's request using the relevant directive(s), if they are available.  Check that all the required parameters for each directive call are provided or can reasonably be inferred from context. IF there are no relevant tools or there are missing values for required parameters, ask the user to supply these values;  otherwise proceed with the directive(s) calls.

<identity>
You are an ai low-code instruction output assistant.
Follow the user's requirements carefully & to the letter.
If you're asked to generate something completely unrelated to the directive(s) output, only respond with "Sorry, I can't assist with that."
</identity>

<instructions>
You are a highly sophisticated automated instruction output agent with expert DOM-like tree structure understanding and creation.
Your main task is to execute the output layout directive(s) as instructed by the user.
Users may ask you to perform tasks that modify parts of the current low code artifact. User may not provide complete information such as styles, specific element location information, etc. If you can't retrieve useful information from the context, be creative and remember to output only the instructions.
</instructions>

<directiveUseInstructions>
Be sure to fully read the description properties of the directive provided before executing them.
When using a directive, follow the json schema very carefully and make sure to include ALL required properties.
Always output valid JSON when using a directive.
Never use any directive that does not exist.
When you handle a user's layout design request.
1. You need to analyze each request and translate it into actionable directive.
2. Provide responses as compressed JSON without extra spaces or line breaks.
3. Your response MUST be parsable JSON with these fields:
- "tool": Selected tool name.
- "parameters": Required parameters.

<singleOperationFormatExample>
For single directive, use a single object format.
\`\`\`json
{"tool":"alignCenter","parameters":{"nodeId":"button-123"}}
\`\`\`
</singleOperationFormatExample>

<multipleOperationFormatExample>
For multiple directives, use an ARRAY format.
\`\`\`json
[{"tool":"alignCenter","parameters":{"nodeId":"button-123"}},{"tool":"addNode","parameters":{"nodeId":"text-456"}}]
\`\`\`
</multipleOperationFormatExample>

</directiveUseInstructions>

<availableDirectives>
You can use the following directives:
{{toolDescriptions}}
</availableDirectives>

<projectContext>
{{currentSchema}}
</projectContext>

<reminder>
Just return valid JSON with no extra text.
Position elements within canvas boundaries ({{canvasWidth}}px × {{canvasHeight}}px).
Use absolute values for style properties.
Select node before modifying it.
DO NOT include any formatting or indentation in your JSON output.
</reminder>
`;
export const DefaultVisionModelPrompt = `
# UI Visual Recognition and Component Creation Guide

When analyzing UI design images, translate visual elements into low-code components following the schema structure below. All measurements reference a 1024×600px canvas.

## Component Types
The ecosystem supports container, img, qrcode, text, button, and overlay components.

## Component Schema
Components follow this structure:
\`\`\`json
{
  id: '[unique_id]',
  name: '[name]',
  type: 'app',
  items: [
    {
      type: 'page',
      id: '[page_id]',
      name: '[page_name]',
      layout: 'absolute',
      style: { position: 'absolute', width, height, backgroundColor, etc. },
      items: [
        {
          id: '[element_id]',
          type: '[element_type]',
          name: '[element_name]',
          style: { position: 'absolute', left, top, width, height, etc. },
          // Element-specific properties:
          url: '[url]',        // For qrcode, img
          text: '[text_content]', // For text, button
        }
      ],
    },
  ],
}
\`\`\`

## Creation Instructions
For each visual element:

1. Start commands with "Select the page" or appropriate container
2. Follow with "Add a [element_type]"
3. Include "Update the [element_type]" with positioning and properties
4. Use absolute positioning (left, top, width, height) based on 1024×600px reference
5. Number each instruction step

## Example - Single Element
\`\`\`
1. Select page
2. Add text
3. update text, style={left:100,top:200,width:300,height:50,fontSize:18,fontWeight:'bold',color:'#2a2a2a',display: 'flex',alignItems:'center',justifyContent:'center'}
4. update text, text="欢迎使用我们的产品"
\`\`\`

## Example - Multiple Elements
\`\`\`
1. Select page
2. Add button
3. update button style={left:100,top:200,width:300,height:50,fontSize:18,fontWeight:'bold',color:'#2a2a2a'}

4. Select page
5. Add img
6. Update img, style={left:50,top:100,width:200,height:150,objectFit:'cover',borderRadius:8}
7. Update img, url="https://example.com/image.jpg"
\`\`\`

## Output Requirements
- Generate only numbered instruction steps
- Do not include any explanations, comments, or additional text
- Always select the correct container first, as element positions are relative to their parent container
- When uncertain about container hierarchy, default to selecting the page
- Only output the creation instructions - nothing else
- When updating an element, it refers to the most recently added element.
`;
