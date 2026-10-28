/** Tiny DOM helpers so the UI code stays readable without a framework. */

export type Attrs = {
  class?: string;
  style?: string;
  text?: string;
  html?: string;
  title?: string;
  value?: string;
  onClick?: (e: MouseEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
  onInput?: (e: Event) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  [key: string]: unknown;
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string | null | undefined | false)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'style') node.setAttribute('style', String(v));
    else if (k === 'text') node.textContent = String(v);
    else if (k === 'html') node.innerHTML = String(v);
    else if (k === 'onClick') node.addEventListener('click', v as EventListener);
    else if (k === 'onPointerDown') node.addEventListener('pointerdown', v as EventListener);
    else if (k === 'onPointerMove') node.addEventListener('pointermove', v as EventListener);
    else if (k === 'onPointerUp') node.addEventListener('pointerup', v as EventListener);
    else if (k === 'onInput') node.addEventListener('input', v as EventListener);
    else if (k === 'onKeyDown') node.addEventListener('keydown', v as EventListener);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function clear(node: HTMLElement) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toLocaleString('en-US');
}

export function stars(rarity: number): string {
  return '★'.repeat(rarity);
}

export function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}
