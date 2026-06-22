import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/** Names that are allowed to be defined but unused (global script-tag functions/classes). */
const allowedUnusedVars = [
  // types
  'PointDrawOptions',
  'SegmentDrawOptions',
  'PolygonDrawOptions',
  'CarDrawOptions',
  'BuildingDrawOptions',
  'TreeDrawOptions',
  'MiniMapDrawOptions',
  'IMiniMapCar',
  'WorldDrawOptions',
  'IWorld',
  'Corridor',

  // primitives
  'Point',
  'Segment',
  'Envelope',
  'Polygon',
  'SpatialHashGrid',
  'GridSegment',

  // math
  'Graph',
  'Osm',
  'WORLD_PIXELS_PER_METER',
  'METERS_PER_DEGREE_LATITUDE',
  'DEFAULT_CAR_CONFIG',
  'getNearestPoint',
  'getNearestSegment',
  'distance',
  'average',
  'dot',
  'cross',
  'add',
  'subtract',
  'scale',
  'normalize',
  'magnitude',
  'perpendicular',
  'translate',
  'angle',
  'getIntersection',
  'getIntersectionOffset',
  'lerp',
  'lerp2D',
  'invLerp',
  'rotate',
  'degToRad',
  'getRandomColor',
  'getFake3dPoint',
  'safeJsonParse',
  'parseCarFileContent',
  'compareCarInfoParams',

  // world items
  'Building',
  'Tree',

  // editors
  'WorldEditor',
  'GraphEditor',
  'MarkingEditor',
  'StartEditor',
  'TargetEditor',
  'CrossingEditor',
  'ParkingEditor',
  'LightEditor',
  'StopEditor',
  'YieldEditor',
  'CorridorEditor',

  // markings
  'Marking',
  'Start',
  'Target',
  'Crossing',
  'Parking',
  'Light',
  'Stop',
  'Yield',

  // world
  'TrafficManager',
  'World',
  'WorldGenerator',
  'SimpleWorld',
  'Viewport',
  'TrainingSimulator',
  'SimulatorShell',
  'Camera',
  'CameraControls',

  // car
  'Car',
  'constants',
  'Controls',
  'MarkerDetector',
  'MiniMap',
  'NeuralNetwork',
  'PhoneControls',
  'Race',
  'Sensor',

  // sound
  'SoundEngine',
  'taDaa',
  'explode',
  'beep',

  // visualizer / utils
  'Visualizer',
  'polysIntersect',
  'getRGBA',
  'save',
  'discard',
  'restart',

  // training / simulator UI
  'TrainingManager',
  'TrainingPanelElement',
  'WorldToolbarElement',
  'LayoutToolbarElement',
  'AnimationLoopToolbarElement',
  'ShortcutsToolbarElement',
  'TrafficPanelElement',
  'TrafficSimulator',
  'WORLD_TOOLBAR_TEMPLATE',
  'LAYOUT_TOOLBAR_TEMPLATE',
  'ANIMATION_LOOP_TOOLBAR_TEMPLATE',
  'SHORTCUTS_TOOLBAR_TEMPLATE',
  'TRAINING_PANEL_TEMPLATE',
  'TRAFFIC_PANEL_TEMPLATE',
  'BorderMode',
  'TrackingMode',
  'LayoutMode',
  'drawSimulatorCars',
  'handleCollisionWithRoadBorders',
  'SimpleSimState',
  'updateSimpleTraffic',
  'updateSimpleCars',
  'updateWorldCars',
  'resizeSimulatorLayout',
  'LAYOUT_CONTROL_PANEL_WIDTH',
  'LAYOUT_NETWORK_PANEL_WIDTH',
  'LAYOUT_SMALL_VIEW_WIDTH',
  'createCarsForTraining',
  'applyPoolToCars',
  'inferHiddenLayers',
  'getSortedAICars',
  'getTopAICars',
  'getTopCarInfoPool',
  'loadPoolFromStorage',
  'savePoolToStorage',
  'discardStoredPool',
  'loadRaceCars',
  'saveRaceCars',
  'downloadCarFiles',

  // loaders / traffic
  'WorldLoader',
  'CarLoader',
  'generateInitialTraffic',
  'generateTrafficRow',

  // camera types
  'ICameraPoint',
  'IColoredPolygon',
  'ICameraRenderOptions',

  // camera extrusion
  'movePointsInward',
  'getCentroid',
  'extrudePolygons',
  'extrudeCarShape',
  'extrudeTreeShapes',

  // shared init
  'getStartInfo',
  'loadWorldFromStorage',
  'buildRoadBorders',
  'buildMiniMap',

  // store
  'StoreManager',
  'StorePanelElement',
  'STORE_PANEL_TEMPLATE',
  'StoreManifest',
  'StoreWorldEntry',
  'StoreCarEntry',
  'LocalStorageEntry',
  'LoadedWorldEntry',
  'LoadedCarEntry',
  'UnifiedWorldEntry',
  'UnifiedCarEntry',

  // training-init modal
  'TrainingInitModalElement',
  'TRAINING_INIT_MODAL_TEMPLATE',
  'TrainingInitDefaults',
  'TrainingInitResult',
  'TrainingInitOpenOptions',
];

const varsIgnorePattern = `^(_|${allowedUnusedVars.join('|')})$`;

const pluginsAndRules = {
  plugins: {
    prettier: eslintPluginPrettier,
    '@typescript-eslint': ts,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...ts.configs.recommended.rules,
    'prettier/prettier': 'error',
    'no-redeclare': ['error', { builtinGlobals: false }],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { varsIgnorePattern, argsIgnorePattern: '^_' },
    ],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: 'function', next: '*' },
    ],
    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};

const myGlobals = {
  globals: {
    ...globals.browser,

    // typescript
    // DrawOptions: 'readonly',
    PointDrawOptions: 'readonly',
    SegmentDrawOptions: 'readonly',
    PolygonDrawOptions: 'readonly',
    CarDrawOptions: 'readonly',
    BuildingDrawOptions: 'readonly',
    TreeDrawOptions: 'readonly',
    MiniMapDrawOptions: 'readonly',
    IMiniMapCar: 'readonly',
    WorldDrawOptions: 'readonly',
    OsmData: 'readonly',
    Level: 'readonly',
    CarInfo: 'readonly',
    //camera controls
    Marker: 'readonly',

    // world primitives
    Point: 'readonly',
    Segment: 'readonly',
    Envelope: 'readonly',
    Polygon: 'readonly',
    SpatialHashGrid: 'readonly',
    GridSegment: 'readonly',

    // world math
    Graph: 'readonly',
    Osm: 'readonly',
    WORLD_PIXELS_PER_METER: 'readonly',
    METERS_PER_DEGREE_LATITUDE: 'readonly',
    DEFAULT_CAR_CONFIG: 'readonly',
    // world math utils
    getNearestPoint: 'readonly',
    getNearestSegment: 'readonly',
    distance: 'readonly',
    average: 'readonly',
    dot: 'readonly',
    cross: 'readonly',
    add: 'readonly',
    subtract: 'readonly',
    scale: 'readonly',
    normalize: 'readonly',
    magnitude: 'readonly',
    perpendicular: 'readonly',
    translate: 'readonly',
    angle: 'readonly',
    getIntersection: 'readonly',
    getIntersectionOffset: 'readonly',
    lerp: 'readonly',
    lerp2D: 'readonly',
    invLerp: 'readonly',
    rotate: 'readonly',
    degToRad: 'readonly',
    getRandomColor: 'readonly',
    getFake3dPoint: 'readonly',
    safeJsonParse: 'readonly',

    // world items
    Building: 'readonly',
    Tree: 'readonly',

    // world editors
    GraphEditor: 'readonly',
    MarkingEditor: 'readonly',
    StartEditor: 'readonly',
    TargetEditor: 'readonly',
    CrossingEditor: 'readonly',
    ParkingEditor: 'readonly',
    LightEditor: 'readonly',
    StopEditor: 'readonly',
    YieldEditor: 'readonly',
    CorridorEditor: 'readonly',

    // world markings
    Marking: 'readonly',
    Start: 'readonly',
    Target: 'readonly',
    Crossing: 'readonly',
    Parking: 'readonly',
    Light: 'readonly',
    Stop: 'readonly',
    Yield: 'readonly',

    // world world
    IWorld: 'readonly',
    Corridor: 'readonly',
    World: 'readonly',
    WorldGenerator: 'readonly',
    SimpleWorld: 'readonly',
    Viewport: 'readonly',
    TrafficManager: 'readonly',

    // world editor
    WorldEditor: 'readonly',

    // camera
    ICameraPoint: 'readonly',
    IColoredPolygon: 'readonly',
    ICameraRenderOptions: 'readonly',
    movePointsInward: 'readonly',
    getCentroid: 'readonly',
    extrudePolygons: 'readonly',
    extrudeCarShape: 'readonly',
    extrudeTreeShapes: 'readonly',
    Camera: 'readonly',

    // main folder
    CameraControls: 'readonly',
    Car: 'readonly',
    constants: 'readonly',
    Controls: 'readonly',
    MarkerDetector: 'readonly',
    MiniMap: 'readonly',
    NeuralNetwork: 'readonly',
    PhoneControls: 'readonly',
    Race: 'readonly',

    Sensor: 'readonly',
    // sound.js
    SoundEngine: 'readonly',
    taDaa: 'readonly',
    explode: 'readonly',
    beep: 'readonly',
    Visualizer: 'readonly',

    Simulator: 'readonly',
    TrainingSimulator: 'readonly',
    SimulatorShell: 'readonly',
    WorldLoader: 'readonly',
    parseWorldFileContent: 'readonly',
    CarLoader: 'readonly',
    parseCarFileContent: 'readonly',
    compareCarInfoParams: 'readonly',
    generateInitialTraffic: 'readonly',
    generateTrafficRow: 'readonly',

    // main utils
    // lerp: 'readonly',
    // getIntersection: 'readonly',
    polysIntersect: 'readonly',
    getRGBA: 'readonly',
    // getRandomColor: 'readonly',

    save: 'readonly',
    discard: 'readonly',
    restart: 'readonly',

    // to fix
    world: 'readonly',
    carInfo: 'readonly',
    counter: 'readonly',
    statistics: 'readonly',
    started: 'writable',
    TrainingManager: 'readonly',
    TrainingPanelElement: 'readonly',
    WorldToolbarElement: 'readonly',
    LayoutToolbarElement: 'readonly',
    AnimationLoopToolbarElement: 'readonly',
    ShortcutsToolbarElement: 'readonly',
    TrafficPanelElement: 'readonly',
    TrafficSimulator: 'readonly',
    WORLD_TOOLBAR_TEMPLATE: 'readonly',
    LAYOUT_TOOLBAR_TEMPLATE: 'readonly',
    ANIMATION_LOOP_TOOLBAR_TEMPLATE: 'readonly',
    SHORTCUTS_TOOLBAR_TEMPLATE: 'readonly',
    TRAINING_PANEL_TEMPLATE: 'readonly',
    TRAFFIC_PANEL_TEMPLATE: 'readonly',
    drawSimulatorCars: 'readonly',
    handleCollisionWithRoadBorders: 'readonly',
    SimpleSimState: 'readonly',
    updateSimpleTraffic: 'readonly',
    updateSimpleCars: 'readonly',
    updateWorldCars: 'readonly',
    resizeSimulatorLayout: 'readonly',
    LAYOUT_CONTROL_PANEL_WIDTH: 'readonly',
    LAYOUT_NETWORK_PANEL_WIDTH: 'readonly',
    LAYOUT_SMALL_VIEW_WIDTH: 'readonly',
    createCarsForTraining: 'readonly',
    applyPoolToCars: 'readonly',
    inferHiddenLayers: 'readonly',
    getSortedAICars: 'readonly',
    getTopAICars: 'readonly',
    getTopCarInfoPool: 'readonly',
    loadPoolFromStorage: 'readonly',
    savePoolToStorage: 'readonly',
    discardStoredPool: 'readonly',
    loadRaceCars: 'readonly',
    saveRaceCars: 'readonly',
    downloadCarFiles: 'readonly',

    // type aliases
    BorderMode: 'readonly',
    TrackingMode: 'readonly',
    LayoutMode: 'readonly',
    LayoutCanvases: 'readonly',
    LayoutPanelState: 'readonly',

    // store
    StoreManager: 'readonly',
    StorePanelElement: 'readonly',
    STORE_PANEL_TEMPLATE: 'readonly',
    StoreManifest: 'readonly',
    StoreWorldEntry: 'readonly',
    StoreCarEntry: 'readonly',
    LocalStorageEntry: 'readonly',
    LoadedWorldEntry: 'readonly',
    LoadedCarEntry: 'readonly',
    UnifiedWorldEntry: 'readonly',
    UnifiedCarEntry: 'readonly',

    // training-init modal
    TrainingInitModalElement: 'readonly',
    TRAINING_INIT_MODAL_TEMPLATE: 'readonly',
    TrainingInitDefaults: 'readonly',
    TrainingInitResult: 'readonly',
    TrainingInitOpenOptions: 'readonly',
  },
};

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'script',
      parserOptions: { project: null },
      ...myGlobals,
    },
    ...pluginsAndRules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
      ...myGlobals,
    },
    ...pluginsAndRules,
  },
]);
