/**
 * Register <cq-context> as a real Custom Element so Vue 3 treats it
 * as a native element regardless of compilerOptions.isCustomElement.
 *
 * ChartIQ expects this tag to exist in the DOM as a container for its
 * web components. It does NOT define it via customElements.define itself
 * — it just queries for it. We register a minimal placeholder so Vue
 * stops trying to resolve it as a Vue component.
 */
if (!customElements.get('cq-context')) {
  class CqContext extends HTMLElement {
    constructor() {
      super()
    }
    connectedCallback() {
      // ChartIQ will populate this element — nothing to do here
    }
  }
  customElements.define('cq-context', CqContext)
}

export {}
