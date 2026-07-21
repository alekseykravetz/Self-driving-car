// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditorToolbarElement } from '../../../ts/ui/molecules/editorToolbar.js';
import type { EditorType } from '../../../ts/simulator/types.js';

function createElement(): EditorToolbarElement {
  const el = new EditorToolbarElement();
  document.body.appendChild(el);
  el.connectedCallback();
  return el;
}

describe('EditorToolbarElement', () => {
  let el: EditorToolbarElement;

  beforeEach(() => {
    el = createElement();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('connectedCallback renders template', () => {
    const buttons = el.querySelectorAll('.editor-mode-btn');
    expect(buttons.length).toBeGreaterThan(0);
    expect(el.id).toBe('editorToolbar');
  });

  it('setMode updates active button class', () => {
    el.setMode('graph');
    expect(
      el.querySelector('[data-mode="graph"]')!.classList.contains('active'),
    ).toBe(true);
    expect(
      el.querySelector('[data-mode="stop"]')!.classList.contains('active'),
    ).toBe(false);

    el.setMode('stop');
    expect(
      el.querySelector('[data-mode="stop"]')!.classList.contains('active'),
    ).toBe(true);
    expect(
      el.querySelector('[data-mode="graph"]')!.classList.contains('active'),
    ).toBe(false);
  });

  it('setModeChangeListener fires on button click', () => {
    const listener = vi.fn();
    el.setModeChangeListener(listener);

    el.querySelector<HTMLButtonElement>('[data-mode="crossing"]')!.click();
    expect(listener).toHaveBeenCalledWith('crossing');

    el.querySelector<HTMLButtonElement>('[data-mode="light"]')!.click();
    expect(listener).toHaveBeenCalledWith('light');
  });

  it('multiple editor modes are rendered', () => {
    const modes = el.querySelectorAll<HTMLButtonElement>('.editor-mode-btn');
    const dataModes = Array.from(modes).map(
      (btn) => btn.dataset.mode as EditorType,
    );
    expect(dataModes).toContain('graph');
    expect(dataModes).toContain('marking');
    expect(dataModes).toContain('stop');
    expect(dataModes).toContain('crossing');
    expect(dataModes).toContain('yield');
    expect(dataModes).toContain('parking');
    expect(dataModes).toContain('light');
    expect(dataModes).toContain('corridor');
    expect(dataModes).toContain('start');
    expect(dataModes).toContain('target');
  });
});
