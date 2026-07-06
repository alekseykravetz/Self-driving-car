import type { LayoutMode } from '../../panels/layoutToolbar.js';
import type { Viewport } from '../../../viewport/viewport.js';
import { Point } from '../../../math/primitives/point.js';

/**
 * Layout constants and resize logic for the simulator canvas arrangement.
 */

export const LAYOUT_CONTROL_PANEL_WIDTH = 200;
export const LAYOUT_NETWORK_PANEL_WIDTH = 300;
export const LAYOUT_SMALL_VIEW_WIDTH = 300;

// Phone breakpoint — kept in sync with the 768px CSS media query. On mobile the
// training panel is shrunk (CSS) and the secondary 3D view is scaled down so the
// top-down view, 3D view and panel all fit on a narrow screen.
const LAYOUT_MOBILE_MAX_WIDTH = 768;
const LAYOUT_MOBILE_CONTROL_PANEL_WIDTH = 140;
const LAYOUT_MOBILE_MIN_SMALL_VIEW_WIDTH = 90;

export interface LayoutCanvases {
  gameCanvas: HTMLCanvasElement;
  networkCanvas: HTMLCanvasElement;
  miniMapCanvas: HTMLCanvasElement;
  cameraCanvas: HTMLCanvasElement;
}

export interface LayoutPanelState {
  showCamera: boolean;
  showNetwork: boolean;
  showMiniMap: boolean;
  layoutMode: LayoutMode;
}

export function resizeSimulatorLayout(
  canvases: LayoutCanvases,
  panelState: LayoutPanelState,
  viewport: Viewport | null,
): void {
  const { gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas } = canvases;
  const { showCamera, showNetwork, showMiniMap, layoutMode } = panelState;

  // Prefer the real flex layout box (#simulatorLayout) for the total width. Its
  // clientWidth is the actual space the canvases + panels share, which avoids
  // the window.innerWidth discrepancy seen on some phones (e.g. Galaxy S21
  // Ultra) where innerWidth ignores the visual viewport and the rightmost panel
  // gets clipped.
  const layoutEl = document.getElementById('simulatorLayout');
  const viewportWidth =
    layoutEl?.clientWidth ||
    document.documentElement.clientWidth ||
    window.innerWidth;

  const isMobile = viewportWidth <= LAYOUT_MOBILE_MAX_WIDTH;

  // The control panel width is driven by CSS (and differs per breakpoint). Rather
  // than trusting a hardcoded constant that can drift from what the browser
  // actually renders, measure the live panel. Fall back to the constants when no
  // panel element is present yet.
  const controlPanelEl =
    document.getElementById('trainingManagerPanel') ??
    document.getElementById('trafficStatsPanel');
  const measuredControlWidth = controlPanelEl?.getBoundingClientRect().width;

  // Calculate used width by fixed panels
  let usedWidth =
    measuredControlWidth && measuredControlWidth > 0
      ? Math.ceil(measuredControlWidth)
      : isMobile
        ? LAYOUT_MOBILE_CONTROL_PANEL_WIDTH
        : LAYOUT_CONTROL_PANEL_WIDTH;

  // The mini-map floats as an overlay (instead of occupying the right panel)
  // whenever the network visualizer is hidden. In that state it no longer
  // consumes layout width, so the top-down/3D views can use the full space.
  const floatingMiniMap = showMiniMap && !showNetwork;

  // Network + minimap panel. Only the network visualizer reserves layout width;
  // a floating mini-map is taken out of flow and costs nothing.
  const networkPanelWidth = showNetwork ? LAYOUT_NETWORK_PANEL_WIDTH : 0;
  usedWidth += networkPanelWidth;

  // Right panel element visibility. Kept visible while a floating mini-map is
  // shown so its canvas child still renders; the panel collapses to zero width
  // because the floating canvas is positioned out of flow.
  const rightPanel = document.getElementById('rightPanel');
  if (rightPanel) {
    rightPanel.style.display = showNetwork || showMiniMap ? 'flex' : 'none';
  }

  // Network canvas
  if (showNetwork) {
    networkCanvas.style.display = 'block';
    networkCanvas.width = LAYOUT_NETWORK_PANEL_WIDTH;
    networkCanvas.height = showMiniMap
      ? window.innerHeight - LAYOUT_NETWORK_PANEL_WIDTH
      : window.innerHeight;
  } else {
    networkCanvas.style.display = 'none';
  }

  // Mini map canvas
  if (showMiniMap) {
    miniMapCanvas.style.display = 'block';
    miniMapCanvas.classList.toggle('floating', floatingMiniMap);
    miniMapCanvas.width = LAYOUT_NETWORK_PANEL_WIDTH;
    miniMapCanvas.height = LAYOUT_NETWORK_PANEL_WIDTH;
  } else {
    miniMapCanvas.style.display = 'none';
    miniMapCanvas.classList.remove('floating');
  }

  // Layout mode: compute main and secondary view widths
  const availableWidth = Math.floor(viewportWidth - usedWidth);

  if (showCamera) {
    // On mobile shrink the secondary view to a fraction of the available width
    // (clamped) so the main view never collapses to a negative width.
    const secondaryWidth = isMobile
      ? Math.max(
          LAYOUT_MOBILE_MIN_SMALL_VIEW_WIDTH,
          Math.round(availableWidth * 0.4),
        )
      : LAYOUT_SMALL_VIEW_WIDTH;
    const mainWidth = availableWidth - secondaryWidth;
    const topViewBig = layoutMode === 'topview-big';

    gameCanvas.width = topViewBig ? mainWidth : secondaryWidth;
    gameCanvas.height = window.innerHeight;
    cameraCanvas.width = topViewBig ? secondaryWidth : mainWidth;
    cameraCanvas.height = window.innerHeight;
    cameraCanvas.style.display = 'block';
    gameCanvas.style.order = topViewBig ? '0' : '1';
    cameraCanvas.style.order = topViewBig ? '1' : '0';
  } else {
    // No camera view - game canvas takes all available space
    gameCanvas.width = availableWidth;
    gameCanvas.height = window.innerHeight;
    cameraCanvas.style.display = 'none';
    gameCanvas.style.order = '0';
  }

  if (viewport) {
    viewport.center = new Point(gameCanvas.width / 2, window.innerHeight / 2);
  }
}
