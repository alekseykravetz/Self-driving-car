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
export class SimulatorPageHost {
  toolbarPanel;
  layoutToolbar;
  animationLoopToolbar;
  worldLayersToolbar;
  constructor() {
    this.toolbarPanel = document.querySelector('world-toolbar');
    this.layoutToolbar = document.querySelector('layout-toolbar');
    this.animationLoopToolbar = document.querySelector(
      'animation-loop-toolbar',
    );
    this.worldLayersToolbar = document.querySelector('world-layers-toolbar');
  }
}
