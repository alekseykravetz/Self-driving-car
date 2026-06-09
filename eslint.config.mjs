import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/** Names that are allowed to be defined but unused (global script-tag functions/classes). */
const allowedUnusedVars = [
  // types
  'world',
  'carInfo',
  'PointDrawOptions',
  'SegmentDrawOptions',
  'PolygonDrawOptions',
  'IWorld',
  'Corridor',

  // primitives
  'Point',
  'Segment',
  'Envelope',
  'Polygon',

  // math
  'Graph',
  'Osm',
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
  'lerp',
  'lerp2D',
  'invLerp',
  'rotate',
  'degToRad',
  'getRandomColor',
  'getFake3dPoint',

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
  'SimpleWorld',
  'Viewport',
  'Simulator',
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
  'Engine',
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
  'TrainingManagerPanelElement',
  'TopControlsPanelElement',
  'ViewControlsPanelElement',
  'BorderMode',
  'TrackingMode',
  'LayoutMode',
  'drawSimulatorCars',
  'drawCarName',
  'handleCollisionWithRoadBorders',

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

    // world math
    Graph: 'readonly',
    Osm: 'readonly',
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
    lerp: 'readonly',
    lerp2D: 'readonly',
    invLerp: 'readonly',
    rotate: 'readonly',
    degToRad: 'readonly',
    getRandomColor: 'readonly',
    getFake3dPoint: 'readonly',

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
    Engine: 'readonly',
    taDaa: 'readonly',
    explode: 'readonly',
    beep: 'readonly',
    Visualizer: 'readonly',

    Simulator: 'readonly',
    WorldLoader: 'readonly',
    CarLoader: 'readonly',
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
    TrainingManagerPanelElement: 'readonly',
    TopControlsPanelElement: 'readonly',
    ViewControlsPanelElement: 'readonly',
    drawSimulatorCars: 'readonly',
    drawCarName: 'readonly',
    handleCollisionWithRoadBorders: 'readonly',

    // type aliases
    BorderMode: 'readonly',
    TrackingMode: 'readonly',
    LayoutMode: 'readonly',
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
