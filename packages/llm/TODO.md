## 如何节省大模型token使用量（如何解决成本）

1. 利用小模型(例如本地模型)推测用户意图，传回可能需要调用的工具列表，最终将精简后的工具列表传给高级模型（减少工具调用token传输量）
