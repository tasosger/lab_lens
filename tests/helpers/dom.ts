import { JSDOM } from 'jsdom'
import { act, type ReactNode } from 'react'

/** Real React mounts and DOM events; layout/observer APIs are controlled test doubles. */
export async function createDomHarness() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
  const { window } = dom
  const previous = new Map<string, PropertyDescriptor | undefined>()
  const install = (key: string, value: unknown) => {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'SVGElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'PointerEvent', 'localStorage'] as const) {
    install(key, key === 'window' ? window : window[key])
  }
  install('getComputedStyle', window.getComputedStyle.bind(window))
  install('requestAnimationFrame', window.requestAnimationFrame.bind(window))
  install('cancelAnimationFrame', window.cancelAnimationFrame.bind(window))
  install('IS_REACT_ACT_ENVIRONMENT', true)
  install('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  window.HTMLElement.prototype.scrollIntoView = () => {}
  const captures = new WeakMap<Element, number>()
  window.Element.prototype.setPointerCapture = function (id) { captures.set(this, id) }
  window.Element.prototype.hasPointerCapture = function (id) { return captures.get(this) === id }
  window.Element.prototype.releasePointerCapture = function () { captures.delete(this) }

  // Import after installing the DOM so React's event system detects browser support.
  const { createRoot } = await import('react-dom/client')
  const container = window.document.createElement('div')
  window.document.body.append(container)
  let root = createRoot(container)
  return {
    window, container,
    async render(node: ReactNode) { await act(async () => root.render(node)) },
    async reset() {
      await act(async () => root.unmount())
      container.replaceChildren()
      root = createRoot(container)
      window.localStorage.clear()
    },
    async close() {
      await act(async () => root.unmount())
      window.close()
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
    },
    async click(element: Element) { await act(async () => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))) },
    async key(element: Element, key: string) { await act(async () => element.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }))) },
    async pointer(element: Element, type: string, x: number, y: number) {
      await act(async () => element.dispatchEvent(new window.PointerEvent(type, { bubbles: true, button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y })))
    },
  }
}
