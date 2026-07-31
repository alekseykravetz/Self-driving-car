import { Point } from '../math/primitives/point.js';
import { Graph } from '../math/graph/graph.js';
import { Marking } from './markings/marking.js';
import type { LightState } from './markings/light.js';
import { Light } from './markings/light.js';
import { getNearestPoint } from '../math/utils.js';

// Type definition for the points used internally
type lightControlCenterPoint = Point & {
  lights: Light[];
  ticks: number;
};

const GREEN_DURATION = 2;
const YELLOW_DURATION = 1;

export class TrafficManager {
  graph: Graph;
  markings: Marking[];
  controlCenters!: lightControlCenterPoint[];
  frameCount: number;

  // Crossroad detection is O(points × segments) and control-center layout only
  // changes when the graph or the set/positions of lights change — never on a
  // plain animation frame. These caches keep `update()` from re-running that
  // scan every frame (was ~76% of frame time on large OSM imports).
  #controlCentersKey: string | null = null;
  #crossroadsCache: Point[] | null = null;
  #crossroadsKey: string | null = null;

  constructor(graph: Graph, markings: Marking[] = []) {
    this.graph = graph; // todo: avoid serializing the graph object during save world as it a part of it already
    this.markings = markings;
    this.frameCount = 0;

    this.#refreshControlCenters(this.graph.hash());
  }

  // Crossroads, an intersection of two or more roads. Finds graph points where more than 2 segments meet
  #getCrossroads(graphHash: string): Point[] {
    // Depends only on graph topology; cache by the graph's change signature.
    if (this.#crossroadsCache && this.#crossroadsKey === graphHash) {
      return this.#crossroadsCache;
    }

    const subset: Point[] = [];
    for (const point of this.graph.points) {
      let degree = 0;
      for (const seg of this.graph.segments) {
        if (seg.includes(point)) {
          degree++;
        }
      }

      if (degree > 2) {
        subset.push(point);
      }
    }

    this.#crossroadsCache = subset;
    this.#crossroadsKey = graphHash;
    return subset;
  }

  /**
   * Cheap signature of everything that affects control-center layout: the graph
   * topology plus the count and positions of Light markings. When unchanged,
   * the cached control centers are reused instead of rebuilt.
   */
  #controlCentersSignature(graphHash: string): string {
    let lightHash = 2166136261;
    let lightCount = 0;
    for (const m of this.markings) {
      if (m instanceof Light) {
        lightCount++;
        lightHash ^= (m.center.x * 1000) | 0;
        lightHash = Math.imul(lightHash, 16777619);
        lightHash ^= (m.center.y * 1000) | 0;
        lightHash = Math.imul(lightHash, 16777619);
      }
    }
    return `${graphHash}|${lightCount}|${lightHash}`;
  }

  /** Rebuilds control centers only when their inputs have changed. */
  #refreshControlCenters(graphHash: string): void {
    const key = this.#controlCentersSignature(graphHash);
    if (key === this.#controlCentersKey && this.controlCenters) return;
    this.#initializeControlCenters(graphHash);
    this.#controlCentersKey = key;
  }

  #initializeControlCenters(graphHash: string): void {
    this.controlCenters = []; // Reset
    // Filter only Light instances from all markings
    const lights = this.markings.filter((m): m is Light => m instanceof Light);
    if (!lights.length) return; // No lights to manage

    const crossroadPoints = this.#getCrossroads(graphHash);
    if (crossroadPoints.length === 0) {
      // Maybe handle lights not at intersections differently or log a warning
      // console.warn("No intersections found to control lights.");
      // For now, we'll just stop if no intersections exist.
      return;
    }

    for (const light of lights) {
      // Ensure getNearestPoint is available and handles potential null result
      const nearestCrossroadPoint = getNearestPoint(
        light.center,
        crossroadPoints,
      );
      if (!nearestCrossroadPoint) {
        console.warn(
          'Could not find a near intersection for a light at:',
          light.center,
        );
        continue; // Skip this light if no intersection is close enough
      }

      let controlCenter = this.controlCenters.find((c) =>
        c.equals(nearestCrossroadPoint),
      );
      if (!controlCenter) {
        // Create a new point object for the control center to avoid modifying graph points
        controlCenter = new Point(
          nearestCrossroadPoint.x,
          nearestCrossroadPoint.y,
        ) as lightControlCenterPoint;
        controlCenter.lights = [light];
        this.controlCenters.push(controlCenter);
      } else {
        controlCenter.lights.push(light);
      }
    }

    // Calculate ticks per full cycle for each control center
    for (const center of this.controlCenters) {
      center.ticks = center.lights.length * (GREEN_DURATION + YELLOW_DURATION);
    }
  }

  overrideLight(light: Light, state: LightState): void {
    light.override(state);
  }

  releaseOverride(light: Light): void {
    light.releaseOverride();
  }

  releaseAllOverrides(): void {
    for (const light of this.markings) {
      if (light instanceof Light && light.overridden) {
        light.releaseOverride();
      }
    }
  }

  // Updates the state of all managed traffic lights based on time/frameCount
  update(graphHash: string = this.graph.hash()): void {
    this.#refreshControlCenters(graphHash); // Rebuilds only when graph/lights changed
    if (!this.controlCenters.length) return; // Nothing to update

    // Determine current state based on frame count (assuming 60 FPS target)
    // Consider using time delta for frame-rate independence if needed
    const tick = Math.floor(this.frameCount / 60);

    for (const center of this.controlCenters) {
      // Ensure ticks is defined and non-zero
      if (!center.ticks || !center.lights.length) continue;

      const currentTickInCycle = tick % center.ticks;
      const cycleSegmentDuration = GREEN_DURATION + YELLOW_DURATION;
      // Determine which light should be green/yellow based on the cycle progress
      const greenYellowIndex = Math.floor(
        currentTickInCycle / cycleSegmentDuration,
      );

      // Determine if the active light is in its green or yellow phase
      const stateWithinSegment = currentTickInCycle % cycleSegmentDuration;
      const currentPhase: 'green' | 'yellow' =
        stateWithinSegment < GREEN_DURATION ? 'green' : 'yellow';

      // Update the state of each light controlled by this center
      // Skip lights that have been manually overridden (paused cycling)
      for (let i = 0; i < center.lights.length; i++) {
        if (center.lights[i].overridden) continue;
        if (i === greenYellowIndex) {
          center.lights[i].state = currentPhase;
        } else {
          center.lights[i].state = 'red';
        }
      }
    }

    // Increment frameCount at the end of the draw/update cycle
    this.frameCount++;
  }
}
