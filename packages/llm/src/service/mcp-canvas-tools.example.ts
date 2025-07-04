/**
 * MCP Canvas Tools 使用示例
 * 展示如何使用MCP工具进行画布操作
 */

import mcpCanvasTools from './mcp-canvas-tools';

/**
 * 基础使用示例
 */
export class MCPCanvasToolsExample {
  /**
   * 示例1：创建一个按钮组件
   */
  public async createButton(): Promise<void> {
    console.log('=== 创建按钮组件示例 ===');

    const result = await mcpCanvasTools.addComponent({
      type: 'button',
      name: '提交按钮',
      position: { x: 100, y: 100 },
      style: {
        width: 120,
        height: 40,
        backgroundColor: '#007bff',
        color: '#ffffff',
        borderRadius: 4,
        fontSize: 14,
      },
      properties: {
        text: '提交',
      },
    });

    if (result.success) {
      console.log('按钮创建成功:', result.data);
    }
    else {
      console.error('按钮创建失败:', result.error);
    }
  }

  /**
   * 示例2：创建文本组件并更新样式
   */
  public async createAndUpdateText(): Promise<void> {
    console.log('=== 创建并更新文本组件示例 ===');

    // 创建文本组件
    const createResult = await mcpCanvasTools.addComponent({
      type: 'text',
      name: '标题文本',
      position: { x: 50, y: 50 },
      style: {
        fontSize: 16,
        color: '#333333',
      },
      properties: {
        text: '原始标题',
      },
    });

    if (!createResult.success) {
      console.error('文本创建失败:', createResult.error);
      return;
    }

    const textComponent = createResult.data;
    console.log('文本组件创建成功:', textComponent);

    // 更新文本样式
    const updateResult = await mcpCanvasTools.updateComponent({
      id: textComponent.id,
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ff6b35',
      },
      properties: {
        text: '更新后的标题',
      },
    });

    if (updateResult.success) {
      console.log('文本组件更新成功:', updateResult.data);
    }
    else {
      console.error('文本组件更新失败:', updateResult.error);
    }
  }

  /**
   * 示例3：复制和粘贴组件
   */
  public async copyPasteComponent(): Promise<void> {
    console.log('=== 复制粘贴组件示例 ===');

    // 首先创建一个组件
    const createResult = await mcpCanvasTools.addComponent({
      type: 'container',
      name: '容器组件',
      position: { x: 200, y: 200 },
      style: {
        width: 200,
        height: 150,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
      },
    });

    if (!createResult.success) {
      console.error('容器创建失败:', createResult.error);
      return;
    }

    const container = createResult.data;
    console.log('容器组件创建成功:', container);

    // 复制组件
    const copyResult = await mcpCanvasTools.copyComponent(container.id);
    if (!copyResult.success) {
      console.error('复制失败:', copyResult.error);
      return;
    }
    console.log('组件复制成功');

    // 粘贴组件到新位置
    const pasteResult = await mcpCanvasTools.pasteComponent({ x: 300, y: 300 });
    if (pasteResult.success) {
      console.log('组件粘贴成功:', pasteResult.data);
    }
    else {
      console.error('粘贴失败:', pasteResult.error);
    }
  }

  /**
   * 示例4：查询和选择组件
   */
  public async queryAndSelectComponents(): Promise<void> {
    console.log('=== 查询和选择组件示例 ===');

    // 获取当前画布状态
    const stateResult = mcpCanvasTools.getCanvasState();
    if (stateResult.success) {
      console.log('当前画布状态:', stateResult.data);
    }

    // 获取页面结构
    const structureResult = mcpCanvasTools.getPageStructure();
    if (structureResult.success) {
      console.log('页面结构:', structureResult.data);
    }

    // 按类型选择组件
    const selectResult = await mcpCanvasTools.selectComponent({
      selector: {
        type: 'button',
        index: 0, // 选择第一个按钮
      },
    });

    if (selectResult.success) {
      console.log('选中的按钮组件:', selectResult.data);

      // 获取选中组件的详细信息
      const infoResult = mcpCanvasTools.getComponentInfo(selectResult.data.id);
      if (infoResult.success) {
        console.log('组件详细信息:', infoResult.data);
      }
    }
  }

  /**
   * 示例5：移动和对齐组件
   */
  public async moveAndAlignComponent(): Promise<void> {
    console.log('=== 移动和对齐组件示例 ===');

    // 创建一个组件用于演示
    const createResult = await mcpCanvasTools.addComponent({
      type: 'img',
      name: '测试图片',
      position: { x: 150, y: 150 },
      style: {
        width: 100,
        height: 100,
      },
      properties: {
        src: 'https://via.placeholder.com/100',
        alt: '测试图片',
      },
    });

    if (!createResult.success) {
      console.error('图片创建失败:', createResult.error);
      return;
    }

    const imageComponent = createResult.data;
    console.log('图片组件创建成功:', imageComponent);

    // 相对移动组件
    const moveResult = await mcpCanvasTools.moveComponent({
      id: imageComponent.id,
      deltaX: 50,
      deltaY: 30,
    });

    if (moveResult.success) {
      console.log('组件移动成功:', moveResult.data);
    }

    // 居中对齐组件
    const alignResult = await mcpCanvasTools.alignCenter(imageComponent.id);
    if (alignResult.success) {
      console.log('组件居中对齐成功:', alignResult.data);
    }
  }

  /**
   * 示例7：错误处理
   */
  public async errorHandlingExample(): Promise<void> {
    console.log('=== 错误处理示例 ===');

    // 尝试更新不存在的组件
    const result = await mcpCanvasTools.updateComponent({
      id: 'non-existent-id',
      style: { color: 'red' },
    });

    if (!result.success) {
      console.log('预期的错误:', result.error);
    }

    // 尝试创建无效类型的组件
    const invalidResult = await mcpCanvasTools.addComponent({
      type: '', // 空类型
      position: { x: 0, y: 0 },
    });

    if (!invalidResult.success) {
      console.log('预期的验证错误:', invalidResult.error);
    }
  }

  /**
   * 运行所有示例
   */
  public async runAllExamples(): Promise<void> {
    console.log('开始运行MCP Canvas Tools示例...\n');

    try {
      await this.createButton();
      console.log('\n');

      await this.createAndUpdateText();
      console.log('\n');

      await this.copyPasteComponent();
      console.log('\n');

      await this.queryAndSelectComponents();
      console.log('\n');

      await this.moveAndAlignComponent();
      console.log('\n');

      await this.errorHandlingExample();
      console.log('\n');

      console.log('所有示例运行完成！');
    }
    catch (error) {
      console.error('示例运行过程中发生错误:', error);
    }
  }
}

/**
 * AI 对话场景示例
 */
export class AIConversationExample {
  /**
   * 模拟AI对话：创建登录表单
   */
  public async createLoginForm(): Promise<void> {
    console.log('=== AI对话场景：创建登录表单 ===');

    // AI理解用户意图："请帮我创建一个登录表单"

    // 1. 创建表单容器
    const containerResult = await mcpCanvasTools.addComponent({
      type: 'container',
      name: '登录表单容器',
      position: { x: 100, y: 100 },
      style: {
        width: 300,
        height: 250,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      },
    });

    if (!containerResult.success)
      return;
    const container = containerResult.data;

    // 2. 创建标题
    await mcpCanvasTools.addComponent({
      type: 'text',
      name: '登录标题',
      position: { x: 150, y: 120 },
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
        textAlign: 'center',
      },
      properties: { text: '用户登录' },
      parentId: container.id,
    });

    // 3. 创建用户名输入框
    await mcpCanvasTools.addComponent({
      type: 'input',
      name: '用户名输入框',
      position: { x: 120, y: 160 },
      style: {
        width: 260,
        height: 35,
        borderRadius: 4,
        border: '1px solid #ddd',
      },
      properties: {
        placeholder: '请输入用户名',
        type: 'text',
      },
      parentId: container.id,
    });

    // 4. 创建密码输入框
    await mcpCanvasTools.addComponent({
      type: 'input',
      name: '密码输入框',
      position: { x: 120, y: 210 },
      style: {
        width: 260,
        height: 35,
        borderRadius: 4,
        border: '1px solid #ddd',
      },
      properties: {
        placeholder: '请输入密码',
        type: 'password',
      },
      parentId: container.id,
    });

    // 5. 创建登录按钮
    await mcpCanvasTools.addComponent({
      type: 'button',
      name: '登录按钮',
      position: { x: 120, y: 260 },
      style: {
        width: 260,
        height: 40,
        backgroundColor: '#007bff',
        color: '#ffffff',
        borderRadius: 4,
        fontSize: 16,
        fontWeight: 'bold',
      },
      properties: { text: '登录' },
      parentId: container.id,
    });

    console.log('登录表单创建完成！');
  }

  /**
   * 模拟AI对话：响应用户修改需求
   */
  public async modifyFormStyle(): Promise<void> {
    console.log('=== AI对话场景：修改表单样式 ===');

    // AI理解用户需求："把登录按钮改成绿色，并且让标题更大一些"

    // 1. 查找登录按钮
    const buttonResult = await mcpCanvasTools.selectComponent({
      selector: { name: '登录按钮' },
    });

    if (buttonResult.success) {
      // 修改按钮颜色
      await mcpCanvasTools.updateComponent({
        id: buttonResult.data.id,
        style: {
          backgroundColor: '#28a745', // 绿色
        },
      });
      console.log('登录按钮颜色已改为绿色');
    }

    // 2. 查找标题并修改大小
    const titleResult = await mcpCanvasTools.selectComponent({
      selector: { name: '登录标题' },
    });

    if (titleResult.success) {
      await mcpCanvasTools.updateComponent({
        id: titleResult.data.id,
        style: {
          fontSize: 32, // 增大字体
        },
      });
      console.log('标题字体已增大');
    }
  }
}

// 导出示例类
export default MCPCanvasToolsExample;
