export default defineComponent({
  name: 'StatusIndicator',
  props: {
    status: {
      type: String as PropType<'pending' | 'success' | 'error'>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      if (props.status === 'pending') {
        return (
          <div class="lc-llm-status-indicator">
            <div class="lc-llm-status-indicator__container">
              <div class="lc-llm-status-indicator__dot lc-llm-status-indicator__dot--pending"></div>
              <p class="lc-llm-status-indicator__text">
                正在搜索您的Ollama 🦙
              </p>
            </div>
          </div>
        );
      }
      else if (props.status === 'success') {
        return (
          <div class="lc-llm-status-indicator">
            <div class="lc-llm-status-indicator__container">
              <div class="lc-llm-status-indicator__dot lc-llm-status-indicator__dot--success"></div>
              <p class="lc-llm-status-indicator__text">
                Ollama正在运行 🦙
              </p>
            </div>
          </div>
        );
      }
      else {
        return (
          <div class="lc-llm-status-indicator">
            <div class="lc-llm-status-indicator__container">
              <div class="lc-llm-status-indicator__dot lc-llm-status-indicator__dot--error"></div>
              <p class="lc-llm-status-indicator__text">
                无法连接到Ollama 🦙
              </p>
            </div>
          </div>
        );
      }
    };
  },
});
