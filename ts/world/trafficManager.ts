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

  constructor(graph: Graph, markings: Marking[] = []) {
    this.graph = graph; // todo: avoid serializing the graph object during save world as it a part of it already
    this.markings = markings;
    this.frameCount = 0;

    this.#initializeControlCenters();
  }

  // Crossroads, an intersection of two or more roads. Finds graph points where more than 2 segments meet
  #getCrossroads(): Point[] {
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
    return subset;
  }

  #initializeControlCenters(): void {
    this.controlCenters = []; // Reset
    // Filter only Light instances from all markings
    const lights = this.markings.filter((m): m is Light => m instanceof Light);
    if (!lights.length) return; // No lights to manage

    const crossroadPoints = this.#getCrossroads();
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
  update(): void {
    this.#initializeControlCenters(); // todo: fix not init lights on each update (problem with markings and graph changes outside)
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
