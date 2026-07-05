interface CarDrawOptions {
  showSensor?: boolean;
  showMask?: boolean;
  colorOverride?: string;
  alpha?: number;
  showName?: boolean;
}

interface BuildingDrawOptions {
  viewPoint: Point;
}

/** Compact serialized building: footprint points + height (no `segments`). */
interface BuildingFootprint {
  poly: number[][];
  h: number;
}

/** The compact decoration block stored in a v2 world file. */
interface WorldDecoration {
  treeSeed: number;
  treePrototypeCount: number;
  trees: TreeInstance[];
  buildings: BuildingFootprint[];
}

interface TreeDrawOptions {
  viewPoint: Point;
}

interface MiniMapDrawOptions {
  viewPoint: Point;
  cars: IMiniMapCar[];
  roadColor?: string;
  carColor?: string;
  backgroundColor?: string;
  viewport?: Viewport;
  compactScaleIndicator?: boolean;
}

interface IWorld {
  graph: Graph;
  markings: Marking[];
  roadBorders: Segment[];
  separatorBorders: Segment[];
  corridors: Corridor[];
  buildings: Building[];
  trees: Tree[];
  zoom?: number;
  offset?: Point;
  generateCorridor(start: Point, end: Point): void;
  draw(ctx: CanvasRenderingContext2D, options: WorldDrawOptions): void;
}

/**
 * The ordered set of world layers. Each layer has two orthogonal concerns:
 * visibility (drawn or not, cheap, per-frame) and generation (computed &
 * cached, expensive, on demand). The panel toggles visibility; the generator
 * owns generation.
 */
type WorldLayerId =
  | 'roads' // envelopes + road borders + lane/dash/arrow markings + separators
  | 'markings' // stop/yield/light/crossing/parking/start/target markings
  | 'corridors' // authored corridors
  | 'itemBases' // building footprints + tree base circles (placeholders)
  | 'trees' // fully rendered pseudo-3D trees
  | 'buildings'; // fully rendered pseudo-3D buildings

type WorldLayerVisibility = Record<WorldLayerId, boolean>;

const DEFAULT_LAYER_VISIBILITY: WorldLayerVisibility = {
  roads: true,
  markings: true,
  corridors: true,
  itemBases: false,
  trees: true,
  buildings: true,
};

interface WorldDrawOptions {
  viewPoint: Point;
  /** Cars to render on top of the world (draw-time input, not world state). */
  cars?: Car[];
  /** Highlighted car drawn with its sensor rays. */
  bestCar?: Car | null;
  showStartMarkings?: boolean;
  renderRadius?: number;
  carAlpha?: number;
  showCarNames?: boolean;
  /** Per-layer visibility mask, merged over DEFAULT_LAYER_VISIBILITY. */
  layers?: Partial<WorldLayerVisibility>;
}
