/**
 * MCP Canvas Tools 配置
 * 定义所有可用工具的元数据和JSON Schema
 */

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * 所有MCP工具的配置定义
 */
export const MCP_CANVAS_TOOLS: Record<string, MCPToolDefinition> = {
  // 组件操作工具
  addComponent: {
    name: 'addComponent',
    description: '在画布上添加新组件。支持设置组件类型、位置、样式和属性。',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: '组件类型，如 button, text, container, img 等',
        },
        name: {
          type: 'string',
          description: '组件显示名称',
        },
        style: {
          type: 'object',
          description: '组件样式，如 { backgroundColor: "#ff0000", fontSize: 16 }',
          properties: {
            width: { type: 'number', description: '宽度（像素）' },
            height: { type: 'number', description: '高度（像素）' },
            backgroundColor: { type: 'string', description: '背景颜色' },
            color: { type: 'string', description: '文字颜色' },
            fontSize: { type: 'number', description: '字体大小' },
            fontWeight: { type: ['string', 'number'], description: '字体粗细' },
            borderRadius: { type: 'number', description: '圆角大小' },
            padding: { type: 'string', description: '内边距' },
            margin: { type: 'string', description: '外边距' },
          },
        },
        position: {
          type: 'object',
          description: '组件位置坐标',
          properties: {
            x: { type: 'number', description: 'X坐标（像素）' },
            y: { type: 'number', description: 'Y坐标（像素）' },
          },
          required: ['x', 'y'],
        },
        parentId: {
          type: ['string', 'number'],
          description: '父容器ID，如果不指定则添加到当前选中的容器',
        },
        properties: {
          type: 'object',
          description: '组件特定属性，如按钮的文本、图片的URL等',
        },
      },
      required: ['type'],
    },
  },

  removeComponent: {
    name: 'removeComponent',
    description: '从画布上删除指定组件',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: '要删除的组件ID',
        },
      },
      required: ['id'],
    },
  },

  updateComponent: {
    name: 'updateComponent',
    description: '更新组件的属性、样式或名称',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: '要更新的组件ID',
        },
        style: {
          type: 'object',
          description: '新的样式属性，会与现有样式合并',
        },
        properties: {
          type: 'object',
          description: '新的组件属性',
        },
        name: {
          type: 'string',
          description: '新的组件名称',
        },
      },
      required: ['id'],
    },
  },

  selectComponent: {
    name: 'selectComponent',
    description: '选中指定组件。可以通过ID直接选中，或通过类型、名称等条件查找组件',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: '要选中的组件ID',
        },
        selector: {
          type: 'object',
          description: '组件选择器，用于查找组件',
          properties: {
            type: {
              type: 'string',
              description: '按组件类型查找',
            },
            name: {
              type: 'string',
              description: '按组件名称查找',
            },
            index: {
              type: 'number',
              description: '如果找到多个匹配项，选择第几个（从0开始）',
              default: 0,
            },
          },
        },
      },
    },
  },

  moveComponent: {
    name: 'moveComponent',
    description: '移动组件位置。可以指定绝对位置或相对偏移量',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: '要移动的组件ID',
        },
        position: {
          type: 'object',
          description: '新的绝对位置',
          properties: {
            x: { type: 'number', description: 'X坐标（像素）' },
            y: { type: 'number', description: 'Y坐标（像素）' },
          },
          required: ['x', 'y'],
        },
        deltaX: {
          type: 'number',
          description: 'X轴相对偏移量（像素）',
        },
        deltaY: {
          type: 'number',
          description: 'Y轴相对偏移量（像素）',
        },
      },
      required: ['id'],
    },
  },

  copyComponent: {
    name: 'copyComponent',
    description: '复制指定组件到剪贴板',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: '要复制的组件ID',
        },
      },
      required: ['id'],
    },
  },

  pasteComponent: {
    name: 'pasteComponent',
    description: '粘贴剪贴板中的组件到指定位置',
    parameters: {
      type: 'object',
      properties: {
        position: {
          type: 'object',
          description: '粘贴位置，如果不指定则使用默认位置',
          properties: {
            x: { type: 'number', description: 'X坐标（像素）' },
            y: { type: 'number', description: 'Y坐标（像素）' },
          },
          required: ['x', 'y'],
        },
      },
    },
  },

  alignCenter: {
    name: 'alignCenter',
    description: '将组件在其父容器中水平居中对齐',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: '要居中对齐的组件ID',
        },
      },
      required: ['id'],
    },
  },

  // 查询工具
  getComponentInfo: {
    name: 'getComponentInfo',
    description: '获取指定组件的详细信息，包括属性、样式、位置、子组件等',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: '组件ID',
        },
      },
      required: ['id'],
    },
  },

  getCanvasState: {
    name: 'getCanvasState',
    description: '获取当前画布状态，包括选中组件、总组件数、当前页面、撤销重做状态等',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  getPageStructure: {
    name: 'getPageStructure',
    description: '获取当前页面的完整组件结构树，包括所有组件的层级关系',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  // 历史操作工具
  undo: {
    name: 'undo',
    description: '撤销上一次操作',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  redo: {
    name: 'redo',
    description: '重做上一次撤销的操作',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};
