import type Core from '@lowcode/core';
import { getCurrentInstance, inject, onMounted, onUnmounted } from 'vue';

export function useApp(props: any) {
  const app: Core | undefined = inject('app');

  const node = app?.page?.getNode(props.config.id);
  const vm = getCurrentInstance();

  node?.emit('created', vm);

  onMounted(() => {
    node?.emit('mounted', vm);
  });

  onUnmounted(() => {
    node?.emit('destroy', vm);
  });

  return app;
}
