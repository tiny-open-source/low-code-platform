import { defineComponent } from 'vue';
import { getToolDisplayConfig } from '../../utils/tool-display-config';

export default defineComponent({
  name: 'ToolCallHistory',
  props: {
    history: {
      type: Array as () => Array<{
        name: string;
        status: 'completed' | 'failed';
        description?: string;
        round: number;
        count: number;
        timestamp?: number;
      }>,
      required: true,
    },
  },
  setup(props) {
    const formatTime = (timestamp?: number) => {
      if (!timestamp)
        return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };

    const getToolConfig = (toolName: string) => {
      return getToolDisplayConfig(toolName);
    };

    const getStatusIcon = (status: 'completed' | 'failed') => {
      return status === 'completed' ? '✅' : '❌';
    };

    const getStatusClass = (status: 'completed' | 'failed') => {
      return `lc-llm-tool-history-item--${status}`;
    };

    return () => {
      if (!props.history || props.history.length === 0) {
        return null;
      }

      return (
        <div class="lc-llm-tool-history">
          <div class="lc-llm-tool-history__header">
            <span class="lc-llm-tool-history__title">🔧 工具调用历史</span>
            <span class="lc-llm-tool-history__count">
              共
              {' '}
              {props.history.length}
              {' '}
              次调用
            </span>
          </div>

          <div class="lc-llm-tool-history__list">
            {props.history.map((item, index) => {
              const toolConfig = getToolConfig(item.name);

              return (
                <div
                  key={index}
                  class={`lc-llm-tool-history-item ${getStatusClass(item.status)}`}
                >
                  <div class="lc-llm-tool-history-item__header">
                    <span class="lc-llm-tool-history-item__icon">
                      {toolConfig.icon}
                    </span>
                    <span class="lc-llm-tool-history-item__name">
                      {toolConfig.name}
                    </span>
                    <span class="lc-llm-tool-history-item__status">
                      {getStatusIcon(item.status)}
                    </span>
                    {item.round > 1 && (
                      <span class="lc-llm-tool-history-item__round">
                        第
                        {item.round}
                        轮
                      </span>
                    )}
                    {item.timestamp && (
                      <span class="lc-llm-tool-history-item__time">
                        {formatTime(item.timestamp)}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <div class="lc-llm-tool-history-item__description">
                      {item.description}
                    </div>
                  )}

                  {item.count > 1 && (
                    <div class="lc-llm-tool-history-item__count">
                      批量执行
                      {' '}
                      {item.count}
                      {' '}
                      个操作
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    };
  },
});
