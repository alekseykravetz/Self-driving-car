import { MarkingEditor } from './markingEditor.js';
import { Light } from '../markings/light.js';
const CYCLE_ORDER = ['off', 'green', 'yellow', 'red'];
export class LightEditor extends MarkingEditor {
    #boundLightClick;
    /**
     * Editor for creating Light markings.
     * Targets lane guide segments.
     */
    constructor(viewport, world) {
        // Call base constructor, passing lane guides as targets
        super(viewport, world, world.laneGuides);
        this.#boundLightClick = this.#handleLightClick.bind(this);
    }
    enable() {
        this.canvas.addEventListener('mousedown', this.#boundLightClick);
        super.enable();
    }
    disable() {
        this.canvas.removeEventListener('mousedown', this.#boundLightClick);
        super.disable();
    }
    #handleLightClick(e) {
        if (e.button !== 0 || !this.mouse)
            return;
        const light = this.#findLightAt(this.mouse);
        if (!light)
            return;
        e.stopImmediatePropagation();
        this.#cycleLight(light);
    }
    #findLightAt(point) {
        for (const marking of this.markings) {
            if (marking instanceof Light && marking.polygon.containsPoint(point)) {
                return marking;
            }
        }
        return null;
    }
    #cycleLight(light) {
        const currentIndex = CYCLE_ORDER.indexOf(light.state);
        const nextState = CYCLE_ORDER[(currentIndex + 1) % CYCLE_ORDER.length];
        this.world.trafficManager.overrideLight(light, nextState);
    }
    /**
     * Creates a new Light marking instance.
     * @param center The center point of the light.
     * @param directionVector The orientation vector (along the road).
     * @returns A new Light instance.
     */
    createMarking(center, directionVector) {
        return new Light(center, directionVector, this.world.roadWidth / 2);
    }
}
