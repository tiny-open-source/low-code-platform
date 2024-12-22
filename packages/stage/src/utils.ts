import { Mode, SELECTED_CLASS } from './const';

function getParents(el: Element, relative: Element) {
  let cur: Element | null = el.parentElement;
  const parents: Element[] = [];
  while (cur && cur !== relative) {
    parents.push(cur);
    cur = cur.parentElement;
  }
  return parents;
}

export const getHost = (targetUrl: string) => targetUrl.match(/\/\/([^/]+)/)?.[1];
export function isSameDomain(targetUrl = '', source = globalThis.location.host) {
  const isHttpUrl = /^https?:\/\//.test(targetUrl);

  if (!isHttpUrl)
    return true;

  return getHost(targetUrl) === source;
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

export function createDiv({ className, cssText }: { className: string; cssText: string }) {
  const el = globalThis.document.createElement('div');
  el.className = className;
  el.style.cssText = cssText;
  return el;
}

export function removeSelectedClassName(doc: Document) {
  const oldEl = doc.querySelector(`.${SELECTED_CLASS}`);

  if (oldEl) {
    oldEl.classList.remove(SELECTED_CLASS);
    (oldEl.parentNode as HTMLDivElement)?.classList.remove(`${SELECTED_CLASS}-parent`);
    doc.querySelectorAll(`.${SELECTED_CLASS}-parents`).forEach((item) => {
      item.classList.remove(`${SELECTED_CLASS}-parents`);
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
