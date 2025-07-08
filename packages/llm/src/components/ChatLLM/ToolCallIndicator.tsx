import { NSpin } from 'naive-ui';
import { defineComponent } from 'vue';
import { getToolCallStatusText, getToolDisplayConfig } from '../../utils/tool-display-config';

export default defineComponent({
  name: 'ToolCallIndicator',
  props: {
    status: {
      type: String as () => 'executing' | 'completed' | 'failed',
      required: true,
    },
    toolName: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    round: {
      type: Number,
      default: 1,
    },
    toolCount: {
      type: Number,
      default: 1,
    },
  },
  setup(props) {
    const getStatusIcon = () => {
      if (props.toolName) {
        const toolConfig = getToolDisplayConfig(props.toolName);
        return toolConfig.icon;
      }

      switch (props.status) {
        case 'executing':
          return '🔧';
        case 'completed':
          return '✅';
        case 'failed':
          return '❌';
        default:
          return '🔧';
      }
    };

    const getStatusText = () => {
      return getToolCallStatusText(props.status, props.toolCount);
    };

    const getStatusClass = () => {
      return `lc-llm-tool-call-indicator--${props.status}`;
    };

    const getToolDisplayName = () => {
      if (props.toolName) {
        const toolConfig = getToolDisplayConfig(props.toolName);
        return toolConfig.name;
      }
      return '';
    };

    const getToolDescription = () => {
      if (props.description) {
        return props.description;
      }
      if (props.toolName) {
        const toolConfig = getToolDisplayConfig(props.toolName);
        return toolConfig.description;
      }
      return '';
    };

    return () => (
      <div class={`lc-llm-tool-call-indicator ${getStatusClass()}`}>
        <div class="lc-llm-tool-call-indicator__content">
          <div class="lc-llm-tool-call-indicator__header">
            <span class="lc-llm-tool-call-indicator__icon">
              {getStatusIcon()}
            </span>
            <span class="lc-llm-tool-call-indicator__text">
              {getStatusText()}
              {props.round > 1 && (
                <span class="lc-llm-tool-call-indicator__round">
                  （第
                  {' '}
                  {props.round}
                  {' '}
                  轮）
                </span>
              )}
            </span>
            {props.status === 'executing' && (
              <NSpin size="small" class="lc-llm-tool-call-indicator__spinner" />
            )}
          </div>

          {(getToolDisplayName() || getToolDescription()) && (
            <div class="lc-llm-tool-call-indicator__details">
              {getToolDisplayName() && (
                <span class="lc-llm-tool-call-indicator__tool-name">
                  工具：
                  {getToolDisplayName()}
                </span>
              )}
              {getToolDescription() && (
                <span class="lc-llm-tool-call-indicator__description">
                  {getToolDescription()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
});
