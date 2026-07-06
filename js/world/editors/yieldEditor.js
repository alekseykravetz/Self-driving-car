import { MarkingEditor } from './markingEditor.js';
import { Yield } from '../markings/yield.js';
export class YieldEditor extends MarkingEditor {
    /**
     * Editor for creating Yield markings.
     * Targets lane guide segments.
     */
    constructor(viewport, world) {
        // Call base constructor, passing lane guides as targets
        super(viewport, world, world.laneGuides);
    }
    /**
     * Creates a new Yield marking instance.
     * @param center The center point of the yield marking.
     * @param directionVector The orientation vector (along the road).
     * @returns A new Yield instance.
     */
    createMarking(center, directionVector) {
        return new Yield(center, directionVector, this.world.roadWidth / 2, // Width of the yield marking
        this.world.roadWidth / 2);
    }
}
