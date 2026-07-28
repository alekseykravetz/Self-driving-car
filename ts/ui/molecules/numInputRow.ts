import type { IconName } from '../atoms/iconRegistry.js';

export interface NumInputRowOptions {
  /** The id assigned to the `<input>` (also used as the buttons' data-target). */
  id: string;
  /** Human-readable label shown above the control. */
  label: string;
  /** Icon rendered before the label. */
  icon: IconName;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  /** Optional initial value for the `<input>`. */
  value?: number | string;
  title?: string;
}

/**
 * Build the HTML for a labelled numeric input flanked by decrement / increment
 * buttons (the `.num-input-row` pattern used across the training panels).
 * Wire the buttons with {@link wireNumInputRows} after inserting the markup.
 */
export function numInputRowHtml(o: NumInputRowOptions): string {
  const attrs = [
    o.min !== undefined ? `min="${o.min}"` : '',
    o.max !== undefined ? `max="${o.max}"` : '',
    o.step !== undefined ? `step="${o.step}"` : '',
    o.value !== undefined ? `value="${o.value}"` : '',
    o.title ? `title="${o.title}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `
    <div class="ctrl">
      <span class="ctrl-label"><app-icon name="${o.icon}"></app-icon> ${o.label}</span>
      <div class="num-input-row">
        <button type="button" class="num-btn num-btn-dec" data-target="${o.id}"><app-icon name="minus"></app-icon></button>
        <input type="number" id="${o.id}" ${attrs} />
        <button type="button" class="num-btn num-btn-inc" data-target="${o.id}"><app-icon name="plus"></app-icon></button>
      </div>
    </div>`;
}

/**
 * Attach click handlers to every `.num-btn` inside `root` so they step their
 * target `<input type="number">` by its `step`, clamped to `min`/`max`, and
 * dispatch a `change` event. Disabled inputs are ignored.
 */
export function wireNumInputRows(root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>('.num-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      if (!targetId) return;
      const input = root.querySelector<HTMLInputElement>(`#${targetId}`);
      if (!input || input.disabled) return;
      const step = parseFloat(input.step) || 1;
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      let val = parseFloat(input.value) || 0;
      val += btn.classList.contains('num-btn-inc') ? step : -step;
      if (!Number.isNaN(min)) val = Math.max(min, val);
      if (!Number.isNaN(max)) val = Math.min(max, val);
      input.value = String(parseFloat(val.toFixed(4)));
      input.dispatchEvent(new Event('change'));
    });
  });
}
