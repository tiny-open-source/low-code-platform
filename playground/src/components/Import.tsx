import { CodeEditor } from '@lowcode/designer';
import { useDialog } from 'naive-ui';
import { defineComponent } from 'vue';
import mockJSON from './mock.json?raw';

export default defineComponent({
  name: 'Preview',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  emit: ['update:show'],
  setup(props, { emit }) {
    const dialog = useDialog();
    const values = ref(mockJSON as any);
    function save(value: string) {
      values.value = value;
    }
    watch(
      () => props.show,
      (value) => {
        if (value) {
          dialog.info({
            title: '从蓝湖导入FigmaJSON',
            style: { width: 'auto' },
            content: () => (
              <CodeEditor
                style="height: 800px; width: 900px;"
                init-values={values.value}
                language="json"
                onSave={save}
              />
            ),
            onAfterLeave: () => {
              emit('update:show', false);
            },
            positiveText: '解析并导入',
            onPositiveClick: () => {
              console.log(values.value);
              emit('save', values.value);
            },
          });
        }
      },
    );
    return () => null;
  },
});
