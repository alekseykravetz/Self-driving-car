class TargetEditor extends MarkingEditor {
  /**
   * Editor for creating Target markings.
   * Targets lane guide segments.
   */
  constructor(viewport: Viewport, world: World) {
    // Call base constructor, passing lane guides as targets
    super(viewport, world, world.laneGuides);
  }

  /**
   * Creates a new Target marking instance.
   * @param center The center point of the target marking.
   * @param directionVector The orientation vector (along the road).
   * @returns A new Target instance.
   */
  createMarking(center: Point, directionVector: Point): Target {
    return new Target(
      center,
      directionVector,
      this.world.roadWidth / 2, // Width of the target marking
      this.world.roadWidth / 2, // Height/length of the target marking
    );
  }
}
