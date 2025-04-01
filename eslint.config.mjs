import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs}'] },
  { files: ['**/*.js'], languageOptions: { sourceType: 'script' } },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,

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
        World: 'readonly',
        Viewport: 'readonly',

        // world editor
        WorldEditor: 'readonly',

        // main folder
        Camera: 'readonly',
        CameraControls: 'readonly',
        Car: 'readonly',
        constants: 'readonly',
        Controls: 'readonly',
        MarkerDetector: 'readonly',
        MiniMap: 'readonly',
        NeuralNetwork: 'readonly',
        PhoneControls: 'readonly',
        Race: 'readonly',
        Road: 'readonly',
        Sensor: 'readonly',
        // sound.js
        Engine: 'readonly',
        taDaa: 'readonly',
        explode: 'readonly',
        beep: 'readonly',
        Visualizer: 'readonly',

        Simulator: 'readonly',
        CameraViewSimulator: 'readonly',

        // main utils
        // lerp: 'readonly',
        // getIntersection: 'readonly',
        polysIntersect: 'readonly',
        getRGBA: 'readonly',
        // getRandomColor: 'readonly',

        save: 'readonly',
        discard: 'readonly',

        // to fix
        world: 'readonly',
        carInfo: 'readonly',
        counter: 'readonly',
        statistics: 'readonly',
        started: 'writable',
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      'prettier/prettier': 'error',
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern:
            '^(Point|Segment|Envelope|Polygon|Graph|Osm|getNearestPoint|getNearestSegment|distance|average|dot|cross|add|subtract|scale|normalize|magnitude|perpendicular|translate|angle|getIntersection|lerp|lerp2D|invLerp|degToRad|getRandomColor|getFake3dPoint|Building|Tree|WorldEditor|GraphEditor|MarkingEditor|StartEditor|TargetEditor|CrossingEditor|ParkingEditor|LightEditor|StopEditor|YieldEditor|Marking|Start|Target|Crossing|Parking|Light|Stop|Yield|World|Viewport|Simulator|CameraViewSimulator|Camera|CameraControls|Car|constants|Controls|MarkerDetector|MiniMap|NeuralNetwork|PhoneControls|Race|Road|Sensor|Engine|taDaa|explode|beep|Visualizer|polysIntersect|getRGBA|save|discard)$',
        },
      ],
    },
  },
]);
