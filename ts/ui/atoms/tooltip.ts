/**
 * Global tooltip controller — the single source of truth for every
 * `[data-tooltip]` hint in the app.
 *
 * A single `<div class="app-tooltip">` is appended to `document.body` and
 * shared by all targets, so tooltips escape any scrollable/`overflow` panel
 * (e.g. the world-editor road panel) instead of being clipped or spawning
 * horizontal scrollbars — the failure mode of the old CSS `::after` tooltips,
 * which were laid out inside their host element's box.
 *
 * Behaviour:
 *  - Shown after a short hover delay (mouse/pen) or immediately on focus.
 *  - Positioned below the target, flipped above when it would overflow the
 *    viewport, and clamped horizontally so it never runs off-screen.
 *  - Hidden on leave, scroll, wheel, pointer-down, and Escape.
 *  - Touch pointers are ignored (there is no hover on touch).
 */

const SHOW_DELAY_MS = 500;
const GAP_PX = 8;
const VIEWPORT_MARGIN_PX = 4;

class TooltipController {
  #el: HTMLDivElement | null = null;
  #current: HTMLElement | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;

  init(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('pointerover', this.#onPointerOver, true);
    document.addEventListener('pointerout', this.#onPointerOut, true);
    document.addEventListener('focusin', this.#onFocusIn, true);
    document.addEventListener('focusout', this.#onFocusOut, true);
    document.addEventListener('pointerdown', this.#hide, true);
    window.addEventListener('scroll', this.#hide, true);
    window.addEventListener('wheel', this.#hide, {
      capture: true,
      passive: true,
    });
    window.addEventListener('keydown', this.#onKeyDown, true);
  }

  #targetFrom(node: EventTarget | null): HTMLElement | null {
    if (!(node instanceof Element)) return null;
    const el = node.closest('[data-tooltip]');
    return el instanceof HTMLElement && el.getAttribute('data-tooltip')
      ? el
      : null;
  }

  #onPointerOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const target = this.#targetFrom(e.target);
    if (!target || target === this.#current) return;
    this.#schedule(target);
  };

  #onPointerOut = (e: PointerEvent): void => {
    const target = this.#targetFrom(e.target);
    if (!target || target !== this.#current) return;
    const related = e.relatedTarget;
    if (related instanceof Node && target.contains(related)) return;
    this.#hide();
  };

  #onFocusIn = (e: FocusEvent): void => {
    const target = this.#targetFrom(e.target);
    if (target) this.#schedule(target);
  };

  #onFocusOut = (e: FocusEvent): void => {
    const target = this.#targetFrom(e.target);
    if (target && target === this.#current) this.#hide();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.#hide();
  };

  #schedule(target: HTMLElement): void {
    this.#hide();
    this.#current = target;
    this.#timer = setTimeout(() => this.#show(target), SHOW_DELAY_MS);
  }

  #show(target: HTMLElement): void {
    if (target !== this.#current || !target.isConnected) return;
    const text = target.getAttribute('data-tooltip');
    if (!text) return;
    const el = this.#ensure();
    el.textContent = text;
    this.#position(target, el);
    el.classList.add('visible');
  }

  #position(target: HTMLElement, el: HTMLDivElement): void {
    const rect = target.getBoundingClientRect();
    const tip = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    let top = rect.bottom + GAP_PX;
    if (top + tip.height > vh - VIEWPORT_MARGIN_PX) {
      const above = rect.top - GAP_PX - tip.height;
      if (above >= VIEWPORT_MARGIN_PX) top = above;
    }
    top = Math.max(
      VIEWPORT_MARGIN_PX,
      Math.min(top, vh - VIEWPORT_MARGIN_PX - tip.height),
    );

    let left = rect.left;
    left = Math.max(
      VIEWPORT_MARGIN_PX,
      Math.min(left, vw - VIEWPORT_MARGIN_PX - tip.width),
    );

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  #ensure(): HTMLDivElement {
    if (!this.#el) {
      const el = document.createElement('div');
      el.className = 'app-tooltip';
      el.setAttribute('role', 'tooltip');
      document.body.appendChild(el);
      this.#el = el;
    }
    return this.#el;
  }

  #hide = (): void => {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
    this.#current = null;
    this.#el?.classList.remove('visible');
  };
}

export const tooltipController = new TooltipController();
tooltipController.init();
