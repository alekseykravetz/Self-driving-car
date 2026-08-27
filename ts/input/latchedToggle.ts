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
  #onChange: ((active: boolean) => void) | null = null;

  get active(): boolean {
    return this.#held || this.#latched;
  }

  setOnChange(cb: (active: boolean) => void): void {
    this.#onChange = cb;
  }

  setPhysicalHold(held: boolean): void {
    if (this.#held === held) return;
    this.#held = held;
    this.#notify();
  }

  toggleLatch(): void {
    this.#latched = !this.#latched;
    this.#notify();
  }

  reset(): void {
    this.#held = false;
    this.#latched = false;
    this.#notify();
  }

  #notify(): void {
    this.#onChange?.(this.active);
  }
}
