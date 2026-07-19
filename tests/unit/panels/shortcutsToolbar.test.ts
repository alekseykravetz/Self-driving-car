// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShortcutsToolbarElement } from '../../../ts/panels/shortcutsToolbar.js';
import type { ShortcutDef } from '../../../ts/panels/shortcutsToolbar.js';

function createElement(): ShortcutsToolbarElement {
  const el = new ShortcutsToolbarElement();
  document.body.appendChild(el);
  el.connectedCallback();
  return el;
}

describe('ShortcutsToolbarElement', () => {
  let el: ShortcutsToolbarElement;

  beforeEach(() => {
    el = createElement();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('connectedCallback renders template', () => {
    const container = el.querySelector('.shortcuts-groups');
    expect(container).not.toBeNull();
  });

  it('setShortcuts renders indicator HTML', () => {
    const defs: ShortcutDef[] = [
      {
        id: 'keyG',
        label: 'G',
        title: 'Graph mode',
        group: 'Editor',
        kind: 'momentary',
      },
    ];
    el.setShortcuts(defs);

    const indicator = el.querySelector('#keyG');
    expect(indicator).not.toBeNull();
    expect(indicator!.textContent).toBe('G');
    expect(indicator!.getAttribute('data-tooltip')).toBe('Graph mode');
  });

  it('setShortcuts groups by group name', () => {
    const defs: ShortcutDef[] = [
      {
        id: 'keyA',
        label: 'A',
        title: 'Action A',
        group: 'Group1',
        kind: 'momentary',
      },
      {
        id: 'keyB',
        label: 'B',
        title: 'Action B',
        group: 'Group1',
        kind: 'momentary',
      },
      {
        id: 'keyC',
        label: 'C',
        title: 'Action C',
        group: 'Group2',
        kind: 'momentary',
      },
    ];
    el.setShortcuts(defs);

    const groups = el.querySelectorAll('.controls-group');
    expect(groups).toHaveLength(2);
    expect(groups[0].querySelector('.controls-group-label')!.textContent).toBe(
      'Group1',
    );
    expect(groups[1].querySelector('.controls-group-label')!.textContent).toBe(
      'Group2',
    );

    const separators = el.querySelectorAll('.controls-separator');
    expect(separators).toHaveLength(1);
  });

  it('setShortcuts shows clickable class for toggle keys', () => {
    const defs: ShortcutDef[] = [
      {
        id: 'keyO',
        label: 'O',
        title: 'One way',
        group: 'Editor',
        kind: 'toggle',
      },
      {
        id: 'keyS',
        label: 'S',
        title: 'Select',
        group: 'Editor',
        kind: 'momentary',
      },
    ];
    el.setShortcuts(defs);

    const toggleEl = el.querySelector('#keyO');
    expect(toggleEl!.classList.contains('clickable')).toBe(true);

    const momentaryEl = el.querySelector('#keyS');
    expect(momentaryEl!.classList.contains('clickable')).toBe(false);
  });

  it('setActive adds "active" class', () => {
    const defs: ShortcutDef[] = [
      {
        id: 'keyO',
        label: 'O',
        title: 'One way',
        group: 'Editor',
        kind: 'toggle',
      },
    ];
    el.setShortcuts(defs);

    el.setActive('keyO', true);
    expect(el.querySelector('#keyO')!.classList.contains('active')).toBe(true);
  });

  it('setActive removes "active" class when called with false', () => {
    const defs: ShortcutDef[] = [
      {
        id: 'keyO',
        label: 'O',
        title: 'One way',
        group: 'Editor',
        kind: 'toggle',
      },
    ];
    el.setShortcuts(defs);

    el.setActive('keyO', true);
    el.setActive('keyO', false);
    expect(el.querySelector('#keyO')!.classList.contains('active')).toBe(false);
  });

  it('setToggleHandler registers click handler', () => {
    const defs: ShortcutDef[] = [
      {
        id: 'keyO',
        label: 'O',
        title: 'One way',
        group: 'Editor',
        kind: 'toggle',
      },
    ];
    el.setShortcuts(defs);

    const handler = vi.fn();
    el.setToggleHandler(handler);

    el.querySelector<HTMLElement>('#keyO')!.click();
    expect(handler).toHaveBeenCalledWith('keyO');
  });

  it('flash adds "flash" class briefly', () => {
    vi.useFakeTimers();

    const defs: ShortcutDef[] = [
      {
        id: 'keyG',
        label: 'G',
        title: 'Graph mode',
        group: 'Editor',
        kind: 'momentary',
      },
    ];
    el.setShortcuts(defs);

    el.flash('keyG');
    expect(el.querySelector('#keyG')!.classList.contains('flash')).toBe(true);

    vi.advanceTimersByTime(300);
    expect(el.querySelector('#keyG')!.classList.contains('flash')).toBe(false);

    vi.useRealTimers();
  });

  it('flash on non-existent element does not throw', () => {
    expect(() => el.flash('nonexistent')).not.toThrow();
  });
});
