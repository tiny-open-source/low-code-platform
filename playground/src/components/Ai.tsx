import { CodeEditor } from '@lowcode/designer';
import { SendOutlined } from '@vicons/antd';
import { NButton, NDrawer, NDrawerContent, NIcon, NScrollbar } from 'naive-ui';
import { defineComponent } from 'vue';
import mockJSON from './mock.json?raw';

function useDynamicTextareaSize(
  textareaRef: Ref<HTMLTextAreaElement | undefined>,
  textContent: Ref<string | undefined>,
  // optional maximum height after which textarea becomes scrollable
  maxHeight?: number,
): void {
  watchEffect(() => {
    console.log(textContent.value);

    const currentTextarea = textareaRef.value;
    console.log('🚀 ~ watchEffect ~ currentTextarea:', currentTextarea);
    if (currentTextarea) {
      // Temporarily collapse the textarea to calculate the required height
      currentTextarea.style.height = '0px';
      const contentHeight = currentTextarea.scrollHeight;

      if (maxHeight) {
        console.log('🚀 ~ watchEffect ~ maxHeight:', maxHeight);
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
    const codeStr = ref('');

    const textareaRef = ref<HTMLTextAreaElement>();

    const message = ref('');
    useDynamicTextareaSize(textareaRef, message, 150);

    return () => {
      return (
        <NDrawer show={props.show} onUpdateShow={show => emit('update:show', show)} width="50vw" placement="right">
          <NDrawerContent
            closable
            title="使用AI优化"
            v-slots={{
              header: () => (
                <div class="flex justify-between items-center px-4 text-nowrap">
                  <h3>AI调用</h3>
                  <div class="text-sm flex items-center gap-2">
                    <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <p class="dark:text-gray-400 text-gray-900">
                      Ollama is running 🦙
                    </p>
                  </div>
                </div>
              ),
            }}
          >
            <div class="h-full flex flex-col">
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
                      <div class="bg-neutral-50  relative w-full max-w-[48rem] p-1 backdrop-blur-lg duration-100 border border-gray-300 rounded-xl">
                        <div class="flex  bg-transparent">
                          <form class="shrink-0 flex-grow  flex flex-col items-center ">
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
                                placeholder="Type a message..."
                                style={{ minHeight: '30px' }}
                                v-model={message.value}
                              />

                              <div class="mt-2 flex justify-between items-center">
                                <div></div>
                                <div class="flex !justify-end gap-3">
                                  <div class="ant-space-compact css-dev-only-do-not-override-xjks6i ant-space-compact-block ant-dropdown-button !justify-end !w-auto">
                                    <NButton
                                      size="small"
                                      type="primary"
                                      v-slots={{
                                        icon: () => (
                                          <NIcon>
                                            <SendOutlined />
                                          </NIcon>
                                        ),
                                      }}
                                    >
                                      Submit
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
