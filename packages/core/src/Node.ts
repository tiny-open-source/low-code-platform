import type { EventItemConfig, MComponent, MContainer, MPage } from '@lowcode/schema';

import { EventEmitter } from 'eventemitter3';

class Node extends EventEmitter {
  data: MComponent | MContainer | MPage;
  style?: {
    [key: string]: any;
  };

  events?: EventItemConfig[];

  instance?: any;

  constructor(config: MComponent | MContainer) {
    super();

    const { events } = config;

    this.data = config;

    this.events = events;

    this.listenLifeCycle();

    this.once('destroy', () => {
      this.instance = null;
      if (typeof this.data.destroy === 'function') {
        this.data.destroy(this);
      }

      this.listenLifeCycle();
    });
  }

  listenLifeCycle() {
    this.once('created', (instance: any) => {
      this.instance = instance;
      if (typeof this.data.created === 'function') {
        this.data.created(this);
      }
    });

    this.once('mounted', (instance: any) => {
      this.instance = instance;
      if (typeof this.data.mounted === 'function') {
        this.data.mounted(this);
      }
    });
  }
}
export default Node;
