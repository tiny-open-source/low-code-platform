import { NCollapseTransition, NSwitch } from 'naive-ui';
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'ThinkingArea',
  components: {
    NSwitch,
    NCollapseTransition,
  },
  props: {
    content: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const show = ref(true);
    return () => (
      <div class="w-full my-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">AI思考过程</h3>
          <NSwitch
            v-model:value={show.value}
            v-slots={{
              checked: () => <span class="text-xs">展开</span>,
              unchecked: () => <span class="text-xs">折叠</span>,
            }}
          />
        </div>
        <NCollapseTransition show={show.value}>
          <div class="p-2 text-sm font-mono bg-gray-50 dark:bg-gray-900 rounded whitespace-pre-wrap overflow-auto max-h-[20vh]">
            {props.content}
          </div>
        </NCollapseTransition>
      </div>
    );
  },
});
