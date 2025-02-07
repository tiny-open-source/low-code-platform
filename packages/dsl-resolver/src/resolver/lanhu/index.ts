import type { MNode } from '@lowcode/schema';
import { type FigmaJson, type FigmaLayersNode, type FigmaPageNode, mockFigmaJson } from './figma-json';

export function sum(a: number, b: number) {
  return a + b;
}

abstract class NodeVisitor {
  abstract visit(node: any): MNode;
  protected parseStyles(styles: any[]): object {
    return styles.reduce((acc, style) => ({
      ...acc,
      ...this.parseStyle(style),
    }), {});
  }

  protected parseStyle(style: any): object {
    const result: Record<string, any> = {};

    if (style.font) {
      result.fontFamily = style.font.name;
      result.fontSize = style.font.size;
      result.textAlign = style.font.align;
    }

    if (style.color) {
      result.color = style.color.value;
    }

    return result;
  }
}

class PageNodeVisitor extends NodeVisitor {
  visit(node: FigmaPageNode): MNode {
    return {
      type: 'page',
      id: `page_${node.id}`,
      name: node.name,
      title: '',
      layout: 'absolute',
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        right: '',
        bottom: '',
        width: node.frame.width,
        height: node.frame.height,
        backgroundImage: '',
        backgroundColor: node.style.fills[0].color.value,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        color: '',
        fontSize: '',
        fontWeight: '',
      },
      items: node.layers ?? [],
    };
  }
}

class ArtBoardNodeVisitor extends NodeVisitor {
  visit(node: FigmaLayersNode): MNode {
    return {
      id: `component_${node.id}`,
      type: 'container',
      name: node.name,
      layout: 'absolute',
      style: {
        position: 'absolute',
        width: node.frame.width,
        height: node.frame.height,
        top: node.frame.top,
        left: node.frame.left,
        right: '',
        bottom: '',
        backgroundImage: '',
        backgroundColor: node.style?.fills?.[0]?.color?.value,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        color: '',
        fontSize: '',
        opacity: node.opacity,
        fontWeight: '',
        transform: {
          rotate: '',
          scale: '',
        },
        display: '',
        flexDirection: '',
        justifyContent: '',
        alignItems: '',
        flexWrap: '',
        marginTop: '',
        marginRight: '',
        marginBottom: '',
        marginLeft: '',
        paddingTop: '',
        paddingRight: '',
        paddingBottom: '',
        paddingLeft: '',
        overflow: '',
        lineHeight: '',
        textAlign: '',
        backgroundPosition: '',
        zIndex: '',
        borderTopLeftRadius: node.paths[0]?.radius?.topLeft ?? '',
        borderTopRightRadius: node.paths[0]?.radius?.topLeft ?? '',
        borderBottomRightRadius: node.paths[0]?.radius?.topLeft ?? '',
        borderBottomLeftRadius: node.paths[0]?.radius?.topLeft ?? '',
        borderTopWidth: '',
        borderTopStyle: '',
        borderTopColor: '',
        borderRightColor: '',
        borderRightWidth: '',
        borderRightStyle: '',
        borderBottomWidth: '',
        borderBottomStyle: '',
        borderBottomColor: '',
        borderLeftStyle: '',
        borderLeftWidth: '',
        borderLeftColor: '',
        borderWidth: '',
        borderStyle: '',
        borderColor: '',
      },
      events: [],
      created: '',
      items: node.layers ?? [],
    };
  }
}

class ShapeLayerNodeVisitor extends NodeVisitor {
  visit(node: FigmaLayersNode): MNode {
    return {
      id: `component_${node.id}`,
      type: 'container',
      name: node.name,
      layout: 'absolute',
      style: {
        position: 'absolute',
        width: node.frame.width,
        height: node.frame.height,
        top: node.frame.top,
        left: node.frame.left,
        right: '',
        bottom: '',
        backgroundImage: '',
        backgroundColor: node.style?.fills?.[0]?.color?.value,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        color: '',
        fontSize: '',
        opacity: node.opacity,
        fontWeight: '',
        transform: {
          rotate: '',
          scale: '',
        },
        display: '',
        flexDirection: '',
        justifyContent: '',
        alignItems: '',
        flexWrap: '',
        marginTop: '',
        marginRight: '',
        marginBottom: '',
        marginLeft: '',
        paddingTop: '',
        paddingRight: '',
        paddingBottom: '',
        paddingLeft: '',
        overflow: '',
        lineHeight: '',
        textAlign: '',
        backgroundPosition: '',
        zIndex: '',
        borderTopLeftRadius: node.paths[0]?.radius?.topLeft ?? '',
        borderTopRightRadius: node.paths[0]?.radius?.topLeft ?? '',
        borderBottomRightRadius: node.paths[0]?.radius?.topLeft ?? '',
        borderBottomLeftRadius: node.paths[0]?.radius?.topLeft ?? '',
        borderTopWidth: '',
        borderTopStyle: '',
        borderTopColor: '',
        borderRightColor: '',
        borderRightWidth: '',
        borderRightStyle: '',
        borderBottomWidth: '',
        borderBottomStyle: '',
        borderBottomColor: '',
        borderLeftStyle: '',
        borderLeftWidth: '',
        borderLeftColor: '',
        borderWidth: '',
        borderStyle: '',
        borderColor: '',
      },
      events: [],
      created: '',
      items: [],
    };
  }
}

class GroupLayerNodeVisitor extends NodeVisitor {
  visit(node: FigmaLayersNode): MNode {
    return {
      id: `component_${node.id}`,
      type: 'container',
      name: node.name,
      layout: 'absolute',
      style: {
        position: 'absolute',
        width: node.frame.width,
        height: node.frame.height,
        top: node.frame.top,
        left: node.frame.left,
        right: '',
        bottom: '',
        backgroundImage: '',
        backgroundColor: node.style?.fills?.[0]?.color?.value,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        color: '',
        fontSize: '',
        opacity: node.opacity,
        fontWeight: '',
        transform: {
          rotate: '',
          scale: '',
        },
        display: '',
        flexDirection: '',
        justifyContent: '',
        alignItems: '',
        flexWrap: '',
        marginTop: '',
        marginRight: '',
        marginBottom: '',
        marginLeft: '',
        paddingTop: '',
        paddingRight: '',
        paddingBottom: '',
        paddingLeft: '',
        overflow: '',
        lineHeight: '',
        textAlign: '',
        backgroundPosition: '',
        zIndex: '',
        borderTopLeftRadius: '',
        borderTopRightRadius: '',
        borderBottomRightRadius: '',
        borderBottomLeftRadius: '',
        borderTopWidth: '',
        borderTopStyle: '',
        borderTopColor: '',
        borderRightColor: '',
        borderRightWidth: '',
        borderRightStyle: '',
        borderBottomWidth: '',
        borderBottomStyle: '',
        borderBottomColor: '',
        borderLeftStyle: '',
        borderLeftWidth: '',
        borderLeftColor: '',
        borderWidth: '',
        borderStyle: '',
        borderColor: '',
      },
      events: [],
      created: '',
      items: node.layers ?? [],
    };
  }
}
class TextLayerNodeVisitor extends NodeVisitor {
  visit(node: FigmaLayersNode): MNode {
    return {
      id: `component_${node.id}`,
      type: 'text',
      name: node.name,
      text: node.text?.value,
      style: {
        position: 'absolute',
        width: node.frame.width,
        height: node.frame.height,
        top: node.frame.top,
        left: node.frame.left,
        right: '',
        bottom: '',
        backgroundImage: '',
        backgroundColor: '',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        color: node.style.fills[0].color.value,
        fontSize: node.text?.style.font.size,
        opacity: node.opacity,
        fontWeight: node.text?.style.font.fontWeight,
        transform: {
          rotate: '',
          scale: '',
        },
        display: '',
        flexDirection: '',
        justifyContent: '',
        alignItems: '',
        flexWrap: '',
        marginTop: '',
        marginRight: '',
        marginBottom: '',
        marginLeft: '',
        paddingTop: '',
        paddingRight: '',
        paddingBottom: '',
        paddingLeft: '',
        overflow: '',
        lineHeight: '',
        textAlign: '',
        backgroundPosition: '',
        zIndex: '',
        borderTopLeftRadius: '',
        borderTopRightRadius: '',
        borderBottomRightRadius: '',
        borderBottomLeftRadius: '',
        borderTopWidth: '',
        borderTopStyle: '',
        borderTopColor: '',
        borderRightColor: '',
        borderRightWidth: '',
        borderRightStyle: '',
        borderBottomWidth: '',
        borderBottomStyle: '',
        borderBottomColor: '',
        borderLeftStyle: '',
        borderLeftWidth: '',
        borderLeftColor: '',
        borderWidth: '',
        borderStyle: '',
        borderColor: '',
      },
      events: [],
      created: '',
    };
  }
}
class NodeParser {
  private visitors: Map<string, NodeVisitor>;
  constructor() {
    this.visitors = new Map();
    this.registerDefaultVisitors();
  }

  private registerDefaultVisitors() {
    this.visitors.set('page', new PageNodeVisitor());
    this.visitors.set('artboard', new ArtBoardNodeVisitor());
    this.visitors.set('shapeLayer', new ShapeLayerNodeVisitor());
    this.visitors.set('groupLayer', new GroupLayerNodeVisitor());
    this.visitors.set('textLayer', new TextLayerNodeVisitor());
  }

  parse(node: any, type?: string): MNode {
    const visitor = this.visitors.get(type ?? node.type);
    if (!visitor) {
      throw new Error(`未知节点类型: ${node.type}`);
    }
    return visitor.visit(node);
  }
}
export class FigmaParser {
  private nodeParser: NodeParser;

  constructor() {
    this.nodeParser = new NodeParser();
  }

  parse(figmaJson: FigmaJson): MNode {
    const page = figmaJson.artboard;
    return this.parsePage(page);
  }

  private parsePage(figmaPage: FigmaPageNode): MNode {
    const result = this.nodeParser.parse(figmaPage, 'page');
    result.items = result.items.map((child: FigmaLayersNode) => this.parseNode(child));
    return result;
  }

  private parseNode(node: FigmaLayersNode): MNode {
    const parsedNode = this.nodeParser.parse(node);

    if (parsedNode.items?.length) {
      parsedNode.items = parsedNode.items.map(
        (child: FigmaLayersNode) => this.parseNode(child),
      );
    }

    return parsedNode;
  }
}
const parser = new FigmaParser();
const dsl = parser.parse(mockFigmaJson);
console.dir(dsl, { depth: 10 });
