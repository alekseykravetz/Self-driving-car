/**
 * A reusable held/latched toggle state machine extracted from 4 copies
 * of the same pattern in GraphEditor, CorridorEditor, and TrafficSimulator.
 *
 * A toggle is physically held while the user presses the key, or logically
 * latched on via a toolbar click. The effective `active` state is `held || latched`.
 * An optional onChange callback notifies the consumer whenever the state changes.
 */
export class LatchedToggle {
    #held = false;
    #latched = false;
    #onChange = null;
    get active() {
        return this.#held || this.#latched;
    }
    setOnChange(cb) {
        this.#onChange = cb;
    }
    setPhysicalHold(held) {
        if (this.#held === held)
            return;
        this.#held = held;
        this.#notify();
    }
    toggleLatch() {
        this.#latched = !this.#latched;
        this.#notify();
    }
    reset() {
        this.#held = false;
        this.#latched = false;
        this.#notify();
    }
    #notify() {
        this.#onChange?.(this.active);
    }
}
