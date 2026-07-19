// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  KeyboardManager,
  ShortcutBinding,
} from '../../../ts/panels/keyboardManager.js';
import {
  ShortcutDef,
  ShortcutsToolbarElement,
} from '../../../ts/panels/shortcutsToolbar.js';

function createToolbarMock() {
  return {
    setShortcuts: vi.fn(),
    flash: vi.fn(),
    setActive: vi.fn(),
    setToggleHandler: vi.fn(),
  };
}

function createBinding(
  overrides: Partial<ShortcutBinding> & { kind: string; id: string },
): ShortcutBinding {
  return {
    key: 'x',
    label: 'X',
    title: 'Test key X',
    group: 'Test',
    ...overrides,
  } as ShortcutBinding;
}

describe('KeyboardManager', () => {
  let toolbar: ReturnType<typeof createToolbarMock>;
  let km: KeyboardManager;

  beforeEach(() => {
    toolbar = createToolbarMock();
    km = new KeyboardManager(toolbar as unknown as ShortcutsToolbarElement);
  });

  afterEach(() => {
    km.dispose();
  });

  describe('construction', () => {
    it('creates instance with empty bindings', () => {
      expect(toolbar.setShortcuts).not.toHaveBeenCalled();
    });
  });

  describe('setBindings', () => {
    it('replaces root bindings and renders toolbar', () => {
      const binding = createBinding({
        id: 'testKey',
        kind: 'momentary',
        key: 'x',
      });
      km.setBindings([binding]);
      expect(toolbar.setShortcuts).toHaveBeenCalledTimes(1);
      const defs = toolbar.setShortcuts.mock.calls[0][0];
      expect(defs).toHaveLength(1);
      expect(defs[0].id).toBe('testKey');
      expect(defs[0].kind).toBe('momentary');
    });

    it('calling setBindings again replaces previous bindings', () => {
      km.setBindings([createBinding({ id: 'a', kind: 'momentary', key: 'a' })]);
      km.setBindings([createBinding({ id: 'b', kind: 'momentary', key: 'b' })]);
      const defs = toolbar.setShortcuts.mock.calls[1][0];
      expect(defs).toHaveLength(1);
      expect(defs[0].id).toBe('b');
    });
  });

  describe('pushBindings / popBindings', () => {
    it('pushBindings adds bindings to the combined set', () => {
      km.setBindings([
        createBinding({ id: 'a', kind: 'momentary', key: 'a', group: 'G1' }),
      ]);
      km.pushBindings([
        createBinding({ id: 'b', kind: 'momentary', key: 'b', group: 'G2' }),
      ]);
      const defs = toolbar.setShortcuts.mock.calls[1][0];
      expect(defs).toHaveLength(2);
    });

    it('popBindings restores root-only set', () => {
      km.setBindings([createBinding({ id: 'a', kind: 'momentary', key: 'a' })]);
      km.pushBindings([
        createBinding({ id: 'b', kind: 'momentary', key: 'b' }),
      ]);
      km.popBindings();
      const defs = toolbar.setShortcuts.mock.calls[2][0];
      expect(defs).toHaveLength(1);
      expect(defs[0].id).toBe('a');
    });

    it('pushBindings twice replaces previous pushed set', () => {
      km.setBindings([createBinding({ id: 'a', kind: 'momentary', key: 'a' })]);
      km.pushBindings([
        createBinding({ id: 'b', kind: 'momentary', key: 'b' }),
      ]);
      km.pushBindings([
        createBinding({ id: 'c', kind: 'momentary', key: 'c' }),
      ]);
      const defs = toolbar.setShortcuts.mock.calls[2][0];
      expect(defs).toHaveLength(2);
      expect(defs.map((d: ShortcutDef) => d.id)).toEqual(['a', 'c']);
    });
  });

  describe('momentary key handling', () => {
    it('keydown fires the handler', () => {
      const handler = vi.fn();
      km.setBindings([
        createBinding({
          id: 'g',
          kind: 'momentary',
          key: 'g',
          handler: { onKeyDown: handler },
        }),
      ]);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('keydown flashes the toolbar', () => {
      km.setBindings([createBinding({ id: 'g', kind: 'momentary', key: 'g' })]);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
      expect(toolbar.flash).toHaveBeenCalledWith('g');
    });

    it('different key does not fire handler', () => {
      const handler = vi.fn();
      km.setBindings([
        createBinding({
          id: 'g',
          kind: 'momentary',
          key: 'g',
          handler: { onKeyDown: handler },
        }),
      ]);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('keydown is ignored when target is INPUT element', () => {
      const handler = vi.fn();
      km.setBindings([
        createBinding({
          id: 'g',
          kind: 'momentary',
          key: 'g',
          handler: { onKeyDown: handler },
        }),
      ]);
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'g', bubbles: true }),
      );
      document.body.removeChild(input);
      expect(handler).not.toHaveBeenCalled();
    });

    it('keydown is ignored when target is TEXTAREA', () => {
      const handler = vi.fn();
      km.setBindings([
        createBinding({
          id: 'g',
          kind: 'momentary',
          key: 'g',
          handler: { onKeyDown: handler },
        }),
      ]);
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'g', bubbles: true }),
      );
      document.body.removeChild(textarea);
      expect(handler).not.toHaveBeenCalled();
    });

    it('keydown is ignored when target is contentEditable', () => {
      const handler = vi.fn();
      km.setBindings([
        createBinding({
          id: 'g',
          kind: 'momentary',
          key: 'g',
          handler: { onKeyDown: handler },
        }),
      ]);
      const div = document.createElement('div');
      // jsdom does not implement isContentEditable natively, so we define it manually
      Object.defineProperty(div, 'isContentEditable', {
        value: true,
        configurable: true,
      });
      document.body.appendChild(div);
      div.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'g', bubbles: true }),
      );
      document.body.removeChild(div);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('toggle (held/latched) key handling', () => {
    it('keydown calls onActivate, keyup calls onDeactivate', () => {
      const onActivate = vi.fn();
      const onDeactivate = vi.fn();
      km.setBindings([
        createBinding({
          id: 'o',
          kind: 'toggle',
          key: 'o',
          toggle: { onActivate, onDeactivate },
        }),
      ]);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(toolbar.setActive).toHaveBeenCalledWith('o', true);

      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'o' }));
      expect(onDeactivate).toHaveBeenCalledTimes(1);
      expect(toolbar.setActive).toHaveBeenCalledWith('o', false);
    });

    it('click-to-latch via toolbar triggers toggle', () => {
      km.setBindings([
        createBinding({
          id: 'o',
          kind: 'toggle',
          key: 'o',
          toggle: { onActivate: vi.fn(), onDeactivate: vi.fn() },
        }),
      ]);

      expect(toolbar.setToggleHandler).toHaveBeenCalledTimes(1);
      const handler = toolbar.setToggleHandler.mock.calls[0][0];
      handler('o');
      expect(toolbar.setActive).toHaveBeenCalledWith('o', true);
    });
  });

  describe('toggle (latchOnly) key handling', () => {
    it('keydown toggles latch, keyup is no-op', () => {
      const onActivate = vi.fn();
      const onDeactivate = vi.fn();
      km.setBindings([
        createBinding({
          id: 'l',
          kind: 'toggle',
          key: 'l',
          latchOnly: true,
          toggle: { onActivate, onDeactivate },
        }),
      ]);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(toolbar.setActive).toHaveBeenCalledWith('l', true);

      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'l' }));
      expect(onDeactivate).not.toHaveBeenCalled();

      toolbar.setActive.mockClear();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
      expect(onDeactivate).toHaveBeenCalledTimes(1);
      expect(toolbar.setActive).toHaveBeenCalledWith('l', false);
    });
  });

  describe('display keys', () => {
    it('keydown sets indicator active, keyup sets inactive', () => {
      km.setBindings([
        {
          id: 'ctrl',
          label: 'Ctrl',
          title: 'Ctrl zoom',
          group: 'View',
          kind: 'display',
          display: true,
          keys: ['Control'],
        } as ShortcutBinding,
      ]);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
      expect(toolbar.setActive).toHaveBeenCalledWith('ctrl', true);

      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
      expect(toolbar.setActive).toHaveBeenCalledWith('ctrl', false);
    });

    it('multiple display keys light up on any matching key', () => {
      km.setBindings([
        {
          id: 'driveKeys',
          label: 'WASD',
          title: 'Drive keys',
          group: 'Drive',
          kind: 'display',
          display: true,
          keys: ['w', 'a', 's', 'd'],
        } as ShortcutBinding,
      ]);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      expect(toolbar.setActive).toHaveBeenCalledWith('driveKeys', true);

      toolbar.setActive.mockClear();
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      expect(toolbar.setActive).toHaveBeenCalledWith('driveKeys', false);
    });
  });

  describe('setToggleActive', () => {
    it('programmatically activates a toggle binding', () => {
      const onActivate = vi.fn();
      km.setBindings([
        createBinding({
          id: 't',
          kind: 'toggle',
          key: 't',
          toggle: { onActivate, onDeactivate: vi.fn() },
        }),
      ]);

      km.setToggleActive('t', true);
      expect(onActivate).toHaveBeenCalled();
      expect(toolbar.setActive).toHaveBeenCalledWith('t', true);
    });

    it('programmatically deactivates a toggle binding', () => {
      const onDeactivate = vi.fn();
      km.setBindings([
        createBinding({
          id: 't',
          kind: 'toggle',
          key: 't',
          toggle: { onActivate: vi.fn(), onDeactivate },
        }),
      ]);

      km.setToggleActive('t', true);
      km.setToggleActive('t', false);
      expect(onDeactivate).toHaveBeenCalled();
    });

    it('no-op when toggle is already in desired state', () => {
      const onActivate = vi.fn();
      km.setBindings([
        createBinding({
          id: 't',
          kind: 'toggle',
          key: 't',
          toggle: { onActivate, onDeactivate: vi.fn() },
        }),
      ]);

      km.setToggleActive('t', true);
      const calls = onActivate.mock.calls.length;
      km.setToggleActive('t', true);
      expect(onActivate).toHaveBeenCalledTimes(calls);
    });

    it('no-op for non-existent binding id', () => {
      expect(() => km.setToggleActive('nonexistent', true)).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('can be called without error', () => {
      expect(() => km.dispose()).not.toThrow();
    });

    it('after dispose, key events are not processed', () => {
      const handler = vi.fn();
      km.setBindings([
        createBinding({
          id: 'g',
          kind: 'momentary',
          key: 'g',
          handler: { onKeyDown: handler },
        }),
      ]);
      km.dispose();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
