import type { Message } from '@low-code/llm';
import type { PropType } from 'vue';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ChatMessages',
  props: {
    messages: Array as PropType<Message[]>,
  },
  setup(props) {
    // 初始化markdown解析器
    const md = new MarkdownIt({
      html: false,
      linkify: true,
      typographer: true,
      highlight(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value;
          }
          catch {}
        }
        return ''; // 使用默认转义
      },
    });

    const renderMarkdown = (content: string) => {
      return md.render(content);
    };

    return () => props.messages?.map(message => (
      <div class="relative flex w-full flex-col items-center pt-4 pb-4">
        <div class="group relative flex w-full max-w-3xl flex-col items-end justify-center pb-2 md:px-4 lg:w-4/5 text-gray-800 dark:text-gray-100">
          <div class="flex w-full flex-col gap-2">
            <span class={`text-xs font-bold ${message.isBot ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
              {message.isBot ? message.name || 'Assistant' : 'You'}
            </span>
            <div class="flex flex-grow flex-col">
              {message.isBot
                ? <div class="prose dark:prose-invert max-w-none" innerHTML={renderMarkdown(message.message)} />
                : (
                    <p
                      class={`prose dark:prose-invert whitespace-pre-line prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark ${
                        message.messageType
                        && 'italic text-gray-500 dark:text-gray-400 text-sm'}`}
                    >
                      {message.message}
                    </p>
                  )}
            </div>
          </div>
        </div>
      </div>
    ));
  },
});
