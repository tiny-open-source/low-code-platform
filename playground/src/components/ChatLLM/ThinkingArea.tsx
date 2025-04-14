import { NCollapseTransition, NSwitch } from 'naive-ui';

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
    const show = ref(false);
    return () => (
      <div>
        <NSwitch v-model:value={show.value} v-slots={{ checked: () => <span>折叠</span>, unchecked: () => <span>思考中...</span> }} />
        <NCollapseTransition show={show.value}>
          {props.content}
        </NCollapseTransition>
      </div>
    );
  },
});
