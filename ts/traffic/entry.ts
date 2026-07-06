import { StoreManager } from '../store/storeManager.js';
import { SimulatorPageHost } from '../simulator/views/simulatorPageHost.js';
import { TrafficSimulator } from '../simulator/traffic/trafficSimulator.js';

declare const gameCanvas: HTMLCanvasElement;
declare const networkCanvas: HTMLCanvasElement;
declare const miniMapCanvas: HTMLCanvasElement;
declare const cameraCanvas: HTMLCanvasElement;

import '../math/primitives/point.js';
import '../math/primitives/segment.js';
import '../math/primitives/polygon.js';
import '../math/primitives/envelope.js';
import '../math/utils.js';
import '../math/graph/graph.js';
import '../math/spatialGrid.js';
import '../rendering/pointRenderer.js';
import '../rendering/segmentRenderer.js';
import '../rendering/polygonRenderer.js';
import '../rendering/envelopeRenderer.js';
import '../world/types.js';
import '../world/corridor.js';
import '../world/generation/worldGenerator.js';
import '../world/items/tree.js';
import '../world/items/building.js';
import '../world/markings/marking.js';
import '../world/markings/stop.js';
import '../world/markings/start.js';
import '../world/markings/crossing.js';
import '../world/markings/parking.js';
import '../world/markings/light.js';
import '../world/markings/target.js';
import '../world/markings/yield.js';
import '../world/editors/markingEditor.js';
import '../world/editors/graphEditor.js';
import '../world/editors/stopEditor.js';
import '../world/editors/startEditor.js';
import '../world/editors/crossingEditor.js';
import '../world/editors/parkingEditor.js';
import '../world/editors/lightEditor.js';
import '../world/editors/targetEditor.js';
import '../world/editors/yieldEditor.js';
import '../world/trafficManager.js';
import '../world/world.js';
import '../world/loader/worldLoader.js';
import '../camera/types.js';
import '../camera/extrusion.js';
import '../camera/camera.js';
import '../viewport/scaleIndicator.js';
import '../viewport/viewport.js';
import '../mini-map/miniMap.js';
import '../audio/sound.js';
import '../neural-network/visualizer.js';
import '../neural-network/network.js';
import '../utils.js';
import '../car/config.js';
import '../car/physics/sensorRaycaster.js';
import '../car/sensors/sensor.js';
import '../car/controls/controls.js';
import '../car/physics/carPhysics.js';
import '../car/rendering/carRenderer.js';
import '../car/brain/carBrainAdapter.js';
import '../car/car.js';
import '../car/loader/carLoader.js';
import '../store/types.js';
import '../store/storeManager.js';
import '../panels/templates/worldToolbarTemplate.js';
import '../simulator/panels/templates/layoutToolbarTemplate.js';
import '../simulator/panels/templates/animationLoopToolbarTemplate.js';
import '../panels/templates/shortcutsToolbarTemplate.js';
import '../panels/templates/worldLayersToolbarTemplate.js';
import '../simulator/traffic/templates/trafficPanelTemplate.js';
import '../panels/modeControls.js';
import '../panels/assetSelectors.js';
import '../panels/worldToolbar.js';
import '../simulator/panels/layoutToolbar.js';
import '../simulator/panels/animationLoopToolbar.js';
import '../panels/shortcutsToolbar.js';
import '../panels/worldLayersToolbar.js';
import '../simulator/spatialGridUtils.js';
import '../simulator/training/rendering/layoutManager.js';
import '../simulator/traffic/trafficPanel.js';
import '../simulator/views/simulatorPageHost.js';
import '../simulator/core/simulatorShell.js';
import './trafficSimulator.js';

(async () => {
  await StoreManager.init();
  const host = new SimulatorPageHost();
  new TrafficSimulator(
    gameCanvas,
    networkCanvas,
    miniMapCanvas,
    cameraCanvas,
    host,
  );
})();
