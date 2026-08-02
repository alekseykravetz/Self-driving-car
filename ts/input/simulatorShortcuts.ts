import type { ShortcutBinding } from './keyboardManager.js';

/**
 * Shared simulator gameplay shortcuts.
 *
 * The three simulators (training, traffic, human-backprop) share several
 * identical `ShortcutBinding` object literals: the Drive arrow/WASD indicators,
 * the green-wave `G` toggle, and the network-visualizer density `V` toggle.
 * Declaring them once here — mirroring {@link zoomViewBindings} — keeps the
 * toolbar consistent and means a wording or key change is made in one place.
 *
 * Every factory returns FRESH binding objects so the (mutable) bindings owned by
 * one page's `KeyboardManager` can never be shared with another's.
 */

/**
 * Arrow / WASD "Drive" display indicators (the user drives the KEYS car).
 * Used by the training and human-backprop simulators.
 * @param carLabel - Phrase naming the car being driven, appended to the
 *   accelerate tooltip (e.g. `'the 🎮 user car'` or the default `'the car'`).
 */
export function driveKeyBindings(
  carLabel: string = 'the car',
): ShortcutBinding[] {
  return [
    {
      id: 'keyUp',
      key: '',
      label: '↑ / W',
      title: `Arrow Up / W — Accelerate (drive ${carLabel})`,
      group: 'Drive',
      kind: 'display',
      keys: ['ArrowUp', 'w'],
    },
    {
      id: 'keyDown',
      key: '',
      label: '↓ / S',
      title: 'Arrow Down / S — Brake / reverse',
      group: 'Drive',
      kind: 'display',
      keys: ['ArrowDown', 's'],
    },
    {
      id: 'keyLeft',
      key: '',
      label: '← / A',
      title: 'Arrow Left / A — Steer left',
      group: 'Drive',
      kind: 'display',
      keys: ['ArrowLeft', 'a'],
    },
    {
      id: 'keyRight',
      key: '',
      label: '→ / D',
      title: 'Arrow Right / D — Steer right',
      group: 'Drive',
      kind: 'display',
      keys: ['ArrowRight', 'd'],
    },
  ];
}

/**
 * Green-wave `G` toggle — forces all traffic lights green, then restores normal
 * cycling. Used by the training and traffic simulators (whose enable/disable
 * callbacks and toolbar group differ).
 * @param opts.group - Toolbar group the indicator appears under.
 * @param opts.onActivate - Called when the green wave is turned on.
 * @param opts.onDeactivate - Called when normal cycling is restored.
 */
export function greenWaveBinding(opts: {
  group: string;
  onActivate: () => void;
  onDeactivate: () => void;
}): ShortcutBinding {
  return {
    id: 'keyG',
    key: 'g',
    label: 'G',
    title:
      'G — Toggle global green wave for all traffic lights. Press once to force all lights green, again to restore normal cycling.',
    group: opts.group,
    kind: 'toggle',
    toggle: {
      onActivate: opts.onActivate,
      onDeactivate: opts.onDeactivate,
    },
  };
}

/**
 * `V` momentary toggle for the network-visualizer density. Used by all three
 * simulators.
 * @param onToggle - Called on each `V` press to flip the visualizer density.
 */
export function visualizerDensityBinding(
  onToggle: () => void,
): ShortcutBinding {
  return {
    id: 'visDensity',
    key: 'v',
    label: 'V',
    title: 'V — Toggle network visualizer density (show all values)',
    group: 'Visualizer',
    kind: 'momentary',
    handler: {
      onKeyDown: onToggle,
    },
  };
}
