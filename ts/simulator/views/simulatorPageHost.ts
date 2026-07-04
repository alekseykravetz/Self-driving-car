/**
 * SimulatorPageHost — lightweight configuration object that carries the
 * shared toolbar / panel element references every simulator page needs.
 *
 * Instead of having SimulatorShell reach into the global document with
 * `document.querySelector`, the host object is created once per page and
 * injected into the shell constructor. This keeps the shell decoupled
 * from page-specific DOM structure and makes it easier to reuse the shell
 * on pages with different layouts.
 */
class SimulatorPageHost {
  readonly toolbarPanel: WorldToolbarElement;
  readonly layoutToolbar: LayoutToolbarElement;
  readonly animationLoopToolbar: AnimationLoopToolbarElement;
  readonly worldLayersToolbar: WorldLayersToolbarElement | null;

  constructor() {
    this.toolbarPanel = document.querySelector(
      'world-toolbar',
    ) as WorldToolbarElement;
    this.layoutToolbar = document.querySelector(
      'layout-toolbar',
    ) as LayoutToolbarElement;
    this.animationLoopToolbar = document.querySelector(
      'animation-loop-toolbar',
    ) as AnimationLoopToolbarElement;
    this.worldLayersToolbar = document.querySelector('world-layers-toolbar');
  }
}
