class StopEditor extends MarkingEditor {
  /**
   * Editor for creating Stop markings.
   * Targets lane guide segments.
   */
  constructor(viewport: Viewport, world: World) {
    // Call base constructor, passing lane guides as targets
    super(viewport, world, world.laneGuides);
  }

  /**
   * Creates a new Stop marking instance.
   * @param center The center point of the stop line.
   * @param directionVector The orientation vector (along the road).
   * @returns A new Stop instance.
   */
  createMarking(center: Point, directionVector: Point): Stop {
    return new Stop(
      center,
      directionVector,
      this.world.roadWidth / 2, // Width of the stop line
      this.world.roadWidth / 2, // Height/length (often small for stop lines, adjust if needed)
    );
  }
}
