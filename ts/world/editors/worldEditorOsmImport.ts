import { World } from '../world.js';
import { Viewport } from '../../viewport/viewport.js';
import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { Osm, OsmData } from '../../math/osm-importer/osm.js';
import { Light } from '../markings/light.js';
import { Crossing } from '../markings/crossing.js';
import { Stop } from '../markings/stop.js';
import { Yield } from '../markings/yield.js';
import {
  expandDirectionalMarking,
  OSM_STOP_YIELD_SIZE_PX,
} from '../osmDirectionalMarkings.js';
import { WorldLayersToolbarElement } from '../../ui/molecules/worldLayersToolbar.js';
import { GenerationProgressElement } from '../../ui/molecules/generationProgress.js';
import {
  yieldToBrowser,
  runChunkedGenerator,
} from '../generation/generationProgress.js';

/** Overpass QL filter used to query drivable roads from OpenStreetMap. */
const OSM_FILTER = `[out:json];
(
  way["highway"]
  ["highway" !~"pedestrian|footway|cycleway|path|service|corridor|track|steps|raceway|bridleway|proposed|construction|elevator|bus_guideway|no"]
  ["access" !~"private"]
  ({{bbox}});
);
out body;
>;
out body;`;

export interface WorldEditorOsmImportOptions {
  getWorld: () => World;
  getViewport: () => Viewport;
  getCanvas: () => HTMLCanvasElement;
  getAutoRegen: () => boolean;
  /** Notifies the owner that the graph hash changed so change-detection stays in sync. */
  onGraphHashUpdated: (hash: string) => void;
  osmPanel: HTMLElement;
  osmDataContainer: HTMLTextAreaElement;
  copyFilterBtn: HTMLButtonElement;
  worldLayersToolbar: WorldLayersToolbarElement;
  generationProgress: GenerationProgressElement | null;
  /** Shares the owner's re-entrancy guard for time-sliced generation. */
  generatingGuard: { get: () => boolean; set: (v: boolean) => void };
}

/** Owns the OSM import panel and the chunked road/marking import routine. */
export class WorldEditorOsmImporter {
  #opts: WorldEditorOsmImportOptions;

  constructor(opts: WorldEditorOsmImportOptions) {
    this.#opts = opts;
  }

  /* Displays the OSM data input panel. */
  openPanel(): void {
    this.#opts.osmPanel.style.display = 'block';
  }

  /* Hides the OSM data input panel. */
  closePanel(): void {
    this.#opts.osmPanel.style.display = 'none';
  }

  /* Opens Overpass Turbo in a new tab. */
  openOverpassTurbo(): void {
    window.open('https://overpass-turbo.eu/', '_blank');
  }

  /* Copies the Overpass QL filter query to the clipboard. */
  copyFilter(): void {
    const btn = this.#opts.copyFilterBtn;
    navigator.clipboard.writeText(OSM_FILTER).then(
      () => {
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy Filter';
        }, 2000);
      },
      () => {
        alert(
          'Could not copy automatically. Select and copy the filter from saves/osm-data-loading-readme.txt',
        );
      },
    );
  }

  /* Parses OSM data from the text area and updates the world graph. */
  async parse(): Promise<void> {
    const {
      generatingGuard,
      worldLayersToolbar,
      generationProgress: overlay,
    } = this.#opts;
    const osmData = this.#opts.osmDataContainer.value;
    if (!osmData) {
      alert('Paste OSM data (JSON format) into the text area first.');
      return;
    }

    if (generatingGuard.get()) return;
    const world = this.#opts.getWorld();
    const viewport = this.#opts.getViewport();
    const canvas = this.#opts.getCanvas();
    // Reveal the progress overlay and let it paint BEFORE any heavy synchronous
    // work (JSON.parse + OSM parse + geometry), so a large import never leaves
    // the tab frozen with no feedback.
    generatingGuard.set(true);
    worldLayersToolbar?.setBusy(true);
    overlay?.start('Importing OSM data…');
    overlay?.update({
      stage: 'roads',
      label: 'Reading data…',
      fraction: 0,
    });
    await yieldToBrowser();

    try {
      // JSON.parse is native and cannot be chunked; run it with the overlay
      // already visible. (For extremely large pastes this is the one remaining
      // synchronous block — a Web Worker would be needed to offload it.)
      let osmDataJson: OsmData;
      try {
        osmDataJson = JSON.parse(osmData);
      } catch (error) {
        alert(`Invalid JSON data in OSM input: ${error}`);
        console.error('Error parsing OSM JSON:', error);
        return;
      }
      overlay?.update({
        stage: 'roads',
        label: 'Parsing road network…',
        fraction: 0,
      });
      await yieldToBrowser();

      // Parse roads via the time-sliced generator so a large import keeps the
      // main thread responsive (and updates the progress bar) instead of
      // freezing at 0% while parsing.
      const result = await runChunkedGenerator(
        Osm.parseRoadsChunked(osmDataJson),
        (f) =>
          overlay?.update({
            stage: 'roads',
            label: 'Parsing road network…',
            fraction: f,
          }),
      );
      // Update the world's graph
      world.graph.points = result.points;
      world.graph.segments = result.segments;

      // Import OSM node markings (traffic signals, pedestrian crossings, stop
      // and give-way signs) as their corresponding Light/Crossing/Stop/Yield
      // markings, anchored to the graph so they follow later road edits.
      // Mutate the array in place: the world's TrafficManager holds this exact
      // reference and re-reads it to build control centers.
      overlay?.update({
        stage: 'roads',
        label: 'Placing traffic signs…',
        fraction: 1,
      });
      world.markings.length = 0;
      // `expandDirectionalMarking` needs the segments incident to each stop/
      // yield node. Index them once by "x,y" endpoint key so each seed is an
      // O(1) lookup instead of an O(segments) scan (near-linear over the map).
      const incidentByKey = new Map<string, Segment[]>();
      const nodeKeyOf = (p: Point): string => `${p.x},${p.y}`;
      for (const seg of world.graph.segments) {
        const k1 = nodeKeyOf(seg.p1);
        const k2 = nodeKeyOf(seg.p2);
        (incidentByKey.get(k1) ?? incidentByKey.set(k1, []).get(k1)!).push(seg);
        if (k2 !== k1) {
          (incidentByKey.get(k2) ?? incidentByKey.set(k2, []).get(k2)!).push(
            seg,
          );
        }
      }
      // Import may place many markings; yield to the browser every few so it
      // never blocks long enough to freeze the tab.
      let markCount = 0;
      const yieldEvery = async (): Promise<void> => {
        if ((++markCount & 15) === 0) await yieldToBrowser();
      };
      const addMarking = (m: Light | Crossing | Stop | Yield): void => {
        m.setAnchor(world.graph);
        world.markings.push(m);
      };
      for (const l of result.lights) {
        addMarking(new Light(l.center, l.directionVector, l.width));
        await yieldEvery();
      }
      for (const c of result.crossings) {
        addMarking(
          new Crossing(
            c.center,
            c.directionVector,
            c.width,
            c.height ?? c.width,
          ),
        );
        await yieldEvery();
      }
      for (const s of result.stops) {
        for (const lane of expandDirectionalMarking(
          s.center,
          s.directionVector,
          world.graph,
          undefined,
          incidentByKey.get(nodeKeyOf(s.center)) ?? [],
        )) {
          addMarking(
            new Stop(
              lane.center,
              lane.directionVector,
              OSM_STOP_YIELD_SIZE_PX,
              OSM_STOP_YIELD_SIZE_PX,
            ),
          );
        }
        await yieldEvery();
      }
      for (const y of result.yields) {
        for (const lane of expandDirectionalMarking(
          y.center,
          y.directionVector,
          world.graph,
          undefined,
          incidentByKey.get(nodeKeyOf(y.center)) ?? [],
        )) {
          addMarking(
            new Yield(
              lane.center,
              lane.directionVector,
              OSM_STOP_YIELD_SIZE_PX,
              OSM_STOP_YIELD_SIZE_PX,
            ),
          );
        }
        await yieldEvery();
      }
      // Note: on-street parking (`parking:*`) is imported as segment metadata
      // (`parkingLeft`/`parkingRight`) and baked into the road envelope during
      // generation — not as standalone markings. See WorldGenerator/World.

      // Center viewport on the imported data
      const pts = result.points;
      if (pts.length > 0) {
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        viewport.offset.x = -cx;
        viewport.offset.y = -cy;

        const dataW = maxX - minX;
        const dataH = maxY - minY;
        if (dataW > 0 && dataH > 0) {
          // Fraction of the viewport the imported data should occupy (leaving a
          // margin around it). `zoom` maps one canvas pixel to `zoom` world
          // units, so the world-space width visible on screen is
          // `canvas.width * zoom`; to make the data span `pad` of that we need
          // `zoom = dataW / (canvas.width * pad)`. Take the larger of the two
          // axes so both fit, then clamp to the same range the wheel handler
          // uses so the first scroll doesn't snap the zoom to a new value.
          const pad = 0.8;
          const fitZoom = Math.max(
            dataW / (canvas.width * pad),
            dataH / (canvas.height * pad),
          );
          viewport.zoom = Math.max(0.8, Math.min(10, fitZoom));
        }
      }

      this.closePanel(); // Close panel on success

      // Generate road (and, when auto-regen is on, item) geometry time-sliced
      // with the visible progress overlay so a large import never freezes the
      // tab. Claim the current graph hash *now* so the draw loop's synchronous
      // regeneration path is suppressed while the async generation runs.
      const autoRegen = this.#opts.getAutoRegen();
      this.#opts.onGraphHashUpdated(world.graph.hash());
      await world.generateAsync({
        roads: true,
        buildings: autoRegen,
        trees: autoRegen,
        onProgress: (p) => overlay?.update(p),
      });
      this.#opts.onGraphHashUpdated(world.graph.hash());
      if (!autoRegen && (world.buildings.length || world.trees.length)) {
        worldLayersToolbar?.setStale(true);
      } else {
        worldLayersToolbar?.setStale(false);
      }
    } catch (error) {
      alert(`Error processing OSM data: ${error}`);
      console.error('Error processing OSM data:', error);
    } finally {
      overlay?.finish();
      worldLayersToolbar?.setBusy(false);
      generatingGuard.set(false);
    }
  }
}
