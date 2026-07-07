import { MarkingEditor } from './markingEditor.js';
import { Light } from '../markings/light.js';
/** Override states cycled on left-click. After 'red', the light releases back to regular cycling. */
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
        if (!light.overridden) {
            // First click on a non-overridden light: pause automatic cycling at 'off'
            this.world.trafficManager.overrideLight(light, 'off');
            return;
        }
        const currentIndex = CYCLE_ORDER.indexOf(light.state);
        if (currentIndex === CYCLE_ORDER.length - 1) {
            // Last state ('red') → release back to regular automatic cycling
            this.world.trafficManager.releaseOverride(light);
        }
        else {
            const nextState = CYCLE_ORDER[(currentIndex + 1) % CYCLE_ORDER.length];
            this.world.trafficManager.overrideLight(light, nextState);
        }
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
