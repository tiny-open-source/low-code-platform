import type { AddMNode } from '@low-code/designer';
import type { MNode } from 'packages/schema/types';
import { componentListService, designerService } from '@low-code/designer';
import { merge } from 'lodash-es';

interface ToolDescription {
  // 工具名称
  name: string;
  // 实际调用的函数
  handler: (params: any) => Promise<any>;
}

interface ParsedToolCall {
  toolName: string;
  params: Record<string, any>;
}

class AIAssistant {
  private availableActionsMap = new Map<string, ToolDescription>();
  public state = reactive({
    isProcessing: false,
  });

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * 注册新的工具
   */
  public registerTool(action: ToolDescription) {
    this.availableActionsMap.set(action.name, action);
  }

  registerDefaultTools() {
    // 获取页面宽高
    this.registerTool({
      name: 'get_page_size',
      handler: async () => {
        const page = designerService.get('page');
        const { width = '1024', height = '600' } = page!.style! || {} as Record<string, any>;
        return { width, height };
      },
    });
    // 获取可用节点配置
    this.registerTool({
      name: 'get_available_node_configs',
      handler: async () => {
        return [{
          name: 'id',
          describe: '节点 ID',
          type: 'string',
        }, {
          name: 'type',
          describe: '节点类型',
          type: 'string',
        }, {
          name: 'name',
          describe: '节点名称',
          type: 'string',
        }, {
          name: 'title',
          describe: '节点标题',
          type: 'string',
        }, {
          name: 'style',
          describe: '节点样式',
          type: 'object',
        }, {
          name: 'items',
          describe: '子节点列表',
          type: 'array',
        }, {
          name: 'text',
          describe: '节点文本内容',
          type: 'string',
        }];
      },
    });
    // 根据id获取节点配置
    this.registerTool({
      name: 'get_node_by_id',
      handler: async ({ id }: { id: string }) => {
        const node = designerService.getNodeById(id);
        if (node) {
          return node;
        }
        return null;
      },
    });
    // 获取节点树
    this.registerTool({
      name: 'get_page_dsl_structure',
      handler: async () => {
        const root = designerService.get('root');
        if (root) {
          return root;
        }
        return null;
      },
    });
    // 获取节点树
    this.registerTool({
      name: 'get_available_components',
      handler: async () => {
        const list = componentListService.getList().map((group) => {
          return group.items.map(item => ({ text: item.text, type: item.type, data: item.data || {} }));
        }).flat();
        if (list) {
          return list;
        }
        return null;
      },
    });
    // 获取节点树
    this.registerTool({
      name: 'do_action',
      handler: async ({ action, id, config }: { action: 'add_node' | 'remove_node' | 'update_node'; id?: string; config?: AddMNode | MNode[] }) => {
        if (action === 'add_node') {
          if (id) {
            const node = designerService.getNodeById(id);
            if (node && node.items) {
              const newNode = await designerService.add(config!, node as any);
              return newNode;
            }
            return 'error: "节点不存在"';
          }
          else {
            const node = designerService.get('node');
            const page = designerService.get('page');
            if (node && node.items) {
              const newNode = await designerService.add(config!, node as any);
              return newNode;
            }
            else {
              const newNode = await designerService.add(config!, page as any);
              return newNode;
            }
          }
        }
        else if (action === 'remove_node') {
          if (id) {
            const node = designerService.getNodeById(id);
            if (node && node.items) {
              await designerService.remove(node as any);
            }
          }
        }
        else if (action === 'update_node') {
          const node = isDefined(id) ? designerService.getNodeById(id) : designerService.get('node');
          if (node) {
            const mergedConfig = merge(node, config || {});
            await designerService.update(mergedConfig);
          }
        }
        return 'done';
      },
    });
  }

  /**
   * 处理大模型单条消息响应结果，响应中可能会包含一个工具调用请求
   * 工具调用使用xml格式，例如：
   *  <tool_name>
   *    <parameter1_name>value1</parameter1_name>
   *    <parameter2_name>value2</parameter2_name>
   *    ...
   *  </tool_name>
   * 工具调用结果可能会被附加到用户的消息中自动发送给大模型以便进行下一步的处理
   */
  public async processResponse(response: string): Promise<string | null> {
    try {
      // 解析响应中的工具调用
      const parsedTool = this.parseToolCall(response);
      console.log('[tool]', parsedTool);
      if (parsedTool) {
        this.state.isProcessing = true;
        const result = await this.executeTool(parsedTool.toolName, parsedTool.params);
        this.state.isProcessing = false;

        // 返回工具执行结果，可以附加到消息中
        return JSON.stringify(result);
      }
    }
    catch (error) {
      console.error('处理工具调用失败:', error);
      this.state.isProcessing = false;
    }

    return null;
  }

  /**
   * 解析XML格式的工具调用
   */
  private parseToolCall(response: string): ParsedToolCall | null {
    // 寻找工具调用的XML格式
    const toolPattern = /<(\w+)>([\s\S]*?)<\/\1>/;
    const match = response.match(toolPattern);

    if (!match)
      return null;

    const toolName = match[1];
    const paramsContent = match[2];

    // 确认工具是否已注册
    if (!this.availableActionsMap.has(toolName)) {
      console.warn(`未找到名为 ${toolName} 的工具`);
      return null;
    }

    // 解析参数
    const params: Record<string, any> = {};
    const paramPattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let paramMatch;

    while ((paramMatch = paramPattern.exec(paramsContent)) !== null) {
      const paramName = paramMatch[1];
      const paramValue = paramMatch[2].trim();

      // 尝试解析JSON值，如果失败则保留原始字符串
      try {
        params[paramName] = JSON.parse(paramValue);
      }
      catch {
        params[paramName] = paramValue;
      }
    }

    return { toolName, params };
  }

  /**
   * 执行解析后的工具
   */
  private async executeTool(toolName: string, params: any): Promise<any> {
    const action = this.availableActionsMap.get(toolName);
    if (!action) {
      throw new Error(`未找到名为 ${toolName} 的工具`);
    }

    try {
      return await action.handler(params);
    }
    catch (error) {
      console.error(`执行工具 ${toolName} 失败:`, error);
      throw error;
    }
  }
}
const aiAssistantService = new AIAssistant();

export type AiAssistantService = AIAssistant;
export default aiAssistantService;
