import { StoreManager } from '../store/storeManager.js';
import { SimulatorPageHost } from '../simulator/views/simulatorPageHost.js';
import { RaceSimulator } from '../simulator/racing/raceSimulator.js';
import { CameraControls } from '../car/controls/cameraControls.js';
import { PhoneControls } from '../car/controls/phoneControls.js';
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
import '../car/config.js';
import '../car/physics/sensorRaycaster.js';
import '../car/sensors/sensor.js';
import '../car/controls/controls.js';
import '../car/controls/phoneControls.js';
import '../car/controls/markerDetector.js';
import '../car/controls/cameraControls.js';
import '../car/physics/carPhysics.js';
import '../car/rendering/carRenderer.js';
import '../car/brain/carBrainAdapter.js';
import '../car/car.js';
import '../car/loader/carLoader.js';
import '../store/types.js';
import '../store/storeManager.js';
import '../simulator/training/modes/borderCollision.js';
import '../simulator/training/rendering/carRenderer.js';
import '../simulator/training/genetics/storageManager.js';
import '../ui/molecules/worldToolbarTemplate.js';
import '../ui/molecules/layoutToolbarTemplate.js';
import '../ui/molecules/animationLoopToolbarTemplate.js';
import '../ui/molecules/modeControls.js';
import '../ui/molecules/assetSelectors.js';
import '../ui/molecules/worldToolbar.js';
import '../ui/molecules/layoutToolbar.js';
import '../ui/molecules/animationLoopToolbar.js';
import '../simulator/views/simulatorPageHost.js';
import '../simulator/core/simulatorShell.js';
import '../simulator/spatialGridUtils.js';
import '../simulator/racing/racePanel.js';
(async () => {
    await StoreManager.init();
    const host = new SimulatorPageHost();
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'default';
    gameCanvas.width = window.innerWidth;
    cameraCanvas.width = window.innerWidth;
    document.body.style.flexDirection = 'column';
    const rightPanelWidth = 250;
    miniMapCanvas.width = rightPanelWidth;
    miniMapCanvas.height = rightPanelWidth;
    let controls = null;
    if (mode === 'camera') {
        gameCanvas.height = 0;
        cameraCanvas.height = window.innerHeight;
        ironManCanvas.style.display = '';
        controls = new CameraControls(ironManCanvas);
    }
    else if (mode === 'phone') {
        gameCanvas.height = 0;
        cameraCanvas.height = window.innerHeight;
        cameraCanvas.style.cssText =
            'top:50%;left:50%;position:absolute;transform:translate(-50%,-50%)';
        miniMapCanvas.style.display = 'none';
        statistics.style.display = 'none';
        document.querySelector('world-toolbar').style.display =
            'none';
        controls = new PhoneControls(cameraCanvas);
        document.addEventListener('click', () => {
            const el = document.body;
            el.requestFullscreen?.();
        });
    }
    else {
        gameCanvas.height = window.innerHeight / 2;
        cameraCanvas.height = window.innerHeight / 2;
    }
    statistics.style.width = `${rightPanelWidth}px`;
    statistics.style.height = `${window.innerHeight - 60 - rightPanelWidth}px`;
    const sim = new RaceSimulator(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host, controls);
    window.__sim = sim;
    if (params.has('paused')) {
        sim.pause?.();
    }
})();
