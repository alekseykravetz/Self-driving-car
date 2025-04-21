// Type definition for the points used internally
type lightControlCenterPoint = Point & {
  lights: Light[];
  ticks: number;
};

class TrafficManager {
  world: World;
  controlCenters!: lightControlCenterPoint[];
  frameCount: number;

  constructor(world: World) {
    this.world = world;
    this.frameCount = 0;

    this.#initializeControlCenters();
  }

  // Finds points where more than 2 segments meet
  #getIntersections(): Point[] {
    const subset: Point[] = [];
    for (const point of this.world.graph.points) {
      let degree = 0;
      for (const seg of this.world.graph.segments) {
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
    const lights = this.world.markings.filter(
      (m): m is Light => m instanceof Light,
    );
    if (!lights.length) return; // No lights to manage

    const intersections = this.#getIntersections();
    if (intersections.length === 0) {
      // Maybe handle lights not at intersections differently or log a warning
      // console.warn("No intersections found to control lights.");
      // For now, we'll just stop if no intersections exist.
      return;
    }

    for (const light of lights) {
      // Ensure getNearestPoint is available and handles potential null result
      const intersectionPoint = getNearestPoint(light.center, intersections);
      if (!intersectionPoint) {
        console.warn(
          'Could not find a near intersection for a light at:',
          light.center,
        );
        continue; // Skip this light if no intersection is close enough
      }

      let controlCenter = this.controlCenters.find((c) =>
        c.equals(intersectionPoint),
      );
      if (!controlCenter) {
        // Create a new point object for the control center to avoid modifying graph points
        controlCenter = new Point(
          intersectionPoint.x,
          intersectionPoint.y,
        ) as lightControlCenterPoint;
        controlCenter.lights = [light];
        this.controlCenters.push(controlCenter);
      } else {
        controlCenter.lights.push(light);
      }
    }

    // Define light cycle durations (consider making these configurable)
    const greenDuration = 2; // seconds
    const yellowDuration = 1; // seconds

    // Calculate ticks per full cycle for each control center
    for (const center of this.controlCenters) {
      center.ticks = center.lights.length * (greenDuration + yellowDuration);
    }
  }

  // Updates the state of all managed traffic lights based on time/frameCount
  update(): void {
    this.#initializeControlCenters(); // todo: fix not init lights on each update (problem with markings and graph changes outside)
    if (!this.controlCenters.length) return; // Nothing to update

    // Define light cycle durations (same as in initialization)
    const greenDuration = 2; // seconds
    const yellowDuration = 1; // seconds

    // Determine current state based on frame count (assuming 60 FPS target)
    // Consider using time delta for frame-rate independence if needed
    const tick = Math.floor(this.frameCount / 60);

    for (const center of this.controlCenters) {
      // Ensure ticks is defined and non-zero
      if (!center.ticks || !center.lights.length) continue;

      const currentTickInCycle = tick % center.ticks;
      const cycleSegmentDuration = greenDuration + yellowDuration;
      // Determine which light should be green/yellow based on the cycle progress
      const greenYellowIndex = Math.floor(
        currentTickInCycle / cycleSegmentDuration,
      );

      // Determine if the active light is in its green or yellow phase
      const stateWithinSegment = currentTickInCycle % cycleSegmentDuration;
      const currentPhase: 'green' | 'yellow' =
        stateWithinSegment < greenDuration ? 'green' : 'yellow';

      // Update the state of each light controlled by this center
      for (let i = 0; i < center.lights.length; i++) {
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
