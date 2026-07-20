import type { LayoutMode } from '../../ui/molecules/layoutToolbar.js';
import type { Viewport } from '../../viewport/viewport.js';
import { Point } from '../../math/primitives/point.js';

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

interface CachedLayout {
  viewportWidth: number;
  controlPanelWidth: number;
  innerHeight: number;
  showCamera: boolean;
  showNetwork: boolean;
  showMiniMap: boolean;
  layoutMode: LayoutMode;
}

let _cachedLayout: CachedLayout | null = null;

export function resizeSimulatorLayout(
  canvases: LayoutCanvases,
  panelState: LayoutPanelState,
  viewport: Viewport | null,
): void {
  const { gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas } = canvases;
  const { showCamera, showNetwork, showMiniMap, layoutMode } = panelState;

  // ── Batch all layout reads first ──
  const layoutEl = document.getElementById('simulatorLayout');
  const viewportWidth =
    layoutEl?.clientWidth ||
    document.documentElement.clientWidth ||
    window.innerWidth;

  const controlPanelEl =
    document.getElementById('trainingManagerPanel') ??
    document.getElementById('trafficStatsPanel');
  const measuredControlWidth = controlPanelEl?.getBoundingClientRect().width;

  const innerH = window.innerHeight;

  const isMobile = viewportWidth <= LAYOUT_MOBILE_MAX_WIDTH;

  // ── Skip if nothing changed ──
  const layout: CachedLayout = {
    viewportWidth,
    controlPanelWidth: measuredControlWidth ?? 0,
    innerHeight: innerH,
    showCamera,
    showNetwork,
    showMiniMap,
    layoutMode,
  };
  if (
    _cachedLayout &&
    _cachedLayout.viewportWidth === layout.viewportWidth &&
    _cachedLayout.controlPanelWidth === layout.controlPanelWidth &&
    _cachedLayout.innerHeight === layout.innerHeight &&
    _cachedLayout.showCamera === layout.showCamera &&
    _cachedLayout.showNetwork === layout.showNetwork &&
    _cachedLayout.showMiniMap === layout.showMiniMap &&
    _cachedLayout.layoutMode === layout.layoutMode
  ) {
    return;
  }
  _cachedLayout = layout;

  // ── Compute dimensions (no DOM reads) ──
  let usedWidth =
    measuredControlWidth && measuredControlWidth > 0
      ? Math.ceil(measuredControlWidth)
      : isMobile
        ? LAYOUT_MOBILE_CONTROL_PANEL_WIDTH
        : LAYOUT_CONTROL_PANEL_WIDTH;

  const networkPanelWidth = showNetwork ? LAYOUT_NETWORK_PANEL_WIDTH : 0;
  usedWidth += networkPanelWidth;

  const availableWidth = Math.floor(viewportWidth - usedWidth);

  // ── Batch all DOM writes ──
  const rightPanel = document.getElementById('rightPanel');
  if (rightPanel) {
    rightPanel.style.display = showNetwork || showMiniMap ? 'flex' : 'none';
  }

  if (showNetwork) {
    networkCanvas.style.display = 'block';
    networkCanvas.width = LAYOUT_NETWORK_PANEL_WIDTH;
    networkCanvas.height = showMiniMap
      ? innerH - LAYOUT_NETWORK_PANEL_WIDTH
      : innerH;
  } else {
    networkCanvas.style.display = 'none';
  }

  const floatingMiniMap = showMiniMap && !showNetwork;
  if (showMiniMap) {
    miniMapCanvas.style.display = 'block';
    miniMapCanvas.classList.toggle('floating', floatingMiniMap);
    miniMapCanvas.width = LAYOUT_NETWORK_PANEL_WIDTH;
    miniMapCanvas.height = LAYOUT_NETWORK_PANEL_WIDTH;
  } else {
    miniMapCanvas.style.display = 'none';
    miniMapCanvas.classList.remove('floating');
  }

  if (showCamera) {
    const secondaryWidth = isMobile
      ? Math.max(
          LAYOUT_MOBILE_MIN_SMALL_VIEW_WIDTH,
          Math.round(availableWidth * 0.4),
        )
      : LAYOUT_SMALL_VIEW_WIDTH;
    const mainWidth = availableWidth - secondaryWidth;
    const topViewBig = layoutMode === 'topview-big';

    gameCanvas.width = topViewBig ? mainWidth : secondaryWidth;
    gameCanvas.height = innerH;
    cameraCanvas.width = topViewBig ? secondaryWidth : mainWidth;
    cameraCanvas.height = innerH;
    cameraCanvas.style.display = 'block';
    gameCanvas.style.order = topViewBig ? '0' : '1';
    cameraCanvas.style.order = topViewBig ? '1' : '0';
  } else {
    gameCanvas.width = availableWidth;
    gameCanvas.height = innerH;
    cameraCanvas.style.display = 'none';
    gameCanvas.style.order = '0';
  }

  if (viewport) {
    viewport.center = new Point(gameCanvas.width / 2, innerH / 2);
  }
}
