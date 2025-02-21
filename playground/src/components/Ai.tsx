import { isOllamaRunning, useMessageOption } from '@lowcode/ai';
import { CodeEditor } from '@lowcode/designer';
import { EnterOutlined } from '@vicons/antd';
import { NButton, NDrawer, NDrawerContent, NIcon, NScrollbar } from 'naive-ui';
import { defineComponent, ref } from 'vue';
import mockJSONDiff from './mock-diff.json?raw';
import mockJSON from './mock.json?raw';

function useDynamicTextareaSize(
  textareaRef: Ref<HTMLTextAreaElement | undefined>,
  textContent: Ref<string | undefined>,
  // optional maximum height after which textarea becomes scrollable
  maxHeight?: number,
): void {
  watch(textContent, () => {
    const currentTextarea = textareaRef.value;
    if (currentTextarea) {
      // Temporarily collapse the textarea to calculate the required height
      currentTextarea.style.height = '0px';
      const contentHeight = currentTextarea.scrollHeight;

      if (maxHeight) {
        // Set max-height and adjust overflow behavior if maxHeight is provided
        currentTextarea.style.maxHeight = `${maxHeight}px`;
        currentTextarea.style.overflowY
          = contentHeight > maxHeight ? 'scroll' : 'hidden';
        currentTextarea.style.height = `${Math.min(
          contentHeight,
          maxHeight,
        )}px`;
      }
      else {
        // Adjust height without max height constraint
        currentTextarea.style.height = `${contentHeight}px`;
      }
    }
  });
}
export default defineComponent({
  name: 'Preview',
  components: {
    NDrawer,
    NIcon,
    NDrawerContent,
  },
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  emit: ['update:show'],
  setup(props, { emit }) {
    const codeStr = ref(mockJSONDiff);

    const textareaRef = ref<HTMLTextAreaElement>();
    const form = ref<HTMLFormElement>();
    const message = ref('');
    useDynamicTextareaSize(textareaRef, message, 150);

    const textAreaFocus = () => {
      textareaRef.value?.focus();
    };
    onMounted(() => {
      textAreaFocus();
      isOllamaRunning();
    });
    watchEffect(() => {
      props.show && textAreaFocus();
    });

    const { onSubmit } = useMessageOption();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Process' || e.key === '229')
        return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = (e.target as HTMLTextAreaElement).value;
        if (!message || message.trim().length === 0) {
          return;
        }

        form.value?.reset();

        textAreaFocus();

        onSubmit({
          message: message.trim(),
        });
      }
    };
    return () => {
      return (
        <NDrawer
          show={props.show}
          onUpdateShow={(show) => {
            emit('update:show', show);
          }}
          width="60vw"
          placement="right"
        >
          <NDrawerContent
            closable
            title="使用AI优化"
            v-slots={{
              header: () => (
                <div class="flex justify-between items-center px-4 text-nowrap">
                  <div class="text-sm flex items-center gap-2">
                    <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <p class="dark:text-gray-400 text-gray-900">
                      Ollama正在运行 🦙
                    </p>
                  </div>
                </div>
              ),
            }}
          >
            <div class="h-full flex flex-col relative">
              <div class="code-block">
                <CodeEditor
                  style="height: 50vh; width: 100%;"
                  type="diff"
                  init-values={mockJSON}
                  modified-values={codeStr.value}
                  language="json"
                />
              </div>
              <NScrollbar class="h-full w-full flex-1 relative">
                {Array.from({ length: 20 }).map(_ => (
                  <div class="relative flex w-full flex-col items-center pt-16 pb-4">
                    <div class="group relative flex w-full max-w-3xl flex-col items-end justify-center pb-2 md:px-4 lg:w-4/5 text-gray-800 dark:text-gray-100 }">
                      <div class="flex w-full flex-col gap-2 ">
                        <span class="text-xs font-bold text-gray-800 dark:text-white">
                          deepseek-r1:14b
                        </span>
                        <div></div>
                        <div class="flex flex-grow flex-col">
                          <div class="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark">
                            <p class="mb-2 last:mb-0">
                              你好！很高兴见到你，有什么我可以帮忙的吗？无论是学习、工作还是生活中的问题，都可以告诉我哦！😊
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div class="w-full pb-[157px]"></div>
              </NScrollbar>

              <div class="absolute bottom-0 w-full">
                <div class="flex w-full flex-col items-center p-2 pt-1  pb-4">
                  <div class="relative z-10 flex w-full flex-col items-center justify-center gap-2 text-base">
                    <div class="relative flex w-full flex-row justify-center gap-2 lg:w-4/5">
                      <div class="bg-neutral-50  relative w-full max-w-[48rem] p-1 backdrop-blur-lg duration-100 border border-gray-300 border-solid rounded-xl">
                        <div class="flex bg-transparent">
                          <form
                            ref={form}
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const message = textareaRef.value?.value;
                              if (
                                !message || message.trim().length === 0
                              ) {
                                return;
                              }

                              form.value?.reset();
                              textAreaFocus();

                              await onSubmit({
                                message: message.trim(),
                              });
                            }}
                            class="shrink-0 flex-grow  flex flex-col items-center "
                          >
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              class="sr-only"
                              accept="image/*"
                            />
                            <div class="w-full  flex flex-col dark:border-gray-600  p-2">
                              <textarea
                                ref={textareaRef}
                                class="px-2 py-2 w-full resize-none bg-transparent focus-within:outline-none focus:ring-0 focus-visible:ring-0 ring-0 dark:ring-0 border-0 dark:text-gray-100"
                                rows="1"
                                tabindex="0"
                                placeholder="来吧，提出你的要求，哥帮你解决"
                                style={{ minHeight: '30px' }}
                                onKeydown={e => handleKeyDown(e)}
                                v-model={message.value}
                              />

                              <div class="mt-2 flex justify-between items-center">
                                <div></div>
                                <div class="flex !justify-end gap-3">
                                  <div class="ant-space-compact css-dev-only-do-not-override-xjks6i ant-space-compact-block ant-dropdown-button !justify-end !w-auto">
                                    <NButton
                                      attr-type="submit"
                                      size="small"
                                      type="primary"
                                      v-slots={{
                                        icon: () => (
                                          <NIcon size="small">
                                            <EnterOutlined />
                                          </NIcon>
                                        ),
                                      }}
                                    >
                                      提交
                                    </NButton>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </NDrawerContent>
        </NDrawer>
      );
    };
  },
});
