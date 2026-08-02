import type { ShortcutBinding } from './keyboardManager.js';

/**
 * Shared "View" group zoom shortcuts.
 *
 * Every page with a pannable/zoomable {@link Viewport} shows the same two
 * scroll-wheel modifier indicators: `Ctrl` (zoom in touchpad mode) and `Shift`
 * (slow, fine-grained zoom). Defining them here — instead of re-typing the same
 * object literals in each simulator / editor — keeps the toolbar consistent and
 * means a wording or key change is made in exactly one place.
 *
 * Each call returns FRESH binding objects so the (mutable) bindings owned by one
 * page's `KeyboardManager` can never be shared with another's.
 *
 * @param includeShift - Whether to include the Shift fine-zoom indicator.
 *   Pass `false` for simple-mode simulators (the flat, vertically-scrolling
 *   road) where fine-zoom framing is not useful.
 */
export function zoomViewBindings(
  includeShift: boolean = true,
): ShortcutBinding[] {
  const bindings: ShortcutBinding[] = [
    {
      id: 'keyCtrl',
      key: '',
      label: 'Ctrl',
      title: 'Ctrl + scroll wheel — Zoom in/out (touchpad mode)',
      group: 'View',
      kind: 'display',
      keys: ['Control'],
    },
  ];

  if (includeShift) {
    bindings.push({
      id: 'keyShift',
      key: '',
      label: 'Shift',
      title: 'Shift + scroll wheel — Slow, fine-grained zoom',
      group: 'View',
      kind: 'display',
      keys: ['Shift'],
    });
  }

  return bindings;
}
