/**
 * Central SVG icon registry — the single source of truth for every icon in
 * the app. Each entry maps a semantic name to inline SVG markup.
 *
 * Design conventions:
 *  - 24×24 viewBox, ~2px strokes, round caps/joins — a coherent line-icon set.
 *  - Monochrome icons use `currentColor` so they inherit the surrounding text
 *    colour. Multi-colour icons (traffic light, status dots, etc.) read CSS
 *    custom properties (`--icon-a`, `--icon-b`, `--icon-c`) that fall back to
 *    design tokens, so callers can still recolour them.
 *  - Animatable parts carry a `.ic-<part>` class. The idle/hover keyframes in
 *    `styles/atoms/_icon.css` target those classes; the SVG itself stays static
 *    until the host `<app-icon>` opts in via the `animate` attribute or hover.
 *
 * This module is pure data (no DOM, no side effects) so it is trivially
 * unit-testable and tree-shakeable.
 */

export type IconName =
  // Vehicles / AI
  | 'car'
  | 'brain'
  | 'dna'
  // Geo / navigation
  | 'map'
  | 'globe'
  | 'graph'
  | 'compass'
  | 'pin'
  | 'inspect'
  // Road / traffic
  | 'road'
  | 'traffic-light'
  | 'corridor'
  | 'stop'
  | 'yield'
  | 'crossing'
  | 'parking'
  | 'target'
  | 'no-entry'
  | 'marking'
  // Media / view
  | 'video'
  | 'camera'
  | 'phone'
  | 'keyboard'
  | 'gamepad'
  | 'mouse'
  | 'pointer'
  | 'cube'
  // Actions
  | 'save'
  | 'trash'
  | 'close'
  | 'export'
  | 'folder'
  | 'regenerate'
  | 'restart'
  | 'play'
  | 'pause'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'check'
  | 'cross'
  // Status / misc
  | 'alive'
  | 'skull'
  | 'crash'
  | 'frozen'
  | 'shield'
  | 'trophy'
  | 'heatmap'
  | 'graduation'
  | 'flag'
  | 'hand'
  | 'new'
  | 'gear'
  | 'package'
  // Car params
  | 'rocket'
  | 'bolt'
  | 'tire'
  | 'antenna'
  | 'ruler'
  | 'flashlight'
  | 'dash'
  | 'width'
  | 'height'
  // World items
  | 'tree'
  | 'building';

const S =
  'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor"';

/** Every icon's inner SVG markup (without the wrapping <svg> element). */
export const ICON_REGISTRY: Record<IconName, string> = {
  // ── Vehicles / AI ────────────────────────────────────────────────
  car: `
    <g class="ic-car" ${S}>
      <path d="M4 15l1.5-4.5A2 2 0 0 1 7.4 9h9.2a2 2 0 0 1 1.9 1.5L20 15" />
      <rect x="3" y="15" width="18" height="4" rx="1.2" />
      <circle class="ic-wheel" cx="7.5" cy="19" r="1.4" ${F} stroke="none" />
      <circle class="ic-wheel" cx="16.5" cy="19" r="1.4" ${F} stroke="none" />
      <path class="ic-headlight" d="M20 16.5h1.2" />
    </g>`,

  brain: `
    <g class="ic-brain" ${S}>
      <path d="M9 4.5a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 9.5 2.5 2.5 0 0 0 6 14a2.5 2.5 0 0 0 3 4V4.5z" />
      <path d="M15 4.5A2.5 2.5 0 0 1 17.5 7 2.5 2.5 0 0 1 19 9.5 2.5 2.5 0 0 1 18 14a2.5 2.5 0 0 1-3 4V4.5z" />
      <path class="ic-brain-spark" d="M12 8v3M12 14v2M10 10h4" />
    </g>`,

  dna: `
    <g class="ic-dna" ${S}>
      <path class="ic-dna-strand" d="M7 3c0 5 10 5 10 10s-10 5-10 10" />
      <path class="ic-dna-strand" d="M17 3c0 5-10 5-10 10s10 5 10 10" />
      <path class="ic-dna-rung" d="M8.7 6h6.6" />
      <path class="ic-dna-rung" d="M7.2 9.5h9.6" />
      <path class="ic-dna-rung" d="M7 12.5h10" />
      <path class="ic-dna-rung" d="M7.2 15.5h9.6" />
      <path class="ic-dna-rung" d="M8.7 19h6.6" />
    </g>`,

  // ── Geo / navigation ─────────────────────────────────────────────
  map: `
    <g class="ic-map" ${S}>
      <path d="M9 4 3.5 6.2v13.3L9 17.3l6 2.2 5.5-2.2V4L15 6.2 9 4z" />
      <path d="M9 4v13.3M15 6.2v13.3" />
    </g>`,

  globe: `
    <g class="ic-globe" ${S}>
      <circle cx="12" cy="12" r="8.5" />
      <path class="ic-globe-lines" d="M3.5 12h17M12 3.5c2.6 2.3 2.6 14.7 0 17M12 3.5c-2.6 2.3-2.6 14.7 0 17" />
    </g>`,

  graph: `
    <g class="ic-graph" ${S}>
      <path class="ic-graph-edge" d="M7 6l10 4M7 6L6 17M17 10l-11 7M17 10v7l-11 0" />
      <circle cx="7" cy="6" r="2.2" ${F} stroke="none" />
      <circle cx="17" cy="10" r="2.2" ${F} stroke="none" />
      <circle cx="6" cy="17" r="2.2" ${F} stroke="none" />
      <circle cx="17" cy="17" r="2.2" ${F} stroke="none" />
    </g>`,

  compass: `
    <g class="ic-compass" ${S}>
      <circle cx="12" cy="12" r="8.5" />
      <path class="ic-compass-needle" d="M14.8 9.2 11 11l-1.8 3.8L13 13l1.8-3.8z" ${F} stroke="none" />
    </g>`,

  pin: `
    <g class="ic-pin" ${S}>
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.3" />
    </g>`,

  inspect: `
    <g class="ic-inspect" ${S}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </g>`,

  // ── Road / traffic ───────────────────────────────────────────────
  road: `
    <g class="ic-road" ${S}>
      <path d="M8 3 5 21M16 3l3 18" />
      <path class="ic-road-dash" stroke-dasharray="2.5 3.5" d="M12 2v20" />
    </g>`,

  'traffic-light': `
    <g class="ic-tl">
      <rect x="7.5" y="3" width="9" height="18" rx="2.5" ${S} />
      <path d="M9 6.5h-2M9 12h-2M9 17.5h-2" ${S} />
      <circle class="ic-tl-red" cx="12" cy="7" r="2" fill="var(--icon-a, var(--color-accent-red, #d9534f))" />
      <circle class="ic-tl-yellow" cx="12" cy="12" r="2" fill="var(--icon-b, var(--color-accent-yellow, #f0ad4e))" />
      <circle class="ic-tl-green" cx="12" cy="17" r="2" fill="var(--icon-c, var(--color-accent-green-strong, #5cb85c))" />
    </g>`,

  corridor: `
    <g class="ic-corridor" ${S}>
      <path d="M8 21 10 3M16 21 14 3" />
      <path class="ic-corridor-tie" d="M6 8h12M6 13h12M6 18h12" />
    </g>`,

  stop: `
    <g class="ic-stop">
      <path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2L8.2 3z" fill="var(--icon-a, var(--color-accent-red, #d9534f))" stroke="none" />
      <path d="M7.5 12h9" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" />
    </g>`,

  yield: `
    <g class="ic-yield">
      <path d="M12 4 21 19H3L12 4z" fill="var(--icon-a, var(--color-accent-yellow, #f0ad4e))" stroke="none" />
      <path d="M12 9v4.5" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none" />
      <circle cx="12" cy="16.3" r="1.1" fill="#000" />
    </g>`,

  crossing: `
    <g class="ic-crossing" ${S}>
      <g class="ic-crossing-stripes" ${F} stroke="none">
        <rect x="3" y="17.5" width="2.6" height="4.5" rx="0.6" />
        <rect x="7.7" y="17.5" width="2.6" height="4.5" rx="0.6" />
        <rect x="12.4" y="17.5" width="2.6" height="4.5" rx="0.6" />
        <rect x="17.1" y="17.5" width="2.6" height="4.5" rx="0.6" />
      </g>
      <g class="ic-crossing-walker">
        <circle cx="12" cy="4" r="2" ${F} stroke="none" />
        <path class="ic-crossing-legs" d="M12 6.5v5M12 8.5l-3 4.5M12 8.5l3 4.5M12 7.5l-3-1M12 7.5l3-1" />
      </g>
    </g>`,

  parking: `
    <g class="ic-parking">
      <rect x="4" y="4" width="16" height="16" rx="3" fill="var(--icon-a, var(--color-accent-blue, #5cb8ff))" stroke="none" />
      <path d="M10 17V7h3a3 3 0 0 1 0 6h-3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>`,

  target: `
    <g class="ic-target" ${S}>
      <circle cx="12" cy="12" r="8.5" />
      <circle class="ic-target-mid" cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.4" ${F} stroke="none" />
    </g>`,

  'no-entry': `
    <g class="ic-noentry">
      <circle cx="12" cy="12" r="8.5" fill="var(--icon-a, var(--color-accent-red, #d9534f))" stroke="none" />
      <path d="M7.5 12h9" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none" />
    </g>`,

  marking: `
    <g class="ic-marking" ${S}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" stroke-dasharray="3 2.5" />
    </g>`,

  // ── Media / view ─────────────────────────────────────────────────
  video: `
    <g class="ic-video" ${S}>
      <rect x="3" y="7" width="12" height="10" rx="2" />
      <path class="ic-video-lens" d="M15 11l6-3v8l-6-3z" />
    </g>`,

  camera: `
    <g class="ic-camera" ${S}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle class="ic-camera-lens" cx="12" cy="13" r="3.2" />
    </g>`,

  phone: `
    <g class="ic-phone" ${S}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10.5 5h3" />
      <path class="ic-phone-home" d="M12 18.5h.01" />
    </g>`,

  keyboard: `
    <g class="ic-keyboard" ${S}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path class="ic-keyboard-keys" d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M7.5 14h9" />
    </g>`,

  gamepad: `
    <g class="ic-gamepad" ${S}>
      <path d="M8 8h8a5 5 0 0 1 5 5 3.5 3.5 0 0 1-6 2.5l-.7-.7H9.7l-.7.7A3.5 3.5 0 0 1 3 13a5 5 0 0 1 5-5z" />
      <path d="M7 11v3M5.5 12.5h3" />
      <circle cx="16" cy="12" r=".9" ${F} stroke="none" />
      <circle cx="17.6" cy="14" r=".9" ${F} stroke="none" />
    </g>`,

  mouse: `
    <g class="ic-mouse" ${S}>
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <path class="ic-mouse-scroll" d="M12 7v3" />
    </g>`,

  pointer: `
    <g class="ic-pointer" ${S}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" ${F} />
      <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" ${F} />
      <path d="M15 11V6a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a5 5 0 0 1-3.6-1.5L6 15.6a1.6 1.6 0 0 1 2.5-2L9.5 15V8a1.5 1.5 0 0 1 3 0" ${F} />
    </g>`,

  cube: `
    <g class="ic-cube" ${S}>
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3z" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" />
    </g>`,

  // ── Actions ──────────────────────────────────────────────────────
  save: `
    <g class="ic-save" ${S}>
      <path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M8 3v5h6V3M8 21v-6h8v6" />
    </g>`,

  trash: `
    <g class="ic-trash" ${S}>
      <path class="ic-trash-lid" d="M4 6.5h16M9.5 6.5V4.5h5v2" />
      <path d="M6 6.5 7 20a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13.5" />
      <path d="M10 10.5v6.5M14 10.5v6.5" />
    </g>`,

  close: `
    <g class="ic-close" ${S}>
      <path d="M6 6l12 12M18 6 6 18" />
    </g>`,

  export: `
    <g class="ic-export" ${S}>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path class="ic-export-arrow" d="M12 3v11M8 10l4 4 4-4" />
    </g>`,

  folder: `
    <g class="ic-folder" ${S}>
      <path class="ic-folder-lid" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </g>`,

  regenerate: `
    <g class="ic-regen" ${S}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
    </g>`,

  restart: `
    <g class="ic-restart" ${S}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4 4v4h4" />
    </g>`,

  play: `
    <g class="ic-play" ${F} stroke="none">
      <path d="M7.5 5.2v13.6a1 1 0 0 0 1.5.87l11.3-6.8a1 1 0 0 0 0-1.74L9 4.33a1 1 0 0 0-1.5.87z" />
    </g>`,

  pause: `
    <g class="ic-pause" ${F} stroke="none">
      <rect x="6.5" y="4.5" width="3.6" height="15" rx="1.2" />
      <rect x="13.9" y="4.5" width="3.6" height="15" rx="1.2" />
    </g>`,

  plus: `
    <g class="ic-plus" ${S}>
      <path d="M12 5v14M5 12h14" />
    </g>`,

  minus: `
    <g class="ic-minus" ${S}>
      <path d="M5 12h14" />
    </g>`,

  edit: `
    <g class="ic-edit" ${S}>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </g>`,

  check: `
    <g class="ic-check" ${S}>
      <path d="M5 12.5 10 17.5 19 6.5" />
    </g>`,

  cross: `
    <g class="ic-cross" ${S}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </g>`,

  // ── Status / misc ────────────────────────────────────────────────
  alive: `
    <g class="ic-alive">
      <circle class="ic-alive-dot" cx="12" cy="12" r="6" fill="var(--icon-a, var(--color-accent-green-strong, #5cb85c))" />
    </g>`,

  skull: `
    <g class="ic-skull" ${S}>
      <path d="M12 3a8 8 0 0 0-8 8c0 3 1.6 4.6 3 5.4V19a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 19v-2.6c1.4-.8 3-2.4 3-5.4a8 8 0 0 0-8-8z" />
      <circle cx="9" cy="11" r="1.6" ${F} stroke="none" />
      <circle cx="15" cy="11" r="1.6" ${F} stroke="none" />
      <path d="M11 20v-2M13 20v-2" />
    </g>`,

  crash: `
    <g class="ic-crash">
      <path class="ic-crash-burst" d="M12 2l2.2 5.2L20 5l-2.8 5.2L23 12l-5.8 1.8L20 19l-5.8-2.2L12 22l-2.2-5.2L4 19l2.8-5.2L1 12l5.8-1.8L4 5l5.8 2.2L12 2z" fill="var(--icon-a, var(--color-accent-orange, #f5a623))" stroke="none" />
    </g>`,

  frozen: `
    <g class="ic-frozen" ${S}>
      <path d="M12 2v20M4.2 7l15.6 10M19.8 7 4.2 17" />
      <path d="M12 5.5 10 3.5M12 5.5l2-2M12 18.5l-2 2M12 18.5l2 2M4.5 9.5 5 7M4.5 9.5 2 10M19.5 14.5 22 14M19.5 14.5 19 17M4.5 14.5 2 14M4.5 14.5 5 17M19.5 9.5 22 10M19.5 9.5 19 7" />
    </g>`,

  shield: `
    <g class="ic-shield" ${S}>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6l-7-3z" />
      <path class="ic-shield-check" d="M9 12l2 2 4-4" />
    </g>`,

  trophy: `
    <g class="ic-trophy" ${S}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5.5H5.5A1.5 1.5 0 0 0 4 7a3 3 0 0 0 3 3M16 5.5h2.5A1.5 1.5 0 0 1 20 7a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 20h6M10 20l.5-3h3l.5 3" />
    </g>`,

  heatmap: `
    <g class="ic-heatmap" ${S}>
      <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" />
      <path class="ic-heatmap-fill" d="M12 8v8.5" stroke="var(--icon-a, var(--color-accent-red, #d9534f))" stroke-width="2.4" />
    </g>`,

  graduation: `
    <g class="ic-grad" ${S}>
      <path d="M2.5 8.5 12 4.5l9.5 4-9.5 4-9.5-4z" />
      <path d="M6.5 10.5V15c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.5" />
      <path class="ic-grad-tassel" d="M21.5 8.5v4" />
    </g>`,

  flag: `
    <g class="ic-flag" ${S}>
      <path d="M6 3v18" />
      <g class="ic-flag-wave">
        <path d="M6 4h12v9H6z" ${F} fill-opacity="0.15" />
        <path d="M6 4h4v3h4V4h4v3h-4v3h4v3h-4v-3h-4v3H6v-3h4V7H6V4z" ${F} stroke="none" />
      </g>
    </g>`,

  hand: `
    <g class="ic-hand" ${S}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 10.5V4a1.5 1.5 0 0 1 3 0v6.5M15 11V6a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a5 5 0 0 1-3.6-1.5L6 15.6a1.6 1.6 0 0 1 2.5-2L9.5 15" />
      <path d="M9 11V8a1.5 1.5 0 0 0-3 0v4" />
    </g>`,

  new: `
    <g class="ic-new" ${S}>
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-6-6z" />
      <path d="M13 3v6h6" />
      <path class="ic-new-spark" d="M10 12.2l.85 1.95 1.95.85-1.95.85L10 18.6l-.85-1.95-1.95-.85 1.95-.85L10 12.2z" ${F} stroke="none" />
    </g>`,

  gear: `
    <g class="ic-gear" ${S}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </g>`,

  package: `
    <g class="ic-package" ${S}>
      <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16V8z" />
      <path d="M3.5 8 12 12.5 20.5 8M12 12.5V20.5M7.7 5.7 16.3 10.3" />
    </g>`,

  // ── Car params ───────────────────────────────────────────────────
  rocket: `
    <g class="ic-rocket" ${S}>
      <path d="M12 3c3 2 4.5 5.5 4.5 9L14 15h-4l-2.5-3c0-3.5 1.5-7 4.5-9z" />
      <circle cx="12" cy="9" r="1.6" />
      <path d="M10 15l-2 4M14 15l2 4" />
      <path class="ic-rocket-flame" d="M12 15v5" stroke="var(--icon-a, var(--color-accent-orange, #f5a623))" />
    </g>`,

  bolt: `
    <g class="ic-bolt">
      <path class="ic-bolt-path" d="M13 2 4 13h6l-1 9 9-11h-6l1-9z" fill="var(--icon-a, var(--color-accent-yellow, #f0ad4e))" stroke="none" />
    </g>`,

  tire: `
    <g class="ic-tire" ${S}>
      <circle class="ic-tire-outer" cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5V8M12 16v4.5M3.5 12H8M16 12h4.5" />
    </g>`,

  antenna: `
    <g class="ic-antenna" ${S}>
      <path d="M12 13v8M8 21h8" />
      <path class="ic-antenna-wave" d="M8.5 8.5a5 5 0 0 1 7 0M5.5 5.5a9 9 0 0 1 13 0" />
      <circle cx="12" cy="11" r="1.6" ${F} stroke="none" />
    </g>`,

  ruler: `
    <g class="ic-ruler" ${S}>
      <path d="M4 16 16 4l4 4L8 20l-4-4z" />
      <path d="M8 8l1.5 1.5M11 5.5l1.5 1.5M6.5 11l1.5 1.5M10 13l1.5 1.5M13 10l1.5 1.5" stroke-width="1.4" />
    </g>`,

  flashlight: `
    <g class="ic-flashlight" ${S}>
      <path d="M4 6h4l2 2v8l-2 2H4V6z" />
      <path class="ic-flashlight-beam" d="M10 9h3M10 12h4.5M10 15h6" stroke="var(--icon-a, var(--color-accent-yellow, #f0ad4e))" />
    </g>`,

  dash: `
    <g class="ic-dash" ${S}>
      <path class="ic-dash-lines" d="M4 8h12M4 12h9M4 16h13" />
    </g>`,

  width: `
    <g class="ic-width" ${S}>
      <path d="M3 12h18" />
      <path d="M6 8.5 3 12l3 3.5M18 8.5 21 12l-3 3.5" />
    </g>`,

  height: `
    <g class="ic-height" ${S}>
      <path d="M12 3v18" />
      <path d="M8.5 6 12 3l3.5 3M8.5 18 12 21l3.5-3" />
    </g>`,

  // ── World items ──────────────────────────────────────────────────
  tree: `
    <g class="ic-tree" ${S}>
      <path d="M12 3 6.5 11h3L5 17h14l-4.5-6h3L12 3z" />
      <path d="M12 17v4" />
    </g>`,

  building: `
    <g class="ic-building" ${S}>
      <path d="M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M14 21V10h4a1 1 0 0 1 1 1v10M3 21h18" />
      <path d="M7.5 7.5h.01M10.5 7.5h.01M7.5 11h.01M10.5 11h.01M7.5 14.5h.01M10.5 14.5h.01M16.5 13.5h.01M16.5 17h.01" />
    </g>`,
};

/** Runtime guard: is a string a known icon name? */
export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICON_REGISTRY, name);
}
