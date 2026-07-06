import { MarkingEditor } from './markingEditor.js';
import { Parking } from '../markings/parking.js';
export class ParkingEditor extends MarkingEditor {
    /**
     * Editor for creating Parking markings.
     * Targets lane guide segments.
     */
    constructor(viewport, world) {
        // Call base constructor, passing lane guides as targets
        super(viewport, world, world.laneGuides);
    }
    /**
     * Creates a new Parking marking instance.
     * @param center The center point of the parking spot marking.
     * @param directionVector The orientation vector (usually perpendicular to road direction).
     * @returns A new Parking instance.
     */
    createMarking(center, directionVector) {
        return new Parking(center, directionVector, this.world.roadWidth / 2, // Width of the parking spot
        this.world.roadWidth / 2);
    }
}
