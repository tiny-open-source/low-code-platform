/**
 * 工具调用处理工具
 */

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallHandler {
  [toolName: string]: (args: any) => Promise<string> | string;
}

/**
 * 工具调用聚合器
 * 用于将流式响应中分散的工具调用信息聚合成完整的工具调用
 */
export class ToolCallAggregator {
  private toolCalls: (ToolCall | null)[] = [];
  private handlers: ToolCallHandler = {};

  constructor(handlers: ToolCallHandler = {}) {
    this.handlers = handlers;
  }

  /**
   * 注册工具处理函数
   * @param toolName 工具名称
   * @param handler 处理函数
   */
  registerHandler(toolName: string, handler: (args: any) => Promise<string> | string) {
    this.handlers[toolName] = handler;
  }

  /**
   * 处理工具调用块（仅聚合，不执行）
   * @param toolCallChunks 工具调用块数组
   * @returns 是否有完整的工具调用可以执行
   */
  processToolCallChunks(toolCallChunks: any[]): boolean {
    for (const toolCall of toolCallChunks) {
      const index = toolCall.index || 0;

      // 初始化或获取当前工具调用
      if (!this.toolCalls[index]) {
        this.toolCalls[index] = {
          id: toolCall.id || `tool_call_${index}_${Date.now()}`, // 确保 ID 不为空
          type: toolCall.type || 'function',
          function: {
            name: toolCall.function?.name || '',
            arguments: toolCall.function?.arguments || '',
          },
        };
      }
      else {
        const current = this.toolCalls[index]!;

        // 累积函数参数
        if (toolCall.function?.arguments) {
          current.function.arguments += toolCall.function.arguments;
        }

        // 更新其他字段
        if (toolCall.id && !current.id)
          current.id = toolCall.id;
        if (toolCall.type)
          current.type = toolCall.type;
        if (toolCall.function?.name)
          current.function.name = toolCall.function.name;
      }
    }

    // 检查是否有完整的工具调用可以执行
    const readyToolCalls = this.getReadyToolCalls();
    return readyToolCalls.length > 0;
  }

  /**
   * 获取准备好的工具调用
   */
  getReadyToolCalls(): ToolCall[] {
    return this.toolCalls.filter((tc): tc is ToolCall =>
      tc !== null
      && tc.id !== '' // 确保 ID 不为空
      && tc.function?.name !== ''
      && tc.function?.arguments !== ''
      && this.isValidJSON(tc.function.arguments)
      && !(tc as any)._executed,
    );
  }

  /**
   * 执行所有准备好的工具调用
   * @returns 工具执行结果数组
   */
  async executeReadyToolCalls(): Promise<{ toolCall: ToolCall; result: string }[]> {
    const readyToolCalls = this.getReadyToolCalls();
    const results: { toolCall: ToolCall; result: string }[] = [];

    for (const toolCall of readyToolCalls) {
      try {
        const result = await this.executeToolCall(toolCall);
        if (result) {
          results.push({ toolCall, result });
          // 标记为已执行
          (toolCall as any)._executed = true;
        }
      }
      catch (error) {
        console.error(`执行工具 ${toolCall.function.name} 失败:`, error);
        const errorResult = `❌ 工具调用失败: ${error}`;
        results.push({ toolCall, result: errorResult });
        // 即使失败也标记为已执行，避免重复尝试
        (toolCall as any)._executed = true;
      }
    }

    return results;
  }

  /**
   * 执行工具调用
   * @param toolCall 工具调用对象
   * @returns 执行结果
   */
  private async executeToolCall(toolCall: ToolCall): Promise<string | null> {
    const { name, arguments: argsStr } = toolCall.function;

    try {
      console.log(`🔧 准备执行工具: ${name}, 参数: ${argsStr}`);

      const args = JSON.parse(argsStr);
      console.log(`🛠️ 调用工具: ${name}`, args);

      const handler = this.handlers[name];
      if (!handler) {
        console.warn(`未找到工具处理函数: ${name}`);
        return `⚠️ 未知工具: ${name}`;
      }

      const result = await handler(args);
      console.log(`✅ 工具执行结果:`, result);
      return result;
    }
    catch (error) {
      console.error('解析工具调用参数失败:', error, argsStr);
      throw new Error(`参数解析失败: ${error}`);
    }
  }

  /**
   * 验证字符串是否为有效的 JSON
   * @param str 要验证的字符串
   * @returns 是否为有效 JSON
   */
  private isValidJSON(str: string): boolean {
    if (!str || str.trim() === '') {
      return false;
    }

    try {
      JSON.parse(str);
      return true;
    }
    catch {
      return false;
    }
  }

  /**
   * 重置工具调用状态
   */
  reset() {
    this.toolCalls = [];
  }

  /**
   * 获取当前工具调用状态
   */
  getToolCalls() {
    return this.toolCalls.filter((tc): tc is ToolCall => tc !== null);
  }

  /**
   * 获取当前工具调用状态（用于调试）
   */
  getDebugInfo() {
    return this.toolCalls.map((tc, index) => ({
      index,
      toolCall: tc,
      isComplete: tc !== null && tc.function?.name !== '' && tc.function?.arguments !== '',
      isValidJSON: tc !== null && this.isValidJSON(tc.function?.arguments || ''),
      hasExecuted: tc ? (tc as any)._executed : false,
    }));
  }
}

/**
 * 默认工具处理函数
 */
export const defaultToolHandlers: ToolCallHandler = {
  get_weather: async (args: { location: string }) => {
    const { location } = args;
    // 模拟天气查询
    const weatherData = {
      北京: '晴天，温度25°C，湿度60%',
      上海: '多云，温度28°C，湿度70%',
      广州: '雨天，温度30°C，湿度80%',
      深圳: '晴天，温度32°C，湿度65%',
    };

    const weather = weatherData[location as keyof typeof weatherData] || `${location}的天气：晴天，温度25°C`;
    return `🌤️ ${weather}`;
  },

  get_location: async () => {
    // 模拟获取用户位置
    const locations = ['北京', '上海', '广州', '深圳'];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    return `📍 您当前的位置是：${randomLocation}`;
  },

  // 可以添加更多工具处理函数
  get_time: async () => {
    const now = new Date();
    return `🕐 当前时间：${now.toLocaleString('zh-CN')}`;
  },

  calculate: async (args: { expression: string }) => {
    try {
      // 简单的数学计算（生产环境中应该使用更安全的计算方法）
      // eslint-disable-next-line no-eval
      const result = eval(args.expression);
      return `🧮 计算结果：${args.expression} = ${result}`;
    }
    catch (error) {
      return `❌ 计算错误：${error}`;
    }
  },
};
