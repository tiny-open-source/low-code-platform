# MCP Canvas Tools

MCP Canvas Tools 是一个为大模型提供的画布操作工具集，允许AI通过标准化的接口操作低代码设计器。

## 概述

MCP (Model Context Protocol) Canvas Tools 将 Designer 服务的核心功能封装为结构化的工具，提供：

- 🎨 **组件操作**：添加、删除、更新、移动组件
- 🎯 **选择控制**：智能选择和高亮组件
- 📋 **剪贴板操作**：复制和粘贴组件
- 📊 **状态查询**：获取画布状态和组件信息
- ↩️ **历史管理**：撤销和重做操作
- 🔒 **权限控制**：分级权限管理
- 🔄 **批量操作**：支持批量执行多个操作

## 快速开始

### 基础使用

```typescript
import { mcpCanvasTools } from '@low-code/designer';

// 添加一个按钮组件
const result = await mcpCanvasTools.addComponent({
  type: 'button',
  name: '提交按钮',
  position: { x: 100, y: 100 },
  style: {
    width: 120,
    height: 40,
    backgroundColor: '#007bff',
    color: '#ffffff',
  },
  properties: {
    text: '提交',
  },
});

if (result.success) {
  console.log('组件创建成功:', result.data);
}
```

### 权限控制

```typescript
import { MCPCanvasTools, ToolPermissionLevel } from '@low-code/designer';

// 自定义权限检查器
class CustomPermissionChecker {
  hasPermission(toolName: string, requiredLevel: ToolPermissionLevel): boolean {
    // 实现自定义权限逻辑
    return this.userHasPermission(toolName, requiredLevel);
  }
}

const canvasTools = new MCPCanvasTools(new CustomPermissionChecker());
```

## 工具分类

### 组件操作工具

#### addComponent - 添加组件
```typescript
await mcpCanvasTools.addComponent({
  type: 'text',              // 组件类型
  name: '标题文本',           // 显示名称
  position: { x: 50, y: 50 }, // 位置坐标
  style: {                   // 样式配置
    fontSize: 16,
    color: '#333333',
  },
  properties: {              // 组件属性
    text: '文本内容',
  },
  parentId: 'container_1',   // 父容器ID（可选）
});
```

#### updateComponent - 更新组件
```typescript
await mcpCanvasTools.updateComponent({
  id: 'component_1',
  style: {
    fontSize: 24,
    color: '#ff0000',
  },
  name: '新名称',
});
```

#### removeComponent - 删除组件
```typescript
await mcpCanvasTools.removeComponent('component_1');
```

### 选择和导航工具

#### selectComponent - 选择组件
```typescript
// 通过ID选择
await mcpCanvasTools.selectComponent({
  id: 'component_1'
});

// 通过选择器选择
await mcpCanvasTools.selectComponent({
  selector: {
    type: 'button',    // 按类型查找
    name: '提交按钮',   // 按名称查找
    index: 0,         // 选择第几个匹配项
  }
});
```

### 布局工具

#### moveComponent - 移动组件
```typescript
// 绝对位置移动
await mcpCanvasTools.moveComponent({
  id: 'component_1',
  position: { x: 200, y: 150 }
});

// 相对位置移动
await mcpCanvasTools.moveComponent({
  id: 'component_1',
  deltaX: 50,
  deltaY: -20
});
```

#### alignCenter - 居中对齐
```typescript
await mcpCanvasTools.alignCenter('component_1');
```

### 剪贴板工具

#### copyComponent - 复制组件
```typescript
await mcpCanvasTools.copyComponent('component_1');
```

#### pasteComponent - 粘贴组件
```typescript
// 粘贴到指定位置
await mcpCanvasTools.pasteComponent({ x: 300, y: 200 });

// 粘贴到默认位置
await mcpCanvasTools.pasteComponent();
```

### 查询工具

#### getCanvasState - 获取画布状态
```typescript
const stateResult = mcpCanvasTools.getCanvasState();
console.log('画布状态:', stateResult.data);
// 输出：
// {
//   selectedComponent: { id: 'xxx', type: 'button', ... },
//   totalComponents: 15,
//   currentPage: { id: 'page_1', name: '首页', totalPages: 3 },
//   canUndo: true,
//   canRedo: false
// }
```

#### getComponentInfo - 获取组件信息
```typescript
const infoResult = mcpCanvasTools.getComponentInfo('component_1');
console.log('组件信息:', infoResult.data);
```

#### getPageStructure - 获取页面结构
```typescript
const structureResult = mcpCanvasTools.getPageStructure();
console.log('页面结构:', structureResult.data);
```

### 历史操作工具

#### undo - 撤销
```typescript
await mcpCanvasTools.undo();
```

#### redo - 重做
```typescript
await mcpCanvasTools.redo();
```

## 高级用法

### 批量操作

```typescript
const operations = [
  {
    tool: 'addComponent',
    params: {
      type: 'text',
      name: '标题',
      position: { x: 100, y: 50 },
      properties: { text: '页面标题' }
    }
  },
  {
    tool: 'addComponent',
    params: {
      type: 'button',
      name: '按钮',
      position: { x: 100, y: 100 },
      properties: { text: '点击按钮' }
    }
  }
];

const results = await mcpCanvasTools.executeBatch(operations);
```

### 通用工具调用

```typescript
// 动态调用工具
const result = await mcpCanvasTools.callTool('addComponent', {
  type: 'container',
  position: { x: 0, y: 0 }
});
```

### 错误处理

所有工具调用都返回标准化的结果格式：

```typescript
interface MCPToolResult {
  success: boolean;
  data?: any;          // 成功时的数据
  error?: string;      // 失败时的错误信息
  message?: string;    // 额外的消息
}
```

## 权限系统

### 权限级别

- `READ`: 只读权限 - 查询类操作
- `EDIT`: 编辑权限 - 修改类操作
- `ADMIN`: 管理权限 - 管理类操作

### 工具权限配置

```typescript
const TOOL_PERMISSIONS = {
  // 组件操作 - 编辑权限
  addComponent: ToolPermissionLevel.EDIT,
  updateComponent: ToolPermissionLevel.EDIT,
  removeComponent: ToolPermissionLevel.EDIT,

  // 查询操作 - 只读权限
  getComponentInfo: ToolPermissionLevel.READ,
  getCanvasState: ToolPermissionLevel.READ,

  // 历史操作 - 编辑权限
  undo: ToolPermissionLevel.EDIT,
  redo: ToolPermissionLevel.EDIT,
};
```

## AI 集成示例

### 创建登录表单

```typescript
// AI 理解用户意图："请帮我创建一个登录表单"

// 1. 创建容器
const container = await mcpCanvasTools.addComponent({
  type: 'container',
  name: '登录表单',
  position: { x: 100, y: 100 },
  style: { width: 300, height: 200 }
});

// 2. 添加用户名输入框
await mcpCanvasTools.addComponent({
  type: 'input',
  name: '用户名',
  position: { x: 120, y: 130 },
  properties: { placeholder: '请输入用户名' },
  parentId: container.data.id
});

// 3. 添加密码输入框
await mcpCanvasTools.addComponent({
  type: 'input',
  name: '密码',
  position: { x: 120, y: 170 },
  properties: { placeholder: '请输入密码', type: 'password' },
  parentId: container.data.id
});

// 4. 添加登录按钮
await mcpCanvasTools.addComponent({
  type: 'button',
  name: '登录按钮',
  position: { x: 120, y: 210 },
  properties: { text: '登录' },
  parentId: container.data.id
});
```

## 最佳实践

### 1. 错误处理
始终检查操作结果：

```typescript
const result = await mcpCanvasTools.addComponent(params);
if (!result.success) {
  console.error('操作失败:', result.error);
  return;
}
// 继续处理成功结果
```

### 2. 状态查询
在操作前查询当前状态：

```typescript
const state = mcpCanvasTools.getCanvasState();
if (state.data.totalComponents > 50) {
  console.warn('组件数量较多，性能可能受影响');
}
```

### 3. 批量操作优化
对于多个相关操作，使用批量执行：

```typescript
// 好的做法 - 批量执行
const operations = [/* ... */];
await mcpCanvasTools.executeBatch(operations);

// 避免 - 逐个执行
// await mcpCanvasTools.addComponent(params1);
// await mcpCanvasTools.addComponent(params2);
// await mcpCanvasTools.addComponent(params3);
```

### 4. 权限检查
在敏感操作前检查权限：

```typescript
class SecureCanvasTools extends MCPCanvasTools {
  async addComponent(params) {
    // 自定义安全检查
    if (!this.validateComponentParams(params)) {
      return { success: false, error: '参数验证失败' };
    }
    return super.addComponent(params);
  }
}
```

## 故障排除

### 常见错误

1. **"找不到组件"** - 检查组件ID是否正确
2. **"权限不足"** - 检查权限配置
3. **"组件类型不能为空"** - 确保提供了valid的组件类型
4. **"未找到父元素"** - 检查parentId是否存在

### 调试技巧

1. 使用 `getCanvasState()` 查看当前状态
2. 使用 `getPageStructure()` 查看组件层级
3. 检查浏览器控制台的错误信息
4. 使用 `getComponentInfo()` 验证组件属性

## 版本兼容性

- 支持 Vue 3.x
- 依赖 `@low-code/schema` 核心数据结构
- 兼容现有的 Designer 服务接口

## 贡献指南

欢迎贡献新的工具或改进现有功能！请确保：

1. 添加适当的类型定义
2. 实现错误处理
3. 更新相关文档
4. 添加使用示例
