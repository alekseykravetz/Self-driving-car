import { ICON_REGISTRY, isIconName, type IconName } from './iconRegistry.js';

/**
 * `<app-icon>` — the single custom element used to render every icon in the
 * app. It inlines the SVG for the requested `name` from {@link ICON_REGISTRY}
 * into the light DOM, so the global stylesheet (`styles/atoms/_icon.css`) can
 * size, colour, and animate it.
 *
 * Attributes:
 *  - `name`    (required) — an {@link IconName} from the registry.
 *  - `animate` (optional) — presence enables the icon's idle/looping animation.
 *                           Absent icons still animate on hover of the icon or
 *                           its enclosing button.
 *  - `label`   (optional) — accessible label. When omitted the icon is marked
 *                           `aria-hidden` (decorative, e.g. next to text).
 *
 * Colour: monochrome icons follow `currentColor`; multi-colour icons read the
 * `--icon-a/-b/-c` custom properties (with token fallbacks). Size follows the
 * inherited `font-size` (the SVG is `1em`), overridable via CSS `width/height`.
 */
export class AppIconElement extends HTMLElement {
  static readonly observedAttributes = ['name', 'animate', 'label'];

  connectedCallback(): void {
    this.#render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#render();
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: IconName) {
    this.setAttribute('name', value);
  }

  #render(): void {
    const name = this.name;
    const inner = isIconName(name) ? ICON_REGISTRY[name] : '';
    const animated = this.hasAttribute('animate') ? ' is-animated' : '';
    const label = this.getAttribute('label');

    if (label) {
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', label);
    } else {
      this.setAttribute('aria-hidden', 'true');
    }

    this.innerHTML = `<svg class="app-icon-svg${animated}" viewBox="0 0 24 24" width="1em" height="1em" focusable="false">${inner}</svg>`;
  }
}

if (!customElements.get('app-icon')) {
  customElements.define('app-icon', AppIconElement);
}
