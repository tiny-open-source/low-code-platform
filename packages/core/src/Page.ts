import type { Id, MComponent, MContainer, MPage } from '@lowcode/schema';

import Node from './Node';

interface ConfigOptions {
  config: MPage;
}

class Page extends Node {
  nodes = new Map<Id, Node>();

  constructor(options: ConfigOptions) {
    super(options.config);
  }

  initNode(config: MComponent | MContainer) {
    const node = new Node(config);
    this.nodes.set(config.id, node);

    config.items?.forEach((element: MComponent | MContainer) => {
      this.initNode(element);
    });
  }

  getNode(id: Id) {
    return this.nodes.get(id);
  }

  setNode(id: Id, node: Node) {
    this.nodes.set(id, node);
  }

  deleteNode(id: Id) {
    this.nodes.delete(id);
  }
}

export default Page;
