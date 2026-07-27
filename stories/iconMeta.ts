import { ICON_REGISTRY, type IconName } from '../ts/ui/atoms/iconRegistry.js';

/**
 * How an icon animates.
 *  - `idle`  — a looping animation that only plays when the host opts in with
 *              the `animate` attribute (`<app-icon animate>`).
 *  - `hover` — a reaction that fires whenever the icon (or its enclosing
 *              button / .toolbar-btn / .card) is hovered — no attribute needed.
 *  - `none`  — the icon is currently static (no keyframe wired up).
 */
export interface IconMeta {
  /** Human-readable description of the glyph. */
  readonly desc: string;
  /** Grouping used in the gallery + registry source. */
  readonly category: string;
  /** Idle (looping) animation, played only with the `animate` attribute. */
  readonly idle: string | null;
  /** Hover-triggered reaction. */
  readonly hover: string | null;
  /** Extra note — e.g. a sub-part that looks animatable but is not wired up. */
  readonly note?: string;
}

const V = 'Vehicles / AI';
const GEO = 'Geo / Navigation';
const ROAD = 'Road / Traffic';
const MEDIA = 'Media / View';
const ACTION = 'Actions';
const STATUS = 'Status / Misc';
const PARAM = 'Car Params';
const WORLD = 'World Items';

/**
 * Per-icon animation metadata. Kept in sync with `styles/atoms/_icon.css`.
 * Any registry icon missing here falls back to "static" in the gallery.
 */
export const ICON_META: Partial<Record<IconName, IconMeta>> = {
  // ── Vehicles / AI ────────────────────────────────────────────────
  car: {
    category: V,
    desc: 'Side-view car with wheels + headlight',
    idle: 'Bob — gentle up/down float',
    hover: 'Bob · headlight flicker · wheels hop',
  },
  brain: {
    category: V,
    desc: 'Two-lobe brain with a spark',
    idle: 'Spark pulse (grows/fades)',
    hover: 'Spark pulse (faster)',
  },
  dna: {
    category: V,
    desc: 'DNA double helix',
    idle: 'Spin — full rotation (6s)',
    hover: 'Spin (faster)',
  },

  // ── Geo / Navigation ─────────────────────────────────────────────
  map: { category: GEO, desc: 'Folded map', idle: null, hover: null },
  globe: {
    category: GEO,
    desc: 'Globe with meridian lines',
    idle: 'Meridian lines spin (12s)',
    hover: 'Meridians spin (faster)',
  },
  graph: {
    category: GEO,
    desc: 'Node/edge graph',
    idle: 'Edges flow (dash scroll)',
    hover: 'Edges flow (faster)',
  },
  compass: {
    category: GEO,
    desc: 'Compass with needle',
    idle: null,
    hover: 'Needle wiggle',
  },
  pin: {
    category: GEO,
    desc: 'Map location pin',
    idle: 'Bob — gentle up/down float',
    hover: 'Bob (faster)',
  },
  inspect: {
    category: GEO,
    desc: 'Magnifier / inspect',
    idle: null,
    hover: 'Scale + rotate nudge',
  },

  // ── Road / Traffic ───────────────────────────────────────────────
  road: {
    category: ROAD,
    desc: 'Road with centre dashes',
    idle: 'Centre dashes scroll',
    hover: 'Dashes scroll (faster)',
  },
  'traffic-light': {
    category: ROAD,
    desc: '3-lamp traffic signal',
    idle: 'Red → yellow → green cycle (3s)',
    hover: 'Fast lamp cycle (1.2s)',
  },
  corridor: {
    category: ROAD,
    desc: 'Rail corridor with ties',
    idle: 'Ties scroll along track',
    hover: 'Ties scroll (faster)',
  },
  stop: {
    category: ROAD,
    desc: 'Octagonal STOP sign',
    idle: null,
    hover: null,
  },
  yield: { category: ROAD, desc: 'Yield triangle', idle: null, hover: null },
  crossing: {
    category: ROAD,
    desc: 'Pedestrian crossing figure',
    idle: 'Legs sway (walk)',
    hover: 'Legs walk (faster)',
  },
  parking: {
    category: ROAD,
    desc: 'Parking "P" sign',
    idle: null,
    hover: null,
  },
  target: {
    category: ROAD,
    desc: 'Target / goal rings',
    idle: 'Middle ring pulse',
    hover: 'Middle ring pulse (faster)',
  },
  'no-entry': {
    category: ROAD,
    desc: 'No-entry sign',
    idle: null,
    hover: null,
  },
  marking: {
    category: ROAD,
    desc: 'Dashed marking square',
    idle: null,
    hover: null,
  },

  // ── Media / View ─────────────────────────────────────────────────
  video: {
    category: MEDIA,
    desc: 'Video camera',
    idle: 'Lens pulse',
    hover: 'Lens focus pop',
  },
  camera: {
    category: MEDIA,
    desc: 'Photo camera',
    idle: 'Lens focus pulse',
    hover: 'Lens focus pop',
  },
  phone: {
    category: MEDIA,
    desc: 'Smartphone',
    idle: 'Home dot pulse',
    hover: 'Home dot pop',
  },
  keyboard: {
    category: MEDIA,
    desc: 'Keyboard',
    idle: 'Keys flicker (typing)',
    hover: 'Keys type (faster)',
  },
  gamepad: {
    category: MEDIA,
    desc: 'Game controller',
    idle: null,
    hover: null,
  },
  mouse: {
    category: MEDIA,
    desc: 'Computer mouse',
    idle: 'Scroll dot bobs down',
    hover: 'Scroll dot bobs (faster)',
  },
  pointer: {
    category: MEDIA,
    desc: 'Pointing-hand cursor',
    idle: null,
    hover: null,
  },
  cube: { category: MEDIA, desc: '3D cube / mesh', idle: null, hover: null },

  // ── Actions ──────────────────────────────────────────────────────
  save: { category: ACTION, desc: 'Floppy / save', idle: null, hover: null },
  trash: {
    category: ACTION,
    desc: 'Trash can',
    idle: null,
    hover: 'Lid lifts + tilts',
  },
  close: {
    category: ACTION,
    desc: 'Close (X)',
    idle: null,
    hover: 'Scale pop',
  },
  export: {
    category: ACTION,
    desc: 'Export / upload',
    idle: null,
    hover: 'Arrow bounce',
  },
  folder: {
    category: ACTION,
    desc: 'Folder',
    idle: null,
    hover: 'Lid lifts + tilts',
  },
  regenerate: {
    category: ACTION,
    desc: 'Circular refresh',
    idle: null,
    hover: 'Spin (reverse)',
  },
  restart: {
    category: ACTION,
    desc: 'Restart arrow',
    idle: null,
    hover: 'Spin (reverse)',
  },
  play: {
    category: ACTION,
    desc: 'Play / resume triangle',
    idle: null,
    hover: 'Scale pop',
  },
  pause: {
    category: ACTION,
    desc: 'Pause bars',
    idle: null,
    hover: 'Scale pop',
  },
  plus: {
    category: ACTION,
    desc: 'Plus / add',
    idle: null,
    hover: 'Scale pop',
  },
  minus: {
    category: ACTION,
    desc: 'Minus / remove',
    idle: null,
    hover: 'Scale pop',
  },
  edit: { category: ACTION, desc: 'Pencil / edit', idle: null, hover: null },
  check: {
    category: ACTION,
    desc: 'Checkmark',
    idle: null,
    hover: 'Scale pop',
  },
  cross: {
    category: ACTION,
    desc: 'Cross / X mark',
    idle: null,
    hover: 'Scale pop',
  },

  // ── Status / Misc ────────────────────────────────────────────────
  alive: {
    category: STATUS,
    desc: 'Alive status dot',
    idle: 'Pulse (scale + fade)',
    hover: 'Pulse (faster)',
  },
  skull: { category: STATUS, desc: 'Skull / dead', idle: null, hover: null },
  crash: {
    category: STATUS,
    desc: 'Impact burst',
    idle: 'Pulse (1s)',
    hover: 'Pulse (faster)',
  },
  frozen: {
    category: STATUS,
    desc: 'Snowflake / frozen',
    idle: 'Slow spin (14s)',
    hover: 'Spin (faster)',
  },
  shield: {
    category: STATUS,
    desc: 'Shield with check',
    idle: null,
    hover: 'Check pulse',
  },
  trophy: { category: STATUS, desc: 'Trophy', idle: null, hover: null },
  heatmap: {
    category: STATUS,
    desc: 'Thermometer / heatmap',
    idle: 'Fill rises + falls',
    hover: 'Fill rises + falls (faster)',
  },
  graduation: {
    category: STATUS,
    desc: 'Graduation cap',
    idle: 'Tassel swing',
    hover: 'Tassel swing (faster)',
  },
  flag: { category: STATUS, desc: 'Checkered flag', idle: null, hover: null },
  hand: { category: STATUS, desc: 'Open hand', idle: null, hover: null },
  new: { category: STATUS, desc: '"NEW" badge', idle: null, hover: null },
  gear: {
    category: STATUS,
    desc: 'Cog / settings',
    idle: null,
    hover: 'Spin',
  },
  package: { category: STATUS, desc: 'Package / box', idle: null, hover: null },

  // ── Car Params ───────────────────────────────────────────────────
  rocket: {
    category: PARAM,
    desc: 'Rocket with flame',
    idle: 'Bob + flame flicker',
    hover: 'Bob + flame flicker (faster)',
  },
  bolt: {
    category: PARAM,
    desc: 'Lightning bolt',
    idle: 'Flicker',
    hover: 'Flicker (faster)',
  },
  tire: {
    category: PARAM,
    desc: 'Tire / wheel',
    idle: null,
    hover: 'Wheel spins',
  },
  antenna: {
    category: PARAM,
    desc: 'Antenna with signal waves',
    idle: 'Waves pulse in/out',
    hover: 'Waves pulse (faster)',
  },
  ruler: { category: PARAM, desc: 'Ruler', idle: null, hover: null },
  flashlight: {
    category: PARAM,
    desc: 'Flashlight with beam',
    idle: 'Beam flicker',
    hover: 'Beam flicker (faster)',
  },
  dash: {
    category: PARAM,
    desc: 'Dashboard / speed lines',
    idle: 'Lines flow',
    hover: 'Lines flow (faster)',
  },
  width: { category: PARAM, desc: 'Width arrows', idle: null, hover: null },
  height: { category: PARAM, desc: 'Height arrows', idle: null, hover: null },

  // ── World Items ──────────────────────────────────────────────────
  tree: { category: WORLD, desc: 'Tree', idle: null, hover: null },
  building: { category: WORLD, desc: 'Building', idle: null, hover: null },
};

/** Fallback for any registry icon without explicit metadata. */
const FALLBACK: IconMeta = {
  category: 'Uncategorised',
  desc: '—',
  idle: null,
  hover: null,
};

/** All registry icon names, in registry (declaration) order. */
export const ALL_ICON_NAMES = Object.keys(ICON_REGISTRY) as IconName[];

/** Resolve metadata for an icon, falling back to "static" defaults. */
export function metaFor(name: IconName): IconMeta {
  return ICON_META[name] ?? FALLBACK;
}

/** Category order used for grouping in the gallery. */
export const CATEGORY_ORDER: string[] = [
  V,
  GEO,
  ROAD,
  MEDIA,
  ACTION,
  STATUS,
  PARAM,
  WORLD,
];
