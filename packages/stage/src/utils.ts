import type { Offset } from './types';
import { removeClassName } from '@lowcode/utils';
import { Mode, SELECTED_CLASS, ZIndex } from './const';

function getParents(el: Element, relative: Element) {
  let cur: Element | null = el.parentElement;
  const parents: Element[] = [];
  while (cur && cur !== relative) {
    parents.push(cur);
    cur = cur.parentElement;
  }
  return parents;
}

// 将蒙层占位节点覆盖在原节点上方
export function getTargetElStyle(el: HTMLElement) {
  const offset = getOffset(el);
  const { transform } = getComputedStyle(el);
  return `
    position: absolute;
    transform: ${transform};
    left: ${offset.left}px;
    top: ${offset.top}px;
    width: ${el.clientWidth}px;
    height: ${el.clientHeight}px;
    z-index: ${ZIndex.DRAG_EL};
  `;
}
export function getOffset(el: HTMLElement): Offset {
  const { offsetParent } = el;

  const left = el.offsetLeft;
  const top = el.offsetTop;

  if (offsetParent) {
    const parentOffset = getOffset(offsetParent as HTMLElement);
    return {
      left: left + parentOffset.left,
      top: top + parentOffset.top,
    };
  }

  return {
    left,
    top,
  };
}

export function getAbsolutePosition(el: HTMLElement, { top, left }: Offset) {
  const { offsetParent } = el;

  if (offsetParent) {
    const parentOffset = getOffset(offsetParent as HTMLElement);
    return {
      left: left - parentOffset.left,
      top: top - parentOffset.top,
    };
  }

  return { left, top };
}

export const isAbsolute = (style: CSSStyleDeclaration): boolean => style.position === 'absolute';

export const isRelative = (style: CSSStyleDeclaration): boolean => style.position === 'relative';

export const isStatic = (style: CSSStyleDeclaration): boolean => style.position === 'static';

export const isFixed = (style: CSSStyleDeclaration): boolean => style.position === 'fixed';

export function isFixedParent(el: HTMLElement) {
  let fixed = false;
  let dom = el;
  while (dom) {
    fixed = isFixed(getComputedStyle(dom));
    if (fixed) {
      break;
    }
    const { parentElement } = dom;
    if (!parentElement || parentElement.tagName === 'BODY') {
      break;
    }
    dom = parentElement;
  }
  return fixed;
}

export function getMode(el: HTMLElement): Mode {
  if (isFixedParent(el))
    return Mode.FIXED;
  const style = getComputedStyle(el);
  if (isStatic(style) || isRelative(style))
    return Mode.SORTABLE;
  return Mode.ABSOLUTE;
}

export function getScrollParent(element: HTMLElement, includeHidden = false): HTMLElement | null {
  let style = getComputedStyle(element);
  const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;

  if (isFixed(style))
    return null;

  for (let parent = element; parent.parentElement;) {
    parent = parent.parentElement;
    style = getComputedStyle(parent);

    if (isAbsolute(style) && isStatic(style))
      continue;

    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX))
      return parent;
  }

  return null;
}

export function removeSelectedClassName(doc: Document) {
  const oldEl = doc.querySelector(`.${SELECTED_CLASS}`);

  if (oldEl) {
    removeClassName(oldEl, SELECTED_CLASS);
    if (oldEl.parentNode)
      removeClassName(oldEl.parentNode as Element, `${SELECTED_CLASS}-parent`);
    doc.querySelectorAll(`.${SELECTED_CLASS}-parents`).forEach((item) => {
      removeClassName(item, `${SELECTED_CLASS}-parents`);
    });
  }
}

export function addSelectedClassName(el: Element, doc: Document) {
  el.classList.add(SELECTED_CLASS);
  (el.parentNode as Element)?.classList.add(`${SELECTED_CLASS}-parent`);
  getParents(el, doc.body).forEach((item) => {
    item.classList.add(`${SELECTED_CLASS}-parents`);
  });
}
export function calcValueByFontsize(doc: Document, value: number) {
  const { fontSize } = doc.documentElement.style;

  if (fontSize) {
    // const times = Number.parseFloat(fontSize) / 32;
    // return (value / times).toFixed(2);
  }

  return value;
}
