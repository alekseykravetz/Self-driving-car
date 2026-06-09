/**
 * A lightweight IWorld implementation for simple straight-road training scenarios.
 * Provides the same interface as World but generates minimal geometry from lane params.
 */
class SimpleWorld implements IWorld {
  graph: Graph;
  cars: Car[] = [];
  bestCar: Car | null = null;
  markings: Marking[] = [];
  roadBorders: Segment[];
  corridor: Corridor | null = null;
  buildings: Building[] = [];
  trees: Tree[] = [];
  zoom?: number;
  offset?: Point;

  private x: number;
  private width: number;
  private laneCount: number;
  private left: number;
  private right: number;
  private top: number;
  private bottom: number;

  constructor(x: number, width: number, laneCount: number = 3) {
    this.x = x;
    this.width = width;
    this.laneCount = laneCount;

    this.left = x - width / 2;
    this.right = x + width / 2;

    const infinity = 1000000;
    this.top = -infinity;
    this.bottom = infinity;

    // Create road border segments (left and right edges)
    const topLeft = new Point(this.left, this.top);
    const bottomLeft = new Point(this.left, this.bottom);
    const topRight = new Point(this.right, this.top);
    const bottomRight = new Point(this.right, this.bottom);

    this.roadBorders = [
      new Segment(topLeft, bottomLeft),
      new Segment(topRight, bottomRight),
    ];

    // Minimal graph: two nodes connected by one segment
    const graphTop = new Point(this.x, this.top);
    const graphBottom = new Point(this.x, this.bottom);
    this.graph = new Graph(
      [graphTop, graphBottom],
      [new Segment(graphTop, graphBottom)],
    );

    // Create a synthetic Start marking at spawn position (lane 1, y=100)
    const startY = 100;
    const startX = this.getLaneCenter(1);
    const startCenter = new Point(startX, startY);
    // Direction (0, 1) produces startAngle=0 via formula: -angle(dir) + π/2
    const startDirection = new Point(0, 1);
    this.markings = [new Start(startCenter, startDirection, this.width, 20)];
  }

  /**
   * Returns the center x-coordinate of a specific lane.
   */
  getLaneCenter(laneIndex: number): number {
    const laneWidth = this.width / this.laneCount;
    const clampedIndex = Math.min(laneIndex, this.laneCount - 1);
    return this.left + laneWidth / 2 + clampedIndex * laneWidth;
  }

  /**
   * Returns the number of lanes.
   */
  getLaneCount(): number {
    return this.laneCount;
  }

  /**
   * Returns the center x-coordinate of the road.
   */
  getCenter(): number {
    return this.x;
  }

  /**
   * No-op: simple straight road doesn't support corridor pathfinding.
   */
  generateCorridor(_start: Point, _end: Point): void {
    // No-op for simple road
  }

  /**
   * Draws the simple road (borders and lane dividers) on a canvas context.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    _viewPoint: Point,
    _showStartMarkings: boolean = true,
  ): void {
    // Draw road surface
    ctx.fillStyle = '#BBB';
    ctx.fillRect(this.left, this.top, this.width, this.bottom - this.top);

    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white';

    // Draw lane dividers (dashed lines)
    for (let i = 1; i < this.laneCount; i++) {
      const laneX = lerp(this.left, this.right, i / this.laneCount);
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(laneX, this.top);
      ctx.lineTo(laneX, this.bottom);
      ctx.stroke();
    }

    // Draw solid road borders
    ctx.setLineDash([]);
    for (const border of this.roadBorders) {
      ctx.beginPath();
      ctx.moveTo(border.p1.x, border.p1.y);
      ctx.lineTo(border.p2.x, border.p2.y);
      ctx.stroke();
    }
  }
}
