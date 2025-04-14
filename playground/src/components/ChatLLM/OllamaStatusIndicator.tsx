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
          <div class="flex justify-between items-center px-4 text-nowrap">
            <div class="text-sm flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <p class="dark:text-gray-400 text-gray-900">
                正在搜索您的Ollama 🦙
              </p>
            </div>
          </div>
        );
      }
      else if (props.status === 'success') {
        return (
          <div class="flex justify-between items-center px-4 text-nowrap">
            <div class="text-sm flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p class="dark:text-gray-400 text-gray-900">
                Ollama正在运行 🦙
              </p>
            </div>
          </div>
        );
      }
      else {
        return (
          <div class="flex justify-between items-center px-4 text-nowrap">
            <div class="text-sm flex items-center gap-2">
              <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <p class="dark:text-gray-400 text-gray-900">
                无法连接到Ollama 🦙
              </p>
            </div>
          </div>
        );
      }
    };
  },
});
